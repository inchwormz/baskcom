const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const products=JSON.parse(fs.readFileSync(path.join(__dirname,'../products.json'),'utf8'));
const byId=new Map(products.map(p=>[p.id,p]));
function validateCart(items){
  if(!Array.isArray(items)||!items.length||items.length>52)throw Error('Choose at least one object for your cart.');
  const seen=new Set();let quantity=0;
  return items.map(item=>{if(!item||typeof item.id!=='string'||!byId.has(item.id)||seen.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)throw Error('Please check the objects and quantities in your cart.');seen.add(item.id);quantity+=item.quantity;if(quantity>100)throw Error('For larger orders, please contact Bask.');return {...byId.get(item.id),quantity:item.quantity};});
}
function deliveryOptions(){
  const modes=[];
  if(process.env.BASK_PICKUP_ENABLED==='true')modes.push({id:'pickup',label:'Auckland pickup',amount:0});
  if(/^\d+$/.test(process.env.BASK_DELIVERY_CENTS||'')){const amount=Number(process.env.BASK_DELIVERY_CENTS);if(Number.isSafeInteger(amount)&&amount<=100000)modes.push({id:'delivery',label:'New Zealand delivery',amount});}
  return modes;
}
function stripeConfigured(){const key=process.env.STRIPE_SECRET_KEY;return process.env.BASK_CHECKOUT_ENABLED==='true'&&Boolean(key)&&(process.env.VERCEL_ENV!=='production'||/^(sk|rk)_live_/.test(key));}
function originFor(req){
  const origin=process.env.BASK_SITE_URL||(process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'https://baskobjects.co.nz');
  const parsed=new URL(origin);if(parsed.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&parsed.hostname==='127.0.0.1'))throw Error('Invalid site configuration');
  const allowedOrigins=new Set([parsed.origin]);if(parsed.origin==='https://baskobjects.co.nz')allowedOrigins.add('https://www.baskobjects.co.nz');
  if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))throw Error('Please start checkout from the Bask website.');
  return parsed.origin;
}
async function stripeRequest(route,options={}){
  const response=await fetch('https://api.stripe.com/v1/'+route,{...options,headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,...options.headers},signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw Error('Payment is unavailable right now. Please try again or contact Bask.');return data;
}
function checkoutParams(cart,delivery,origin){
  const params=new URLSearchParams({mode:'payment','payment_method_types[0]':'card',success_url:origin+'/checkout/success/?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/checkout/?cancelled=1','billing_address_collection':'required','phone_number_collection[enabled]':'true','metadata[store]':'bask','metadata[fulfilment]':delivery.id,'payment_intent_data[metadata][store]':'bask','payment_intent_data[metadata][fulfilment]':delivery.id});
  cart.forEach((product,i)=>{const prefix=`line_items[${i}]`;params.set(prefix+'[price_data][currency]','nzd');params.set(prefix+'[price_data][unit_amount]',String(product.amount));params.set(prefix+'[price_data][product_data][name]',product.name);params.set(prefix+'[price_data][product_data][metadata][bask_product_id]',product.id);params.set(prefix+'[quantity]',String(product.quantity));});
  if(delivery.id==='delivery')params.set('shipping_address_collection[allowed_countries][0]','NZ');
  params.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(delivery.amount));params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','nzd');params.set('shipping_options[0][shipping_rate_data][display_name]',delivery.label);
  if(delivery.id==='pickup')for(const key of [...params.keys()])if(key.startsWith('shipping_options['))params.delete(key);
  params.set('custom_text[submit][message]',delivery.id==='pickup'?'Bask will contact you to arrange Auckland pickup.':'Delivery within New Zealand.');
  return params;
}
function send(res,status,value){res.setHeader('Cache-Control','no-store');return res.status(status).json(value);}
async function checkout(req,res){
  if(req.method==='GET'){const modes=deliveryOptions();return send(res,200,{ready:Boolean(stripeConfigured()&&modes.length),modes,currency:'NZD'});}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed'});}
  let cart,origin,body;
  try{if(!req.headers['content-type']?.startsWith('application/json'))throw Error('Please check your cart.');body=typeof req.body==='string'?JSON.parse(req.body):req.body;cart=validateCart(body?.items);origin=originFor(req);if(!/^[a-zA-Z0-9-]{16,80}$/.test(body.attemptId||''))throw Error('Please reload checkout and try again.');}catch(error){return send(res,400,{error:error.message});}
  const delivery=deliveryOptions().find(option=>option.id===body.fulfilment);
  if(!stripeConfigured()||!delivery)return send(res,503,{error:'Online checkout is opening soon. Your cart is saved. Please contact Bask to order.'});
  try{const params=checkoutParams(cart,delivery,origin),fingerprint=crypto.createHash('sha256').update(params.toString()).digest('hex');const session=await stripeRequest('checkout/sessions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':body.attemptId+'-'+fingerprint},body:params});if(!session.url?.startsWith('https://checkout.stripe.com/'))throw Error('Payment is unavailable right now.');return send(res,200,{url:session.url,sessionId:session.id});}catch(error){return send(res,502,{error:'Payment is unavailable right now. Please try again or contact Bask.'});}
}
async function confirmation(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed'});}
  const id=req.query.session_id;if(typeof id!=='string'||!/^cs_(test|live)_[A-Za-z0-9_]{10,200}$/.test(id))return send(res,400,{error:'We couldn’t find this payment. Please contact Bask if you need help.'});
  if(!stripeConfigured())return send(res,503,{error:'We couldn’t check this payment. Please contact Bask if you need help.'});
  try{const session=await stripeRequest('checkout/sessions/'+encodeURIComponent(id));if(session.metadata?.store!=='bask'||session.payment_status!=='paid'||session.currency!=='nzd'||session.mode!=='payment'||(process.env.VERCEL_ENV==='production'&&!session.livemode))return send(res,409,{error:'Payment has not been confirmed. Your cart is saved.'});return send(res,200,{paid:true,amount:session.amount_total,currency:'NZD',reference:session.id.slice(-12).toUpperCase(),fulfilment:session.metadata.fulfilment});}catch{return send(res,502,{error:'We couldn’t check this payment. Please contact Bask if you need help.'});}
}
module.exports={validateCart,deliveryOptions,checkoutParams,checkout,confirmation};

# Baskcom Static Site

Static full-site export generated from the Proferlo to Oakame rebind run.

Source run:

`C:\Users\OEM\Projects\clone-rebind-runs\2026-04-30T22-45-03-420Z-oakame-com-en-to-proferlo-co-nz-34676`

Routes:

- `/`
- `/products/`
- `/lookbook/`
- `/about-us/`
- `/contact/`

Deployment alias:

`baskcom.sitesorted.co.nz`

`live-site/` contains the rebranded five-page Bask Objects site. Its layout and motion follow the Oakâme reference captured on 9 October 2026, using Bask content and imagery. The static publishing root is `live-site`; the older export above remains at the repository root.

With Playwright available, run `node scripts/verify-bask-fidelity.cjs` against a local preview. Set `BASK_PREVIEW_URL` to check another preview and `BASK_QA_OUTPUT` to choose the screenshot destination.

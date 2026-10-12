# Bask duplicate cart labels

Request SIT-387: “take away the add to cart text and icon on each product. as its already within the hover effect version - it doesn't ened to shown twice”. Base production 87eb790. Website candidate e5c20cf3c3f329ab878145211695afa5fea84a5c.

| Finding | Status | Evidence |
| --- | --- | --- |
| Add to cart appears both in resting metadata and hover panel | FIXED e5c20cf + browser check; VERIFIED | Removed 6 homepage and 52 catalogue resting spans/icons. All hover Add to cart labels and card controls retained. Hosted DOM checks and native 2x screenshots pass. |
| Removed phone action could leave an empty category strip | FIXED e5c20cf + browser check; VERIFIED | Phone catalogue row hidden, matching previously hidden category. Desktop category remains. No horizontal overflow at 1440/390; hover caption fit checked on all desktop cards. |
| Label cleanup could disable the shopping action | VERIFIED | First card on each page type at desktop/mobile adds one item; header cart count updates. Names/prices/IDs unchanged in scoped source diff. |

Focused `bask-label-qa.cjs`: exit 0 on exact hosted preview dpl_67vetCiVMzrbcsTyN1abEnHdxGZv (READY, e5c20cf). PASS four page/width states, full 58-card markup coverage, sampled click/hover behavior, caption fit and native 2x screenshots. `git diff --check`: exit 0. Scope limited to two product-page HTML files and redundant/empty-row CSS. Chromium desktop/simulated touch; no real-device claim. Production verification follows GitHub merge.

# Bask release review — PR 1

Reference: Oakame English website captured 2026-10-09. Candidate runtime: bc3a5c2d022a2f44a252e41fd6112e2cb7ff5c63, publishing root `live-site`.

Independent Sol code and visual reviews were completed before publication. The review receipts remain in the local `.omx/state/bask-fidelity` directory; no customer or authentication data is included here.

| Finding | Status | Fix and verification |
| --- | --- | --- |
| Collection navigation retained stale filter state | VERIFIED | FIXED bc3a5c2; browser regressions verify Coffee → Bedside → Coffee and collection hashes. |
| Filters became inaccessible after widening a mobile viewport | VERIFIED | FIXED 3d6d2b5; browser regressions verify 390 → 1280 and wide touch access. |
| Escape stole focus from catalogue search | VERIFIED | FIXED 3d6d2b5; browser regressions verify search retains focus when no menu is open. |
| Catalogue rhythm and mobile section alignment differed from the reference | VERIFIED | FIXED 3d6d2b5; independent rendered review and browser geometry checks at 1440, 1280 and 390 pixels. |

Intentional adaptations: Bask branding, existing photographs, longer product names, email enquiry contact flow, and cream gutters around portrait catalogue images. Qualitative visual review passed; this does not claim identical pixels or motion on every device.

Publication authorized by John on 2026-10-10: “If it’s not please deploy the fixes”. Deployment uses the dedicated `baskobjects` project, linked to `inchwormz/baskcom` main. The older Proferlo project retains its demo domain.

# Bask navigation and hover restoration — PR 3

Request: SIT-382. Base: main 431d3ae. Reviewed website source: 5080844, live-site tree 2de68ac46489ee555e0d8c3601d775add6858fa4. Hover reference: prior production e298aae and its immutable deployed hover state, captured 2026-10-12. Review scoped to the navigation and card restoration diff.

| Finding | Status | Mechanism and verification |
| --- | --- | --- |
| Primary navigation contains redundant Services/About, email and grid shortcuts | VERIFIED | All five headers now retain Collections, Living room, Bedroom, Contact and NZ. Exact link/removed-control checks pass at 1440, 1280, 390 and 320px. Mobile room links and Contact retained; selection closes the menu and unlocks the page. |
| Catalogue refactor removed the original framed hover reveal | FIXED 5080844 + test; VERIFIED | All 6 homepage and 52 catalogue cards have category bar, corner markers, framed caption and image pull-back. Source timing restored: 600ms reveal, 100/150ms stagger, one-second image pull-back. Intermediate/end/mouse-leave/focus states pass. Native 2x screenshots inspected against previous deployment. |
| Restoring hover could clip captions or move text on touch devices | VERIFIED | Desktop caption fit checked across all cards; phone panels disabled and complete resting captions retained. Touch title transform is none; reduced motion transition is zero. |
| Verification incorrectly expects 11 bedroom items | FIXED test correction + hosted test; VERIFIED | Catalogue has 7 bedside tables, 4 dressing tables and 1 wardrobe. Independent hosted probe confirms 12 bedroom objects and correct active navigation. Test expectation corrected to 12; website source unchanged. |

Hosted preview dpl_A5Q9M6QDNTnMJdPLkxskmQmy7Q41 is READY at exact website commit 5080844760212216daca12567d44b97db64724c6. `node scripts/verify-bask-nav-hover.cjs`: exit 0, PASS, 28 route/width and hover states, zero browser errors. `git diff --check`: exit 0. Evidence: bask-nav-hover/hosted-corrected/nav-hover-verification.json and native 2x images.

Scope: Chromium desktop and simulated touch at four widths. Hover panels are present on all 58 cards; animated interactions sampled on the first card of both page types. No physical phone, Safari or Firefox verification is claimed. No enquiry email sent. Production verification follows GitHub merge.

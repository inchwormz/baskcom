# Bask menu and continuous hero cycling

Request SIT-385. Base production 44a6d30; website fix d78c511070996d1cf32f9056bdb1deb89c8a2727. John: “whats happening here?”, “the hero is also not cycling between the iamges as wlel.” and “there shouldn't be a pause animation and ui, why did you do that. just cycle them.”

| Finding | Status | Mechanism and evidence |
| --- | --- | --- |
| Closed mobile menu leaks over the page at 1024–1100px | FIXED d78c511 + test; VERIFIED | Panel display was enabled at 1100px but opaque/hidden/absolute styling existed only below 1024px. Complete panel styles now share the 1100px cutoff. Public baseline test exit 1 at 1024px: static, opacity 1, visibility visible, transparent, inert. Local and hosted regression exit 0 at eight widths, including exact 1099px reported width. |
| Hero stops rotating under pointer or after thumbnail selection | FIXED d78c511 + test; VERIFIED | Removed hover/focus pause state/listeners. Timer continues while visible, including after selecting a thumbnail. Multiple automatic advances and post-selection advance pass on local and hosted source. Only background/offscreen suspend timers; reduced motion skips transitions. |
| Added pause/arrow toolbar is unwanted | FIXED d78c511 + test; VERIFIED | Removed markup, listeners and associated styles. Original thumbnails/swipe/keyboard remain. Hosted assertion checks zero toolbar/pause elements; native 2x hero screenshot inspected. |
| Two slides report active during transition | FIXED d78c511 + test; VERIFIED | Outgoing slide becomes inactive/inert as incoming starts, preventing ambiguous active state. Automatic cycle assertions pass. |

`node scripts/verify-bask-menu-autoplay.cjs`: exit 0 locally and on exact hosted preview dpl_5B7DbVS65ibUHWFaiuzxsvRD2wv8 (READY, d78c511). Menu widths 320, 390, 1023, 1024, 1099, 1100, 1101 and 1440. Open/close/Escape/room selection/background unlock, cart visibility and no horizontal overflow pass. Three automatic image advances checked with pointer over hero and after thumbnail click. `node --check live-site/motion.js` and `git diff --check` exit 0.

Scope: focused Chromium browser verification and native 2x viewports; no physical device/Safari/Firefox claim. Current corrected screenshots captured with actual scroll offset. Source review covers only changed CSS, carousel state/listeners and UI removal. Shopping/payments/product hover code is unchanged. Production verification follows GitHub merge.

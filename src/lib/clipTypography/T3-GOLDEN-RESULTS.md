# T3 golden-frame comparison results

**105/105 canonical cases pass.** Actual Chrome preview component captures are compared with actual FFmpeg/libass frames.

Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36

Renderer: ffmpeg version 5.1.9-0+deb12u1 Copyright (c) 2000-2026 the FFmpeg developers

Engineering acceptance: every foreground bounding-box edge differs by at most 2px, and no more than 2% of foreground pixels lack a counterpart within a 2px neighbourhood, measured in both directions. Foreground threshold: red-channel distance >16 from the #202020 background. These are explicit test tolerances, not a claim of pixel identity or user-approved visual acceptance.

Fifteen exact static faces × seven fixtures: short title, multiline, long wrapped caption, bold/display text, stroke/shadow, mixed Latin/symbols, and nonzero letter spacing. Left/center/right placement and line-height baselines are explicit. Ω is included for all twelve faces that contain it; unsupported Poppins/Caveat Ω requests must fail, never substitute.

Kerning is explicit: on at zero spacing, off at nonzero spacing to match libass. Initial trials failed 23 cases; explicit ASS kerning reduced that to eight letter-spacing cases. Current source and final measurements are retained separately from historical failures.

Legacy exports: 7/7 pixel-identical against committed master. Separate unit coverage checks 64 aspect/semantic/font combinations byte-for-byte.

| Fixture | Edge delta px | Unmatched foreground | Result | Browser | FFmpeg |
|---|---:|---:|---|---|---|
| bebas-neue-400-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-short-title.png) |
| bebas-neue-400-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-multiline.png) |
| bebas-neue-400-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-long-wrap.png) |
| bebas-neue-400-normal-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-bold-display.png) |
| bebas-neue-400-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-stroke-shadow.png) |
| bebas-neue-400-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-mixed-symbols.png) |
| bebas-neue-400-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/bebas-neue-400-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/bebas-neue-400-normal-letter-spacing.png) |
| anton-400-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-short-title.png) |
| anton-400-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-multiline.png) |
| anton-400-normal-long-wrap | 1 | 0.0078% | pass | [PNG](./T3-golden-evidence/anton-400-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-long-wrap.png) |
| anton-400-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-bold-display.png) |
| anton-400-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-stroke-shadow.png) |
| anton-400-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-mixed-symbols.png) |
| anton-400-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/anton-400-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/anton-400-normal-letter-spacing.png) |
| archivo-black-400-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-short-title.png) |
| archivo-black-400-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-multiline.png) |
| archivo-black-400-normal-long-wrap | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-long-wrap.png) |
| archivo-black-400-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-bold-display.png) |
| archivo-black-400-normal-stroke-shadow | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-stroke-shadow.png) |
| archivo-black-400-normal-mixed-symbols | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-mixed-symbols.png) |
| archivo-black-400-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/archivo-black-400-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/archivo-black-400-normal-letter-spacing.png) |
| montserrat-800-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-short-title.png) |
| montserrat-800-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-multiline.png) |
| montserrat-800-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-long-wrap.png) |
| montserrat-800-normal-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-bold-display.png) |
| montserrat-800-normal-stroke-shadow | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-stroke-shadow.png) |
| montserrat-800-normal-mixed-symbols | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-mixed-symbols.png) |
| montserrat-800-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-800-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/montserrat-800-normal-letter-spacing.png) |
| montserrat-900-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-short-title.png) |
| montserrat-900-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-multiline.png) |
| montserrat-900-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-long-wrap.png) |
| montserrat-900-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-bold-display.png) |
| montserrat-900-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-stroke-shadow.png) |
| montserrat-900-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-mixed-symbols.png) |
| montserrat-900-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/montserrat-900-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/montserrat-900-normal-letter-spacing.png) |
| poppins-700-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-short-title.png) |
| poppins-700-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-multiline.png) |
| poppins-700-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-long-wrap.png) |
| poppins-700-normal-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-bold-display.png) |
| poppins-700-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-stroke-shadow.png) |
| poppins-700-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-mixed-symbols.png) |
| poppins-700-normal-letter-spacing | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/poppins-700-normal-letter-spacing.png) |
| poppins-900-normal-short-title | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-short-title.png) |
| poppins-900-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-multiline.png) |
| poppins-900-normal-long-wrap | 1 | 0.0178% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-long-wrap.png) |
| poppins-900-normal-bold-display | 2 | 0.0715% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-bold-display.png) |
| poppins-900-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-stroke-shadow.png) |
| poppins-900-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-mixed-symbols.png) |
| poppins-900-normal-letter-spacing | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/poppins-900-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/poppins-900-normal-letter-spacing.png) |
| inter-700-normal-short-title | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-short-title.png) |
| inter-700-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-multiline.png) |
| inter-700-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-long-wrap.png) |
| inter-700-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-bold-display.png) |
| inter-700-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-stroke-shadow.png) |
| inter-700-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-mixed-symbols.png) |
| inter-700-normal-letter-spacing | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/inter-700-normal-letter-spacing.png) |
| inter-900-normal-short-title | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-short-title.png) |
| inter-900-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-multiline.png) |
| inter-900-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-long-wrap.png) |
| inter-900-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-bold-display.png) |
| inter-900-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-stroke-shadow.png) |
| inter-900-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-mixed-symbols.png) |
| inter-900-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/inter-900-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/inter-900-normal-letter-spacing.png) |
| playfair-display-700-normal-short-title | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-short-title.png) |
| playfair-display-700-normal-multiline | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-multiline.png) |
| playfair-display-700-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-long-wrap.png) |
| playfair-display-700-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-bold-display.png) |
| playfair-display-700-normal-stroke-shadow | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-stroke-shadow.png) |
| playfair-display-700-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-mixed-symbols.png) |
| playfair-display-700-normal-letter-spacing | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/playfair-display-700-normal-letter-spacing.png) |
| playfair-display-400-italic-short-title | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-short-title-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-short-title.png) |
| playfair-display-400-italic-multiline | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-multiline-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-multiline.png) |
| playfair-display-400-italic-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-long-wrap-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-long-wrap.png) |
| playfair-display-400-italic-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-bold-display-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-bold-display.png) |
| playfair-display-400-italic-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-stroke-shadow.png) |
| playfair-display-400-italic-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-mixed-symbols.png) |
| playfair-display-400-italic-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/playfair-display-400-italic-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/playfair-display-400-italic-letter-spacing.png) |
| plus-jakarta-sans-700-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-short-title.png) |
| plus-jakarta-sans-700-normal-multiline | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-multiline.png) |
| plus-jakarta-sans-700-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-long-wrap.png) |
| plus-jakarta-sans-700-normal-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-bold-display.png) |
| plus-jakarta-sans-700-normal-stroke-shadow | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-stroke-shadow.png) |
| plus-jakarta-sans-700-normal-mixed-symbols | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-mixed-symbols.png) |
| plus-jakarta-sans-700-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-700-normal-letter-spacing.png) |
| plus-jakarta-sans-800-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-short-title.png) |
| plus-jakarta-sans-800-normal-multiline | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-multiline.png) |
| plus-jakarta-sans-800-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-long-wrap.png) |
| plus-jakarta-sans-800-normal-bold-display | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-bold-display.png) |
| plus-jakarta-sans-800-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-stroke-shadow.png) |
| plus-jakarta-sans-800-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-mixed-symbols.png) |
| plus-jakarta-sans-800-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/plus-jakarta-sans-800-normal-letter-spacing.png) |
| caveat-700-normal-short-title | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-short-title.png) |
| caveat-700-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-multiline.png) |
| caveat-700-normal-long-wrap | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-long-wrap.png) |
| caveat-700-normal-bold-display | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-bold-display.png) |
| caveat-700-normal-stroke-shadow | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-stroke-shadow.png) |
| caveat-700-normal-mixed-symbols | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-mixed-symbols.png) |
| caveat-700-normal-letter-spacing | 0 | 0.0000% | pass | [PNG](./T3-golden-evidence/caveat-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/caveat-700-normal-letter-spacing.png) |
| jetbrains-mono-700-normal-short-title | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-short-title-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-short-title.png) |
| jetbrains-mono-700-normal-multiline | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-multiline-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-multiline.png) |
| jetbrains-mono-700-normal-long-wrap | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-long-wrap-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-long-wrap.png) |
| jetbrains-mono-700-normal-bold-display | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-bold-display-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-bold-display.png) |
| jetbrains-mono-700-normal-stroke-shadow | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-stroke-shadow-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-stroke-shadow.png) |
| jetbrains-mono-700-normal-mixed-symbols | 2 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-mixed-symbols-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-mixed-symbols.png) |
| jetbrains-mono-700-normal-letter-spacing | 1 | 0.0000% | pass | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-letter-spacing-browser.png) | [PNG](./T3-golden-evidence/jetbrains-mono-700-normal-letter-spacing.png) |

Coverage does not certify languages, bidi, emoji or complex-script shaping. Only Chromium 155 and the recorded local worker runtime were visually verified. V1 supports hard, unblurred outline/shadow; other rasterizers, blur effects and production deployment require separate verification.

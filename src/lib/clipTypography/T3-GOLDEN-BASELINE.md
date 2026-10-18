# T3 raster baseline and metric experiment

**T3 is incomplete. Production activation is not recommended.**

Real Chrome browser Canvas captures are compared with actual FFmpeg/libass frames. This single-line experiment does not exercise the ClipEditor DOM overlay or certify wrapping, effects, animations, shaping, or full project reopening.

The original baseline is nominal 42px on both engines. The experiment converts ASS size to CSS em using `ASS size = CSS pixels × (usWinAscent + usWinDescent) / unitsPerEm` and places the baseline explicitly. Browser baseline is 400px; ASS top is `400 − CSS pixels × usWinAscent / unitsPerEm`. No production renderer is changed.

The diagnostic tolerance is proposed: each ink-box edge, width and height must differ by at most 2px, thresholding foreground at red-channel distance >16 from each image background. It is not a user-approved overall visual tolerance. Different anti-aliasing is not scored; this is not a per-pixel similarity test.

Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36

Renderer: ffmpeg version 5.1.9-0+deb12u1 Copyright (c) 2000-2026 the FFmpeg developers. Fresh baseline frames identical to T2-B2: 15/15.

| Face | Baseline browser/ASS width | Corrected browser/ASS width | Corrected max edge delta | Diagnostic pass | Ω browser/renderer |
|---|---:|---:|---:|---|---|
| bebas-neue-400-normal | 224/172 | 224/224 | 1 | pass | no/yes |
| anton-400-normal | 268/156 | 268/270 | 1 | pass | no/yes |
| archivo-black-400-normal | 373/278 | 373/375 | 1 | pass | no/yes |
| montserrat-800-normal | 365/235 | 365/367 | 1 | pass | no/yes |
| montserrat-900-normal | 373/240 | 373/375 | 1 | pass | no/yes |
| poppins-700-normal | 344/196 | 344/344 | 0 | pass | no/no |
| poppins-900-normal | 355/201 | 355/354 | 1 | pass | no/no |
| inter-700-normal | 336/236 | 336/337 | 1 | pass | yes/yes |
| inter-900-normal | 347/244 | 347/348 | 1 | pass | yes/yes |
| playfair-display-700-normal | 314/224 | 314/315 | 1 | pass | no/yes |
| playfair-display-400-italic | 302/214 | 302/302 | 0 | pass | no/yes |
| plus-jakarta-sans-700-normal | 331/201 | 331/331 | 0 | pass | no/yes |
| plus-jakarta-sans-800-normal | 337/204 | 337/337 | 0 | pass | no/yes |
| caveat-700-normal | 244/187 | 244/242 | 2 | pass | no/no |
| jetbrains-mono-700-normal | 375/283 | 375/373 | 1 | pass | yes/yes |

Ω remains unavailable in nine browser faces despite renderer coverage; Poppins 700/900 and Caveat lack it in both. Only Inter 700/900 and JetBrains Mono load Ω in the current browser package. Unsupported canonical text fails explicitly; no silent substitute is certified.

Outstanding golden cases: production DOM short title; multiline; long wrapping; bold display; stroke/shadow; mixed Latin/symbol; saved-project browser reopening. Existing T2-B2 multiline frames remain useful evidence of differences, not passing goldens. Browser and renderer source releases are independently versioned.

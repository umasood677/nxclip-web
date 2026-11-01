# Functional advanced Template Canvas — 2026-11-01

## Correction to the previous delivery
The earlier commit provided a restyled legacy inspector. It did not deliver the prototype's directly accessible semantic controls. This change adds those controls and a readable layer list, rather than claiming CSS alone establishes parity.

## Implemented
- Template-only open inspector with Product placement, Typography, Logo / brand text and selected-layer controls. The owner does not need to select a text layer before editing headline or CTA.
- Image target selection, horizontal/vertical percentages, aspect-preserving center-based scale and safe-area centering. Raster product artwork is identified as a whole image; hidden original photographs are never silently shown or misrepresented as isolated products.
- Headline and CTA editing, allowed font selection, heading size/alignment/color; brand signature editing and logo coordinates. These modify actual AdSceneGraph layers.
- Approved ready Brand Kit asset replacement for the selected image/logo. Unapproved IDs are not offered or accepted by the control; server ownership/asset checks remain authoritative. Private storage keys are not copied from a selected asset.
- Full readable layer names, selected-layer visibility/lock/order/duplicate/delete controls, and a collapsed hidden-source group. Preview mode disables edit actions. The ordinary campaign Stack list is preserved.
- Capture version uses existing explicit Canvas persistence/version history; Save draft and return-to-review remain separate from campaign creation. No new persistence or editor.
- Slider gestures reuse liveMove/liveResize/commitTransform, producing one undo entry per completed pointer/keyboard gesture. Existing undo/redo, renderer, save/reopen, export and history remain.
- Prototype-style open three-column layout, larger center stage, page-level scrolling and sticky stage; existing mobile tabs expose the same controls. No approved prototype files edited.

## Honest capability boundaries
The prototype uses illustrative independent product shapes. A real product embedded in an AI raster is not independently movable. Artwork controls transform the entire image; hidden original source photographs are separate selectable layers. This change does not segment or regenerate artwork. Canvas color is behind artwork; it does not simulate photographic relighting. Raster deconstruction, Canvas-driven multi-concept AI regeneration, mask review and AI quality/animation workflow completion are not claimed here. There are no fake active buttons for those prototype-only operations.

## Verification
Synthetic tests exercise actual component callbacks for placement/text/replacement; unauthorized replacement is rejected. Tests cover visible-artwork selection, original source preservation, scaling/centering, locks, one-gesture undo/redo, preview protection, full layer labels and unchanged Stack presentation, plus existing project and scene-authority regressions. Exact results and strict diagnostic/prototype comparisons are recorded in the completion report and local .tmp/advanced-canvas-* evidence.

Read-only Vite module checks returned HTTP200 for the updated editor. Live Chrome window accessibility capture failed; no browser screenshot, human UX acceptance or live save/export is claimed. No user data, private images or credentials were extracted. No backend changes, API mutations by the agent, paid calls, feature flags, migrations or restarts.

## Owner review
Save any current edits, then refresh the SAME Canvas URL. The right side should begin with Product placement and expose Headline/CTA controls below. The left side should show readable layer buttons rather than tall Stack cards. Move a visible independent image, undo/redo, edit text and logo position, capture/save a version, reopen and export. For AI artwork, confirm the whole-image warning and that hidden source layers remain hidden until explicitly shown. Return to the single template review page; no campaign/ad should be created by these edits.

This correction is frontend-only and needs no Content/AI restart. Unrelated prior backend activation requirements remain separate. Existing unrelated dirty files/backups were left intact.

Final checks: 46 targeted tests passed; scoped ESLint passed; strict TypeScript retains 38 exact baseline diagnostics with zero additions; all 34 approved prototype blob hashes remain unchanged. Detailed styling is preserved under Advanced layer styling.

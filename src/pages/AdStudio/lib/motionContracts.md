# Motion graph contracts (Phase 4B-B audit)

Canonical source: content-service `ad-motion-scene-graph.ts` + contracts `AdMotionSceneGraphDto`.

**Phase 4C-A:** Deterministic evaluation and frame-time formula live in backend
`@nxclip/contracts` (`ad-motion-evaluate.ts`). Keep this file’s `motionEvaluate.ts`
algorithmically identical (default easing `easeOut`, inactive → opacity 0).

## Schema

- `schemaVersion: "2.0"`, `kind: "animated"`
- Canvas: `width`, `height`, `backgroundColor?`, `fps` ∈ {24,25,30}, `durationMs` ∈ [6000,30000]
- Layer timing: `startMs`, `endMs` (absolute on composition)
- Animations: `{ property, keyframes: [{ timeMs, value }], easing? }`
- Keyframe `timeMs` is **relative to layer `startMs`**, must be in `[0, endMs - startMs]`
- Max 20 animations / layer, 40 keyframes / animation

## Animatable properties (exact ids)

`opacity` | `x` | `y` | `scaleX` | `scaleY` | `rotation` | `visibility`

UI “Scale” edits **linked** `scaleX` + `scaleY` (same times/values). No invented `scale` property.

## Easing (exact ids)

`linear` | `easeIn` | `easeOut` | `easeInOut`  
Default when omitted: `easeOut` (backend).

## Validation highlights

- Finite numbers only
- Opacity ∈ [0, 1]; visibility ∈ {0, 1}
- Keyframes must stay sorted by `timeMs`
- Duplicate times: frontend coalesces by keeping the **incoming (moved/edited) value** at that time

## Presets

Eight Phase 4A ids via `GET /ad-studio/motion-presets` + `POST .../apply-preset`.  
Apply replaces layer animation tracks with editable keyframes (not CSS).

## 4B-B scope

Local graph mutation + undo/redo. Persistence / interpolated canvas = 4B-C.

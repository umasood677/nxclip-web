import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOverlayActiveAtKeepMs,
  resolveVoiceOverlayEndMs,
  VOICE_OVERLAY_END_SLACK_MS,
  voiceOverlayStartOffsetSec,
} from "./voiceOverlayTiming";

describe("voiceOverlayTiming (commentary truncation P0)", () => {
  it("extends voice end when decoded duration exceeds short EDL endMs", () => {
    const end = resolveVoiceOverlayEndMs({
      id: "v1",
      type: "voice",
      startMs: 1000,
      endMs: 2500, // under-reported
      mediaDurationSec: 3.2, // full TTS
    });
    assert.equal(end, 1000 + 3200 + VOICE_OVERLAY_END_SLACK_MS);
    assert.ok(end > 2500);
  });

  it("keeps EDL end when it already covers the media", () => {
    const end = resolveVoiceOverlayEndMs({
      id: "v1",
      type: "voice",
      startMs: 0,
      endMs: 5000,
      mediaDurationSec: 2.0,
    });
    assert.equal(end, 5000);
  });

  it("does not extend foley by media duration", () => {
    const end = resolveVoiceOverlayEndMs({
      id: "f1",
      type: "foley",
      startMs: 100,
      endMs: 400,
      mediaDurationSec: 5,
    });
    assert.equal(end, 400);
  });

  it("stays active through the media tail past short EDL end", () => {
    const clip = {
      id: "v1",
      type: "voice" as const,
      startMs: 0,
      endMs: 1000,
      mediaDurationSec: 2.5,
    };
    assert.equal(isOverlayActiveAtKeepMs(clip, 900), true);
    assert.equal(isOverlayActiveAtKeepMs(clip, 1500), true); // past EDL, still in media
    assert.equal(isOverlayActiveAtKeepMs(clip, 2800), false);
  });
});

it('P0.2 first normal-playback start preserves the first word; explicit seek retains offset',()=>{assert.equal(voiceOverlayStartOffsetSec(1000,1060,true),0);assert.equal(voiceOverlayStartOffsetSec(1000,1800,true),.8);assert.equal(voiceOverlayStartOffsetSec(1000,1060,false),.06);});

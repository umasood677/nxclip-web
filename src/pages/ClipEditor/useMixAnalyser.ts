import { useEffect, useRef, useState, type RefObject } from "react";

export const MIX_METER_BAR_COUNT = 12;

type MixAnalyserOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  bgmRef: RefObject<HTMLAudioElement | null>;
  /** Attach MediaElementSources (keep graph alive on the polish screen). */
  tap: boolean;
  /** Drive the meter from live samples. */
  animate: boolean;
  /** Re-tap when clip media or selected BGM changes. */
  videoKey?: string | null;
  bgmKey?: string | null;
  /** Extra connect retry (e.g. after Play, when the polish video is definitely mounted). */
  wake?: boolean;
  /** High-pass + voice presence on clip audio only (not BGM). */
  noiseReduced?: boolean;
};

type MixGraph = {
  ctx: AudioContext;
  hub: GainNode;
  analyser: AnalyserNode;
  clipInsert: GainNode;
  bgmInsert: GainNode;
  nrBypass: GainNode;
  nrWet: GainNode;
  connected: WeakSet<HTMLMediaElement>;
};

let mixGraph: MixGraph | null = null;
let lastPreviewGains = { master: 1, clip: 1, music: 0.5, musicOn: false };

function applyPreviewGains(graph: MixGraph, opts: typeof lastPreviewGains) {
  const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
  graph.hub.gain.value = clamp(opts.master, 1.5);
  graph.clipInsert.gain.value = clamp(opts.clip, 1);
  graph.bgmInsert.gain.value = opts.musicOn ? clamp(opts.music, 1) : 0;
}

function audioContextCtor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

function buildNoiseReductionChain(ctx: AudioContext, wet: GainNode) {
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 95;
  highpass.Q.value = 0.707;

  const rumble = ctx.createBiquadFilter();
  rumble.type = "lowshelf";
  rumble.frequency.value = 220;
  rumble.gain.value = -10;

  const hiss = ctx.createBiquadFilter();
  hiss.type = "highshelf";
  hiss.frequency.value = 7500;
  hiss.gain.value = -7;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2700;
  presence.Q.value = 1.1;
  presence.gain.value = 5.5;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26;
  comp.knee.value = 16;
  comp.ratio.value = 4;
  comp.attack.value = 0.006;
  comp.release.value = 0.16;

  highpass.connect(rumble);
  rumble.connect(hiss);
  hiss.connect(presence);
  presence.connect(comp);
  comp.connect(wet);
  return highpass;
}

function ensureMixGraph(): MixGraph | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  if (mixGraph && mixGraph.ctx.state !== "closed" && mixGraph.bgmInsert) return mixGraph;

  const ctx = new Ctor();
  const hub = ctx.createGain();
  hub.gain.value = 1;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.45;

  const clipInsert = ctx.createGain();
  clipInsert.gain.value = 1;
  const bgmInsert = ctx.createGain();
  bgmInsert.gain.value = 0;
  const nrBypass = ctx.createGain();
  nrBypass.gain.value = 1;
  const nrWet = ctx.createGain();
  nrWet.gain.value = 0;

  const nrIn = buildNoiseReductionChain(ctx, nrWet);
  clipInsert.connect(nrBypass);
  clipInsert.connect(nrIn);
  nrBypass.connect(hub);
  nrWet.connect(hub);
  bgmInsert.connect(hub);
  hub.connect(analyser);
  analyser.connect(ctx.destination);

  mixGraph = { ctx, hub, analyser, clipInsert, bgmInsert, nrBypass, nrWet, connected: new WeakSet() };
  applyPreviewGains(mixGraph, lastPreviewGains);
  return mixGraph;
}

function tapMediaElement(el: HTMLMediaElement | null, dest: AudioNode, graph: MixGraph) {
  if (!el || graph.connected.has(el)) return;
  try {
    const source = graph.ctx.createMediaElementSource(el);
    source.connect(dest);
    graph.connected.add(el);
  } catch {
    graph.connected.add(el);
  }
}

/** Preview mix: hub = master (can exceed 1), inserts = clip / BGM. BGM muted when no track. */
export function setMixPreviewGains(opts: {
  master: number;
  clip: number;
  music: number;
  musicOn: boolean;
}) {
  lastPreviewGains = opts;
  const graph = mixGraph;
  if (!graph) return false;
  applyPreviewGains(graph, opts);
  return true;
}

export function setMixClipNoiseReduction(enabled: boolean) {
  const graph = mixGraph;
  if (!graph) return;
  const now = graph.ctx.currentTime;
  graph.nrWet.gain.cancelScheduledValues(now);
  graph.nrBypass.gain.cancelScheduledValues(now);
  graph.nrWet.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.04);
  graph.nrBypass.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.04);
}

export function mixMeterLevelsFromSamples(
  freq: Uint8Array,
  wave: Uint8Array,
  bars = MIX_METER_BAR_COUNT,
): number[] {
  let energy = 0;
  for (let i = 0; i < wave.length; i++) {
    const v = (wave[i]! - 128) / 128;
    energy += v * v;
  }
  const volume = Math.min(1, Math.sqrt(energy / Math.max(1, wave.length)) * 3.4);

  const usable = Math.max(bars, Math.floor(freq.length * 0.62));
  const slice = Math.max(1, Math.floor(usable / bars));
  const next = new Array<number>(bars);
  for (let i = 0; i < bars; i++) {
    let sum = 0;
    const start = i * slice;
    for (let j = 0; j < slice; j++) sum += freq[start + j] ?? 0;
    let n = sum / slice / 255;
    if (i < 3) n = Math.min(1, n * 1.45 + volume * 0.4);
    else n = Math.min(1, n * 0.95 + volume * 0.22);
    next[i] = n;
  }
  return next;
}

/**
 * Live EQ-style levels from the polish mix (clip + BGM).
 * Uses a page-lifetime AudioContext because a media element can only have one
 * MediaElementSource.
 */
export function useMixGraphTap({
  videoRef,
  bgmRef,
  tap,
  videoKey,
  bgmKey,
  wake,
  noiseReduced,
}: Omit<MixAnalyserOptions, "animate">) {
  useEffect(() => {
    if (!tap) return;
    const graph = ensureMixGraph();
    if (!graph) return;
    void graph.ctx.resume().catch(() => {});
    tapMediaElement(videoRef.current, graph.clipInsert, graph);
    tapMediaElement(bgmRef.current, graph.bgmInsert, graph);
    applyPreviewGains(graph, lastPreviewGains);
    if (noiseReduced !== undefined) setMixClipNoiseReduction(noiseReduced);
  }, [tap, wake, videoRef, bgmRef, videoKey, bgmKey, noiseReduced]);
}

export function useMixAnalyser({
  videoRef,
  bgmRef,
  tap,
  animate,
  videoKey,
  bgmKey,
  noiseReduced,
}: MixAnalyserOptions): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(MIX_METER_BAR_COUNT).fill(0));
  const rafRef = useRef(0);

  useMixGraphTap({
    videoRef,
    bgmRef,
    tap,
    videoKey,
    bgmKey,
    wake: animate,
    noiseReduced,
  });

  useEffect(() => {
    const graph = mixGraph;
    if (!animate || !graph) {
      setLevels(Array(MIX_METER_BAR_COUNT).fill(0));
      return;
    }

    void graph.ctx.resume().catch(() => {});
    const { analyser } = graph;
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const wave = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(wave);
      setLevels(mixMeterLevelsFromSamples(freq, wave));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  return levels;
}

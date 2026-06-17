/**
 * Процедурный аудио-слой (Web Audio API, без ассетов). Тонкие синтезированные
 * SFX: поглощение, покупка, событие, престиж. Контекст создаётся лениво и
 * стартует только после жеста пользователя (политика autoplay браузеров).
 * Состояние «выкл» хранится в localStorage. Громкость намеренно низкая.
 */

const MUTED_KEY = "cbh:muted";
const MASTER_GAIN = 0.32;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
let lastAbsorbMs = -1e9;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}

/** Возобновить контекст по первому жесту пользователя (иначе он suspended). */
export function resumeAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTED_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (ctx && master) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(next ? 0 : MASTER_GAIN, t, 0.02);
  }
}

type ToneOpts = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  freqEnd?: number;
  delay?: number;
};

function tone(o: ToneOpts): void {
  const c = ensureCtx();
  if (!c || !master || muted) return;
  if (c.state === "suspended") return; // ждём жеста
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  const peak = o.gain ?? 0.06;
  const attack = o.attack ?? 0.006;
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, o.freqEnd),
      t0 + o.dur,
    );
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
}

/** Поглощение материи. Питч слегка падает с величиной MP; голос ограничен. */
export function playAbsorb(mpValue: number): void {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - lastAbsorbMs < 45) return; // не более ~22 щелчков/с
  lastAbsorbMs = now;
  // Крупный объект — ниже и сочнее, мелкий — выше и легче.
  const m = Math.max(1, Math.min(80, mpValue));
  const base = 520 - Math.min(220, Math.log2(m) * 42);
  tone({ freq: base, freqEnd: base * 0.6, dur: 0.13, type: "triangle", gain: 0.05 });
}

/** Подтверждение покупки — короткий приятный двойной тон вверх. */
export function playPurchase(): void {
  resumeAudio();
  tone({ freq: 620, dur: 0.09, type: "sine", gain: 0.06 });
  tone({ freq: 930, dur: 0.12, type: "sine", gain: 0.06, delay: 0.06 });
}

/** Старт события — мягкий восходящий свип. */
export function playEvent(): void {
  tone({ freq: 240, freqEnd: 560, dur: 0.5, type: "sawtooth", gain: 0.04 });
  tone({ freq: 360, freqEnd: 720, dur: 0.5, type: "sine", gain: 0.03, delay: 0.02 });
}

/** Сжатие вселенной (престиж) — глубокий медленный свелл. */
export function playPrestige(): void {
  resumeAudio();
  tone({ freq: 180, freqEnd: 90, dur: 0.9, type: "sine", gain: 0.09 });
  tone({ freq: 270, freqEnd: 540, dur: 1.1, type: "triangle", gain: 0.05, delay: 0.1 });
}

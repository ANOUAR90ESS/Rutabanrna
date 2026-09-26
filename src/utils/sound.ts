/**
 * Synthesizes transit sounds using Web Audio API
 * No external audio files needed; 100% reliable across sandboxes
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Barcelona Metro / Rodalies Train Door Closing Chime (Iconic 2-tone melodic chime)
 */
export function playTrainDoorChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [
    { freq: 880, start: 0, duration: 0.18 },    // A5
    { freq: 1174.66, start: 0.22, duration: 0.25 }, // D6
    { freq: 880, start: 0.52, duration: 0.18 },
    { freq: 1174.66, start: 0.74, duration: 0.35 },
  ];

  tones.forEach((tone) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);

    gain.gain.setValueAtTime(0, now + tone.start);
    gain.gain.linearRampToValueAtTime(0.2, now + tone.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.05);
  });
}

/**
 * Train Locomotive Horn (Civia / Rodalies dual pneumatic acoustic tone)
 */
export function playTrainHorn() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [311.13, 370.0, 470.0]; // Eb4, F#4, Bb4 train chord

  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.setValueAtTime(0.12, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  });
}

/**
 * Departure Alert Notification Chime (Crystal clear pleasant bell)
 */
export function playAlertNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);

    gain.gain.setValueAtTime(0, now + idx * 0.09);
    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.5);
  });
}

/**
 * Bus Bell Ring (Request stop chime)
 */
export function playBusBell() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1760, now); // A6 bell

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.65);
}

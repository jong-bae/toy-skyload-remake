// 직접 작곡한 칩튠 배경음악을 Web Audio로 실시간 연주한다 (A단조, Am-F-C-G, 110BPM)
export const BPM = 110;
export const STEPS_PER_BAR = 16; // 16분음표
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
const ARP = [0, 1, 2, 1, 0, 1, 2, 3]; // 화음 구성음 순서 (3은 한 옥타브 위 근음)

export interface Note {
  /** 악기 */
  voice: 'lead' | 'bass' | 'kick' | 'hat';
  /** MIDI 음 번호 (타악기는 0) */
  midi: number;
}

/** 루프 안 몇 번째 16분음표에서 낼 음들 (4마디 = 64스텝 반복) */
export function notesAt(step: number): Note[] {
  const bar = Math.floor(step / STEPS_PER_BAR) % CHORDS.length;
  const s = step % STEPS_PER_BAR;
  const chord = CHORDS[bar];
  const out: Note[] = [];
  const a = ARP[s % ARP.length];
  out.push({ voice: 'lead', midi: (a === 3 ? chord[0] + 12 : chord[a]) + 12 });
  if (s % 4 === 0) out.push({ voice: 'bass', midi: chord[0] - 12 });
  if (s % 8 === 0) out.push({ voice: 'kick', midi: 0 });
  if (s % 2 === 1) out.push({ voice: 'hat', midi: 0 });
  return out;
}

export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

const STEP_TIME = 60 / BPM / 4;
const LOOKAHEAD = 0.12;

export class Music {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private noise!: AudioBuffer;
  private step = 0;
  private nextTime = 0;
  private timer: number | undefined;
  private volume = 0;

  /** 효과음과 같은 AudioContext를 쓴다 */
  attach(ctx: AudioContext, destination: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate / 10, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  /** 음량 (0이면 꺼짐). 부드럽게 바뀐다 */
  setVolume(v: number): void {
    if (!this.ctx || v === this.volume) return;
    this.volume = v;
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  stop(): void {
    window.clearInterval(this.timer);
  }

  /** 앞으로 LOOKAHEAD초 안에 올 음을 미리 예약한다 (setInterval의 오차를 흡수) */
  private schedule(): void {
    const ctx = this.ctx!;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.02; // 탭이 잠들었다 깨어난 경우
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      for (const n of notesAt(this.step)) this.play(n, this.nextTime);
      this.step = (this.step + 1) % (STEPS_PER_BAR * CHORDS.length);
      this.nextTime += STEP_TIME;
    }
  }

  private play(n: Note, t: number): void {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.connect(this.out);
    if (n.voice === 'hat') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      src.connect(hp).connect(gain);
      src.start(t);
      src.stop(t + 0.05);
      return;
    }
    const osc = ctx.createOscillator();
    const len = n.voice === 'bass' ? STEP_TIME * 3.5 : n.voice === 'kick' ? 0.15 : STEP_TIME * 0.9;
    if (n.voice === 'kick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + len);
      gain.gain.setValueAtTime(0.5, t);
    } else {
      osc.type = n.voice === 'bass' ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(midiToHz(n.midi), t);
      gain.gain.setValueAtTime(n.voice === 'bass' ? 0.28 : 0.05, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + len + 0.02);
  }
}

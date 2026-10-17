// Web Audio로 합성하는 효과음과 엔진음 (음원 파일 없음)
import type { GameEvent } from './events';

export type UiSound = 'move' | 'select';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private engineOsc!: OscillatorNode;
  private engineGain!: GainNode;
  private noise!: AudioBuffer;

  /** 브라우저 정책상 사용자 입력 이후에만 소리를 낼 수 있다. 첫 입력 때 호출한다 */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(ctx.destination);

    // 엔진음: 톱니파를 저역 통과시켜 웅웅거리게
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** 배경음악 등 다른 소리를 같은 출력에 연결할 때 쓴다. unlock 전에는 null */
  get audio(): { ctx: AudioContext; out: AudioNode } | null {
    return this.ctx ? { ctx: this.ctx, out: this.master } : null;
  }

  /** 엔진음. speedLevel이 null이면 끈다 */
  engine(speedLevel: number | null): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = speedLevel !== null && speedLevel > 0.5;
    this.engineGain.gain.setTargetAtTime(on ? 0.06 : 0, t, 0.08);
    if (speedLevel !== null) this.engineOsc.frequency.setTargetAtTime(45 + speedLevel * 5, t, 0.05);
  }

  ui(sound: UiSound): void {
    if (sound === 'move') this.tone('square', 660, 660, 0.04, 0.08);
    else this.tone('square', 880, 1320, 0.09, 0.1);
  }

  event(e: GameEvent): void {
    switch (e) {
      case 'jump':
        return this.tone('square', 300, 720, 0.12, 0.12);
      case 'land':
        return this.tone('sine', 140, 50, 0.1, 0.3);
      case 'bump':
        return this.burst(0.12, 900, 0.4);
      case 'supplies':
        this.tone('triangle', 880, 880, 0.08, 0.15);
        return this.tone('triangle', 1320, 1320, 0.1, 0.15, 0.09);
      case 'exploded':
        return this.burst(0.9, 1800, 0.9);
      case 'fell':
        return this.tone('sine', 600, 70, 1.0, 0.25);
      case 'noFuel':
      case 'noOxygen':
        return this.tone('sawtooth', 160, 60, 0.8, 0.2);
      case 'cleared':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.14, 0.12, i * 0.12));
    }
  }

  /** 주파수를 from에서 to로 미끄러뜨리는 짧은 음 */
  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** 저역 통과 필터를 닫아 가며 사라지는 잡음 (충돌·폭발) */
  private burst(dur: number, cutoff: number, vol: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }
}

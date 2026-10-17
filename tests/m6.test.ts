// M6 보조 기능(설정 저장, 배경음악 악보, FPS 측정)을 검증한다
import { describe, expect, it } from 'vitest';
import { midiToHz, notesAt, STEPS_PER_BAR } from '../src/audio/music';
import { FpsMeter } from '../src/ui/fps';
import { Settings } from '../src/ui/settings';

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('설정', () => {
  it('기본값은 현대식 화면, 음악 켬', () => {
    expect(new Settings(memoryStore()).values).toEqual({ camera: 'modern', music: true });
  });

  it('바꾼 설정을 저장했다가 불러온다', () => {
    const store = memoryStore();
    const s = new Settings(store);
    s.toggleCamera();
    s.toggleMusic();
    expect(new Settings(store).values).toEqual({ camera: 'classic', music: false });
  });

  it('이상한 값은 무시하고 기본값을 쓴다', () => {
    const s = new Settings(memoryStore({ 'skyload.settings': '{"camera":"fish","music":"yes"}' }));
    expect(s.values).toEqual({ camera: 'modern', music: true });
  });
});

describe('배경음악 악보', () => {
  it('마디 첫 박에는 킥·베이스·리드가 함께 나온다', () => {
    const voices = notesAt(0).map((n) => n.voice).sort();
    expect(voices).toEqual(['bass', 'kick', 'lead']);
  });

  it('4마디마다 반복된다', () => {
    expect(notesAt(5)).toEqual(notesAt(5 + STEPS_PER_BAR * 4));
  });

  it('A4(69)는 440Hz', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
});

describe('FPS 측정', () => {
  it('0.5초 동안 프레임 수로 평균을 낸다', () => {
    const m = new FpsMeter();
    for (let i = 0; i < 31; i++) m.tick(1 / 60); // 30프레임 합은 부동소수 오차로 0.5초에 살짝 못 미친다
    expect(m.fps).toBeCloseTo(60, 0);
  });
});

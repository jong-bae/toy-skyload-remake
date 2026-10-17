// 입력을 스텝별 비트마스크로 기록·재생해 같은 결과를 재현한다 (회귀 테스트용)
import { initialState, NO_INPUT, step, type Input, type ShipState } from './simulation';
import type { Level } from '../level/types';

const KEYS = ['accelerate', 'brake', 'left', 'right', 'jump'] as const;

/** [입력 비트마스크, 연속 스텝 수] 묶음 목록 */
export type Replay = [number, number][];

export function encodeInput(input: Input): number {
  return KEYS.reduce((mask, key, i) => (input[key] ? mask | (1 << i) : mask), 0);
}

export function decodeInput(mask: number): Input {
  const input = { ...NO_INPUT };
  KEYS.forEach((key, i) => (input[key] = (mask & (1 << i)) !== 0));
  return input;
}

/** 스텝별 입력 목록을 같은 입력이 이어지는 구간으로 묶는다 */
export function compress(inputs: Input[]): Replay {
  const out: Replay = [];
  for (const input of inputs) {
    const mask = encodeInput(input);
    const lastRun = out[out.length - 1];
    if (lastRun && lastRun[0] === mask) lastRun[1]++;
    else out.push([mask, 1]);
  }
  return out;
}

/** 리플레이를 처음부터 재생한 최종 상태 */
export function playReplay(level: Level, replay: Replay): ShipState {
  let s = initialState(level);
  for (const [mask, count] of replay) {
    const input = decodeInput(mask);
    for (let i = 0; i < count; i++) s = step(s, input, level);
  }
  return s;
}

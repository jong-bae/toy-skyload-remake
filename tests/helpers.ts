// 테스트용 레벨 생성과 일정 시간 시뮬레이션 실행 도우미
import { FIXED_DT } from '../src/core/config';
import { initialState, NO_INPUT, step, type Input, type ShipState } from '../src/core/simulation';
import { parseLevel } from '../src/level/parse';
import type { Level } from '../src/level/types';

/** 문자열로 레벨을 만든다. 기호는 src/level/parse.ts 참조 */
export function makeLevel(rows: string[], gravity = 500): Level {
  return parseLevel({ name: 'test', gravity, rows });
}

/** 같은 줄을 n번 반복한다 */
export function repeat(row: string, n: number): string[] {
  return Array.from({ length: n }, () => row);
}

export const FLAT = makeLevel(repeat('_______', 400));

/** 입력(고정값 또는 시간 함수)으로 seconds초 진행하고 매 스텝 상태를 돌려준다 */
export function run(
  level: Level,
  seconds: number,
  input: Partial<Input> | ((t: number) => Partial<Input>) = {},
  start: Partial<ShipState> = {},
): ShipState[] {
  let s: ShipState = { ...initialState(), ...start };
  const out = [s];
  const n = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < n; i++) {
    const inp = typeof input === 'function' ? input(s.time) : input;
    s = step(s, { ...NO_INPUT, ...inp }, level);
    out.push(s);
  }
  return out;
}

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

/** 측정값 대비 상대 오차가 tol 이내인지 */
export function near(actual: number, expected: number, tol = 0.1): boolean {
  return Math.abs(actual - expected) <= Math.abs(expected) * tol;
}

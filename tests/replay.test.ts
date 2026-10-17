// 입력 리플레이 기록·재생과 골든 리플레이 회귀 테스트
// 물리를 의도적으로 바꿨다면 `UPDATE_REPLAY=1 npm test`로 골든 파일을 다시 만든다
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import testLevel from '../levels/test-01.json';
import { compress, decodeInput, encodeInput, playReplay, type Replay } from '../src/core/replay';
import { initialState, step, type Input, type ShipState } from '../src/core/simulation';
import { parseLevel } from '../src/level/parse';
import { autopilot, testLevelTarget } from './autopilot';

const GOLDEN = new URL('./replays/test-01.json', import.meta.url);
const level = parseLevel(testLevel);

interface Golden {
  replay: Replay;
  expected: Pick<ShipState, 'status' | 'time' | 'z' | 'fuel' | 'oxygen'>;
}

function recordAutopilot(): { inputs: Input[]; final: ShipState } {
  let s = initialState(level);
  const inputs: Input[] = [];
  const target = testLevelTarget(level);
  while (s.status === 'alive' && inputs.length < 70 * 120) {
    const input = autopilot(level, s, target);
    inputs.push(input);
    s = step(s, input, level);
  }
  return { inputs, final: s };
}

const summary = (s: ShipState): Golden['expected'] => ({
  status: s.status,
  time: s.time,
  z: s.z,
  fuel: s.fuel,
  oxygen: s.oxygen,
});

describe('리플레이', () => {
  it('입력 비트마스크는 왕복 변환해도 같다', () => {
    for (let mask = 0; mask < 32; mask++) expect(encodeInput(decodeInput(mask))).toBe(mask);
  });

  it('기록한 입력을 재생하면 같은 최종 상태가 나온다', () => {
    const { inputs, final } = recordAutopilot();
    expect(playReplay(level, compress(inputs))).toEqual(final);
  });

  it('골든 리플레이 결과가 바뀌지 않았다', () => {
    if (process.env.UPDATE_REPLAY || !existsSync(GOLDEN)) {
      const { inputs, final } = recordAutopilot();
      const golden: Golden = { replay: compress(inputs), expected: summary(final) };
      writeFileSync(GOLDEN, JSON.stringify(golden) + '\n');
    }
    const golden: Golden = JSON.parse(readFileSync(GOLDEN, 'utf-8'));
    const actual = summary(playReplay(level, golden.replay));
    expect(actual.status).toBe(golden.expected.status);
    expect(actual.time).toBeCloseTo(golden.expected.time, 9);
    expect(actual.z).toBeCloseTo(golden.expected.z, 9);
    expect(actual.fuel).toBeCloseTo(golden.expected.fuel, 9);
    expect(actual.oxygen).toBeCloseTo(golden.expected.oxygen, 9);
  });
});

// 게임에 포함된 모든 스테이지가 자동 조종으로 클리어 가능한지 검증한다
import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/level/catalog';
import { autoplay } from './autopilot';

/**
 * 스테이지별 자동 조종 목표 속도. 구멍을 넘으려면 중력에 맞는 속도가 필요하다
 * (중력 500: 13단계, 600: 15단계). 가속 레일은 Boost 구간부터 2칸 구멍까지 최고 속도로 달린다.
 */
const TARGETS: ((row: number) => number)[] = [
  () => 13,
  () => 13,
  () => 12,
  (row) => (row >= 23 && row <= 40 ? 31 : 13),
  () => 10,
  () => 15,
  () => 14,
  () => 12,
  () => 13,
  () => 13,
];

describe('스테이지', () => {
  it('10개 이상 있다', () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(STAGES.map((level, i) => [i + 1, level.name, i] as const))('%i. %s: 자동 조종으로 클리어', (_, __, i) => {
    const level = STAGES[i];
    const { final: s } = autoplay(level, TARGETS[i] ?? (() => 13));
    expect(s.status, `z=${s.z.toFixed(2)}/${level.rows.length} x=${s.x.toFixed(2)} 속도=${s.speedLevel.toFixed(1)}`).toBe(
      'cleared',
    );
  });
});

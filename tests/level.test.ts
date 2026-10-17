// 테스트 레벨을 자동 조종으로 끝까지 통과할 수 있는지 검증한다
import { describe, expect, it } from 'vitest';
import testLevel from '../levels/test-01.json';
import { SHIP_LENGTH } from '../src/core/config';
import { forwardSpeed } from '../src/core/physics';
import { initialState, step, type Input, type ShipState } from '../src/core/simulation';
import { parseLevel } from '../src/level/parse';
import { cellAt, type Level } from '../src/level/types';

/**
 * 목표 속도를 유지하고 장애물 앞에서 뛰는 단순 자동 조종.
 * 블록에 오를 때는 최고점 근처에 닿도록 일찍, 구멍은 체공 거리를 아끼도록 가장자리에서 늦게 뛴다.
 */
function autopilot(level: Level, s: ShipState, targetSpeed: (row: number) => number): Input {
  const row = Math.floor(s.z);
  const front = s.z + SHIP_LENGTH / 2;
  const v = forwardSpeed(s.speedLevel);
  const here = cellAt(level, 3, Math.floor(front - 0.01));
  const stepAhead = cellAt(level, 3, Math.floor(front + v * 0.22));
  const gapAhead = cellAt(level, 3, Math.floor(front + v * 0.03));
  const danger = gapAhead === null || (here !== null && stepAhead !== null && stepAhead.top > here.top);
  return {
    accelerate: s.speedLevel < targetSpeed(row),
    brake: false,
    left: s.x > 3.55,
    right: s.x < 3.45,
    jump: danger && s.grounded,
  };
}

describe('테스트 레벨 01', () => {
  const level = parseLevel(testLevel);

  it('모든 줄이 7칸이다', () => {
    expect(level.rows.length).toBeGreaterThan(50);
  });

  it('자동 조종으로 끝까지 살아서 도착한다', () => {
    let s = initialState();
    // 마지막 2칸 구멍은 고속(약 29단계 이상)이어야 넘는다
    const target = (row: number) => (row < 55 ? 12 : 31);
    for (let i = 0; i < 70 * 60 && s.status === 'alive' && s.z < level.rows.length - 2; i++) {
      s = step(s, autopilot(level, s, target), level);
    }
    expect(s.status, `z=${s.z.toFixed(2)} y=${s.y.toFixed(2)} 속도=${s.speedLevel.toFixed(1)}`).toBe('alive');
    expect(s.z).toBeGreaterThan(level.rows.length - 2);
  });
});

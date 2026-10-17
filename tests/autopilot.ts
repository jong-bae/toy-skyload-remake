// 테스트용 단순 자동 조종: 목표 속도 유지, 도로 중앙 유지, 장애물 앞 점프
import { SHIP_LENGTH } from '../src/core/config';
import { forwardSpeed } from '../src/core/physics';
import type { Input, ShipState } from '../src/core/simulation';
import { cellAt, type Level } from '../src/level/types';

/**
 * 블록에 오를 때는 최고점 근처에 닿도록 일찍, 구멍은 체공 거리를 아끼도록 가장자리에서 늦게 뛴다.
 * Boost로 목표보다 빨라지면 감속키를 누른다.
 */
export function autopilot(level: Level, s: ShipState, targetSpeed: (row: number) => number): Input {
  const target = targetSpeed(Math.floor(s.z));
  const front = s.z + SHIP_LENGTH / 2;
  const v = forwardSpeed(s.speedLevel);
  const here = cellAt(level, 3, Math.floor(front - 0.01));
  const stepAhead = cellAt(level, 3, Math.floor(front + v * 0.22));
  const gapAhead = cellAt(level, 3, Math.floor(front + v * 0.03));
  const danger = gapAhead === null || (here !== null && stepAhead !== null && stepAhead.top > here.top);
  return {
    accelerate: s.speedLevel < target,
    brake: s.speedLevel > target + 1,
    left: s.x > 3.55,
    right: s.x < 3.45,
    jump: danger && s.grounded,
  };
}

/** 테스트 레벨 01 목표 속도: 마지막 2칸 구멍(약 29단계 이상 필요) 앞에서 최고 속도로 */
export function testLevelTarget(level: Level): (row: number) => number {
  return (row) => (row < level.rows.length - 25 ? 12 : 31);
}

// 테스트용 자동 조종: 안전한 칸을 따라 차선을 바꾸고, 목표 속도를 유지하며, 장애물 앞에서 뛴다
import { SHIP_LENGTH } from '../src/core/config';
import { forwardSpeed } from '../src/core/physics';
import { initialState, step, type Input, type ShipState } from '../src/core/simulation';
import { cellAt, type Cell, type Level } from '../src/level/types';

const safe = (cell: Cell | null) => cell !== null && cell.type !== 'burning';

/** 줄마다 따라갈 칸. 지금 칸이 안전하면 유지하고, 아니면 가장 가까운 안전한 칸으로 옮긴다 */
export function planPath(level: Level): number[] {
  const plan: number[] = [];
  let col = 3;
  for (const row of level.rows) {
    if (!safe(row[col])) {
      const options = row.map((_, c) => c).filter((c) => safe(row[c]));
      if (options.length > 0) {
        col = options.reduce((best, c) => (Math.abs(c - col) < Math.abs(best - col) ? c : best));
      }
    }
    plan.push(col);
  }
  return plan;
}

/**
 * 블록에 오를 때는 최고점 근처에 닿도록 일찍, 구멍·불타는 칸은 체공 거리를 아끼도록 가장자리에서 늦게 뛴다.
 * 차선은 앞쪽 줄의 계획 칸을 미리 보고 옮긴다. Boost로 목표보다 빨라지면 감속키를 누른다.
 */
export function autopilot(level: Level, s: ShipState, targetSpeed: (row: number) => number, plan: number[]): Input {
  const target = targetSpeed(Math.floor(s.z));
  const front = s.z + SHIP_LENGTH / 2;
  const v = forwardSpeed(s.speedLevel);
  const steerRow = Math.min(plan.length - 1, Math.floor(s.z + Math.max(1.0, v * 0.45)));
  const goalX = plan[Math.max(0, steerRow)] + 0.5;

  const col = Math.floor(s.x);
  const here = cellAt(level, col, Math.floor(front - 0.01));
  const stepAhead = cellAt(level, col, Math.floor(front + v * 0.22));
  const gapAhead = cellAt(level, col, Math.floor(front + v * 0.03));
  const danger =
    !safe(gapAhead) || (here !== null && stepAhead !== null && stepAhead.top > here.top + 0.01);
  return {
    accelerate: s.speedLevel < target,
    brake: s.speedLevel > target + 1,
    left: s.x > goalX + 0.05,
    right: s.x < goalX - 0.05,
    jump: danger && s.grounded,
  };
}

/** 자동 조종으로 끝까지 플레이한 최종 상태와 매 스텝 입력 */
export function autoplay(level: Level, targetSpeed: (row: number) => number): { final: ShipState; inputs: Input[] } {
  const plan = planPath(level);
  let s = initialState(level);
  const inputs: Input[] = [];
  while (s.status === 'alive' && inputs.length < 70 * 180) {
    const input = autopilot(level, s, targetSpeed, plan);
    inputs.push(input);
    s = step(s, input, level);
  }
  return { final: s, inputs };
}

/** 테스트 레벨 01 목표 속도: 마지막 2칸 구멍(약 29단계 이상 필요) 앞에서 최고 속도로 */
export function testLevelTarget(level: Level): (row: number) => number {
  return (row) => (row < level.rows.length - 25 ? 12 : 31);
}

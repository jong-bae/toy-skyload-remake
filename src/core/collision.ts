// 우주선 몸체가 덮는 칸을 찾아 받침 높이와 가로막는 칸을 판정한다
import { SHIP_LENGTH, SHIP_WIDTH, STEP_TOLERANCE } from './config';
import { cellAt, type Level } from '../level/types';

const EPS = 1e-6;

export interface CellRef {
  col: number;
  row: number;
}

/** 몸체(중심 x, z)가 덮는 칸 범위 */
function covered(x: number, z: number): CellRef[] {
  const c0 = Math.floor(x - SHIP_WIDTH / 2);
  const c1 = Math.floor(x + SHIP_WIDTH / 2 - EPS);
  const r0 = Math.floor(z - SHIP_LENGTH / 2);
  const r1 = Math.floor(z + SHIP_LENGTH / 2 - EPS);
  const out: CellRef[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) out.push({ col, row });
  }
  return out;
}

/** 몸체 아래 표면 중 가장 높은 곳. 덮는 칸이 모두 구멍이면 null */
export function supportHeight(level: Level, x: number, z: number): number | null {
  let top: number | null = null;
  for (const { col, row } of covered(x, z)) {
    const cell = cellAt(level, col, row);
    if (cell && (top === null || cell.top > top)) top = cell.top;
  }
  return top;
}

/** 높이 y에 있는 몸체를 가로막는(표면이 더 높은) 칸 */
export function blockingCells(level: Level, x: number, z: number, y: number): CellRef[] {
  return covered(x, z).filter(({ col, row }) => {
    const cell = cellAt(level, col, row);
    return cell !== null && cell.top > y + STEP_TOLERANCE;
  });
}

/** 정면으로 막혔을 때 몸체가 멈출 z (가장 가까운 막는 줄 바로 앞) */
export function stopBefore(blocking: CellRef[]): number {
  const row = Math.min(...blocking.map((c) => c.row));
  return row - SHIP_LENGTH / 2 - EPS;
}

/** 옆으로 막혔을 때 몸체가 멈출 x */
export function stopBeside(blocking: CellRef[], movingRight: boolean): number {
  if (movingRight) {
    const col = Math.min(...blocking.map((c) => c.col));
    return col - SHIP_WIDTH / 2 - EPS;
  }
  const col = Math.max(...blocking.map((c) => c.col));
  return col + 1 + SHIP_WIDTH / 2 + EPS;
}

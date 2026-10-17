// 레벨(도로) 데이터 모델: 가로 7칸 × 세로 N줄 격자의 높이맵
export type TileType = 'normal' | 'supplies' | 'boost' | 'sticky' | 'slippery' | 'burning';

/** 한 칸의 바닥. top은 표면 높이(h 단위, 기본 바닥 = 0). 블록은 top이 더 높은 칸이다. */
export interface Cell {
  top: number;
  type: TileType;
  /** 아치형 지붕이 덮인 칸. 안에서는 점프할 수 없다 */
  tunnel?: boolean;
}

export interface Level {
  name: string;
  /** 원작 GRAV-O-METER 표시값 (100, 400, 500, 600, 900, 1700) */
  gravity: number;
  /** 연료량 (주행 가능한 타일 수) */
  fuel: number;
  /** 산소량 (초) */
  oxygen: number;
  /** rows[줄][칸]. 줄 0이 출발점, null은 구멍 */
  rows: (Cell | null)[][];
}

export function cellAt(level: Level, col: number, row: number): Cell | null {
  return level.rows[row]?.[col] ?? null;
}

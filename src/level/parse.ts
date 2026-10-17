// 문자열 격자로 작성한 레벨 데이터를 Level 모델로 변환한다
import { ROAD_COLUMNS } from '../core/config';
import type { Cell, Level } from './types';

/** 레벨 파일 형식. rows는 출발점(줄 0)부터 순서대로, 각 줄은 7글자 */
export interface LevelSource {
  name: string;
  gravity: number;
  rows: string[];
}

/** 블록 높이 (h). 원작 로드 4 측면 블록 실측 약 0.29h */
export const BLOCK_HEIGHT = 0.3;

/** '.' 구멍, '_' 바닥, '#' 블록 */
const LEGEND: Record<string, Cell | null> = {
  '.': null,
  _: { top: 0, type: 'normal' },
  '#': { top: BLOCK_HEIGHT, type: 'normal' },
};

export function parseLevel(src: LevelSource): Level {
  const rows = src.rows.map((line, r) => {
    if (line.length !== ROAD_COLUMNS) {
      throw new Error(`${src.name} ${r}번 줄: 칸 수가 ${line.length}개 (${ROAD_COLUMNS}개여야 함)`);
    }
    return [...line].map((ch, c) => {
      if (!(ch in LEGEND)) throw new Error(`${src.name} ${r}번 줄 ${c}칸: 알 수 없는 문자 '${ch}'`);
      const cell = LEGEND[ch];
      return cell && { ...cell };
    });
  });
  return { name: src.name, gravity: src.gravity, rows };
}

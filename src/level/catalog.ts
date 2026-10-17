// 게임에 포함된 스테이지 목록 (levels/stage-*.json, 파일 이름 순)
import { parseLevel, type LevelSource } from './parse';
import type { Level } from './types';

const files = import.meta.glob<LevelSource>('../../levels/stage-*.json', { eager: true, import: 'default' });

export const STAGES: Level[] = Object.keys(files)
  .sort()
  .map((path) => parseLevel(files[path]));

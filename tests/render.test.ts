// 원작 투영 공식, 레벨 파서, 도로 메시 생성이 측정값·규칙대로 동작하는지 검증한다
import { describe, expect, it } from 'vitest';
import { BLOCK_HEIGHT, parseLevel } from '../src/level/parse';
import {
  COLUMN_WIDTH,
  DEPTH_K,
  DEPTH_ORIGIN,
  DRAW_DISTANCE,
  SHIP_CAMERA_DISTANCE,
  projectClassic,
} from '../src/render/projection';
import { buildRoadGeometry } from '../src/render/road';

describe('원작 투영 (measurements.md 2장)', () => {
  it('우주선 접지 행은 화면 y = 100', () => {
    expect(projectClassic(0, 0, SHIP_CAMERA_DISTANCE).sy).toBeCloseTo(100, 6);
  });

  it('우주선 행에서 1h는 68px (높이·좌우 모두)', () => {
    const ground = projectClassic(0, 0, SHIP_CAMERA_DISTANCE);
    expect(projectClassic(1, 0, SHIP_CAMERA_DISTANCE).sx - ground.sx).toBeCloseTo(68, 6);
    expect(ground.sy - projectClassic(0, 1, SHIP_CAMERA_DISTANCE).sy).toBeCloseTo(68, 6);
  });

  it('중앙 3칸 노면 반폭은 (y - 32)px', () => {
    for (const d of [2, 4, 7]) {
      const p = projectClassic(1.5 * COLUMN_WIDTH, 0, d);
      expect(p.sx - 159.5).toBeCloseTo(p.sy - 32, 6);
    }
  });

  it('노면은 그릴 수 있는 최대 거리에서 y = 32로 모인다', () => {
    expect(projectClassic(0, 0, DRAW_DISTANCE).sy).toBeCloseTo(32, 6);
  });

  it('타일 1칸 간격은 Δ(1/(y - 8)) = 0.00396', () => {
    const u = (d: number) => 1 / (projectClassic(0, 0, d).sy - DEPTH_ORIGIN);
    expect(u(5) - u(4)).toBeCloseTo(1 / DEPTH_K, 9);
    expect(1 / DEPTH_K).toBeCloseTo(0.00396, 6);
  });
});

describe('레벨 파서', () => {
  it('기호를 칸 높이로 바꾼다', () => {
    const lv = parseLevel({ name: 't', gravity: 500, rows: ['._#____'] });
    expect(lv.rows[0].map((c) => c?.top ?? null)).toEqual([null, 0, BLOCK_HEIGHT, 0, 0, 0, 0]);
  });

  it('칸 수가 7이 아니면 오류', () => {
    expect(() => parseLevel({ name: 't', gravity: 500, rows: ['___'] })).toThrow(/칸 수/);
  });

  it('모르는 기호는 오류', () => {
    expect(() => parseLevel({ name: 't', gravity: 500, rows: ['___x___'] })).toThrow(/알 수 없는 문자/);
  });
});

describe('도로 메시', () => {
  const quads = (rows: string[]) =>
    buildRoadGeometry(parseLevel({ name: 't', gravity: 500, rows })).getAttribute('position').count / 6;

  it('칸 하나는 윗면 8 + 앞면 1 + 옆면 2×8 = 25면', () => {
    expect(quads(['..._...'])).toBe(25);
  });

  it('붙어 있는 같은 높이 칸 사이 옆면은 만들지 않는다', () => {
    expect(quads(['..__...'])).toBe(2 * 25 - 2 * 8);
  });

  it('앞줄이 같은 높이면 뒷줄 앞면은 만들지 않는다', () => {
    expect(quads(['..._...', '..._...'])).toBe(2 * 25 - 1);
  });
});

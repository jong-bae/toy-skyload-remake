// 레벨 높이맵을 원작처럼 면마다 단색 음영을 준 도로 메시로 만든다
import * as THREE from 'three';
import { TUNNEL_CEILING } from '../core/config';
import { cellAt, type Cell, type Level, type TileType } from '../level/types';
import { COLUMN_WIDTH } from './projection';

/** 투영이 비선형이라 전진 방향 면을 이만큼 잘게 나눈다 */
const SEGMENTS = 8;
/** 바닥판 두께 (h) */
const THICKNESS = 0.25;

const FLOOR = [0x3c7992, 0x447f97]; // 줄마다 번갈아 칠해 속도감을 준다
const BLOCK = 0x00a2b6;
/** 특수 블록 색 (원작 HELP 화면 기준) */
const TILE_COLORS: Record<Exclude<TileType, 'normal'>, number> = {
  supplies: 0x4646d8,
  boost: 0x46d24a,
  sticky: 0x0a8a12,
  slippery: 0x5a5a5a,
  burning: 0xd23c3c,
};
const TUNNEL = 0xc89a9a;
/** 터널 아치 단면을 나누는 조각 수 */
const ARCH_STEPS = 8;
const SIDE_SHADE = 0.8;
const FRONT_SHADE = 0.65;

type V3 = [number, number, number];

function baseColor(cell: Cell, row: number): number {
  if (cell.type !== 'normal') return TILE_COLORS[cell.type];
  return cell.top > 0 ? BLOCK : FLOOR[row % 2];
}

/** 칸 c의 왼쪽 끝 x (h). 도로 중앙(3.5칸)이 0 */
export function columnX(c: number): number {
  return (c - 3.5) * COLUMN_WIDTH;
}

export function buildRoadGeometry(level: Level): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const color = new THREE.Color();

  const quad = (a: V3, b: V3, c: V3, d: V3, hex: number, shade: number) => {
    color.setHex(hex).multiplyScalar(shade);
    for (const p of [a, b, c, a, c, d]) {
      pos.push(...p);
      col.push(color.r, color.g, color.b);
    }
  };

  level.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      const x0 = columnX(c);
      const x1 = x0 + COLUMN_WIDTH;
      const z0 = -r;
      const t = cell.top;
      const bottom = -THICKNESS;
      const base = baseColor(cell, r);
      const lowAgainst = (nb: { top: number } | null) => (nb ? Math.max(nb.top, bottom) : bottom);

      for (let k = 0; k < SEGMENTS; k++) {
        const za = z0 - k / SEGMENTS;
        const zb = z0 - (k + 1) / SEGMENTS;
        quad([x0, t, za], [x1, t, za], [x1, t, zb], [x0, t, zb], base, 1);
      }

      // 앞면: 앞줄 칸이 더 낮거나 없을 때만 보인다
      const front = lowAgainst(cellAt(level, c, r - 1));
      if (front < t) quad([x0, front, z0], [x1, front, z0], [x1, t, z0], [x0, t, z0], base, FRONT_SHADE);

      // 옆면: 옆 칸이 더 낮거나 없을 때만 보인다
      for (const side of [-1, 1]) {
        const low = lowAgainst(cellAt(level, c + side, r));
        if (low >= t) continue;
        const x = side < 0 ? x0 : x1;
        for (let k = 0; k < SEGMENTS; k++) {
          const za = z0 - k / SEGMENTS;
          const zb = z0 - (k + 1) / SEGMENTS;
          quad([x, low, za], [x, t, za], [x, t, zb], [x, low, zb], base, SIDE_SHADE);
        }
      }

      // 터널: 칸 양쪽 끝에서 솟아오르는 반원형 지붕
      if (cell.tunnel) {
        const arch = (i: number): [number, number] => {
          const a = (Math.PI * i) / ARCH_STEPS;
          return [x0 + (COLUMN_WIDTH * (1 - Math.cos(a))) / 2, t + TUNNEL_CEILING * Math.sin(a)];
        };
        for (let i = 0; i < ARCH_STEPS; i++) {
          const [xa, ya] = arch(i);
          const [xb, yb] = arch(i + 1);
          const shade = 0.75 + 0.25 * Math.sin((Math.PI * (i + 0.5)) / ARCH_STEPS);
          for (let k = 0; k < SEGMENTS; k++) {
            const za = z0 - k / SEGMENTS;
            const zb = z0 - (k + 1) / SEGMENTS;
            quad([xa, ya, za], [xb, yb, za], [xb, yb, zb], [xa, ya, zb], TUNNEL, shade);
          }
        }
      }
    });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

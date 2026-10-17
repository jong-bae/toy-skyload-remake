// 상자 몇 개로 만든 로우폴리 우주선 (원작 스프라이트 크기·색에 맞춤)
import * as THREE from 'three';
import { SHIP_WIDTH } from '../core/config';
import { COLUMN_WIDTH } from './projection';

/** 면 방향에 따라 밝기를 달리한 단색 상자. 바닥 중앙이 원점 */
function box(w: number, h: number, l: number, hex: number, at: [number, number, number]): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, l);
  geo.translate(at[0], at[1] + h / 2, at[2]);
  const normals = geo.getAttribute('normal');
  const base = new THREE.Color(hex);
  const colors: number[] = [];
  for (let i = 0; i < normals.count; i++) {
    const shade = normals.getY(i) > 0.5 ? 1 : normals.getZ(i) > 0.5 ? 0.65 : 0.8;
    const c = base.clone().multiplyScalar(shade);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

/**
 * 보이는 모델의 전진 방향 길이 (타일). 원작 우주선은 깊이감 없는 평면 스프라이트라서,
 * 충돌용 길이(SHIP_LENGTH 0.5)를 그대로 쓰면 원작 투영에서 세로로 길게 늘어나 보인다.
 */
const VISUAL_LENGTH = 0.15;

export function createShip(material: THREE.Material): THREE.Group {
  const width = SHIP_WIDTH * COLUMN_WIDTH; // 약 0.43h, 원작 스프라이트 29px
  const group = new THREE.Group();
  const parts = [
    box(width * 0.45, 0.1, VISUAL_LENGTH * 0.9, 0x4179aa, [0, 0.02, 0]), // 몸체
    box(width * 0.2, 0.06, VISUAL_LENGTH * 0.35, 0x82bad3, [0, 0.12, -0.05]), // 조종석
    box(width, 0.04, VISUAL_LENGTH * 0.45, 0x2a4d8e, [0, 0.04, 0.05]), // 날개
    box(width * 0.16, 0.07, 0.06, 0xff6500, [-width * 0.32, 0.03, VISUAL_LENGTH * 0.25]), // 왼쪽 엔진
    box(width * 0.16, 0.07, 0.06, 0xff6500, [width * 0.32, 0.03, VISUAL_LENGTH * 0.25]), // 오른쪽 엔진
  ];
  for (const geo of parts) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

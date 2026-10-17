// 폭발 연출: 우주선 위치에서 주황 구체가 커졌다 사라진다 (현대식 효과는 M6)
import * as THREE from 'three';

const DURATION = 0.6;
const MAX_RADIUS = 0.35;

export function createExplosion(material: THREE.Material): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const colors: number[] = [];
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const c = new THREE.Color(pos.getY(i) > 0 ? 0xffd040 : 0xff6000);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

/** 폭발 후 경과 시간에 맞춰 크기를 정한다. 끝나면 숨긴다 */
export function updateExplosion(mesh: THREE.Mesh, elapsed: number | null): void {
  if (elapsed === null || elapsed > DURATION) {
    mesh.visible = false;
    return;
  }
  const p = elapsed / DURATION;
  mesh.visible = true;
  mesh.scale.setScalar(MAX_RADIUS * Math.sin(Math.PI * p));
}

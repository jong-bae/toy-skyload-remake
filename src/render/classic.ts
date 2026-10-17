// 클래식 화면: 원작 유사 3D 투영과 면별 단색 음영으로 원작 느낌을 재현한다
import * as THREE from 'three';
import type { Level } from '../level/types';
import { createExplosion, updateExplosion } from './explosion';
import { classicMaterial } from './material';
import { SHIP_CAMERA_DISTANCE } from './projection';
import { buildRoadGeometry, columnX } from './road';
import { createShip } from './ship';
import type { Frame, View } from './view';

export class ClassicView implements View {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera(); // 투영은 셰이더에서 하므로 위치만 쓴다
  private readonly road: THREE.Mesh;
  private readonly ship: THREE.Group;
  private readonly explosion: THREE.Mesh;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.scene.background = starfield();
    const material = classicMaterial();
    this.road = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.road.frustumCulled = false;
    this.ship = createShip(material);
    this.explosion = createExplosion(material);
    this.scene.add(this.road, this.ship, this.explosion);
  }

  setLevel(level: Level): void {
    this.road.geometry.dispose();
    this.road.geometry = buildRoadGeometry(level);
  }

  render(f: Frame): void {
    this.ship.position.set(columnX(f.x), f.y, -f.z);
    this.ship.visible = f.status !== 'exploded';
    this.explosion.position.copy(this.ship.position);
    updateExplosion(this.explosion, f.status === 'exploded' ? f.timeSinceEnd : null);
    this.camera.position.z = -(f.z - SHIP_CAMERA_DISTANCE);
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {}
}

/** 화면에 고정된 별 배경 (원작 배경도 움직이지 않는 그림) */
function starfield(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#05040f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) {
    const v = 120 + Math.floor(rand() * 135);
    ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 30)})`;
    ctx.fillRect(Math.floor(rand() * canvas.width), Math.floor(rand() * canvas.height), rand() < 0.1 ? 2 : 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

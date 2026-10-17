// 현대식 화면: 원근 카메라, 조명, 네온 외곽선, 블룸, 파티클, 움직이는 우주 배경
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Level } from '../level/types';
import { Particles } from './particles';
import { buildRoadGeometry, columnX } from './road';
import { createShip } from './ship';
import type { Frame, View } from './view';

/** 타일 1칸의 월드 길이 (h). 원작 투영처럼 길쭉해 보이도록 늘린다 */
const TILE_DEPTH = 1.6;
/** 네온 외곽선. 1보다 큰 HDR 색이라 블룸이 확실히 걸린다 */
const NEON = new THREE.Color(0x6fe8ff).multiplyScalar(2.2);
const SKY = 0x05030f;
const ENGINE = new THREE.Color(0.7, 0.3, 0.06);
const FIRE = [new THREE.Color(1, 0.85, 0.3), new THREE.Color(1, 0.4, 0.05), new THREE.Color(0.9, 0.1, 0.05)];

export class ModernView implements View {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 4 / 3, 0.05, 220);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly world = new THREE.Group(); // 도로 (전진 방향을 TILE_DEPTH배로 늘림)
  private readonly road: THREE.Mesh;
  private readonly edges: THREE.LineSegments;
  private readonly ship: THREE.Group;
  private readonly engineLight = new THREE.PointLight(0xff7a30, 1, 1.4);
  private readonly flash = new THREE.PointLight(0xffa040, 0, 8);
  private readonly sparks = new Particles(1200, 0.035);
  private readonly sky = new THREE.Group(); // 카메라를 따라다니는 별·성운 (무한히 먼 배경)
  private lastStatus: Frame['status'] = 'alive';
  private emitCarry = 0;

  constructor(renderer: THREE.WebGLRenderer) {
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 20, 70);

    this.scene.add(new THREE.HemisphereLight(0x9ab8ff, 0x1a0a2a, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(-3, 6, 4);
    this.scene.add(sun);

    const roadMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7, metalness: 0.25 });
    this.road = new THREE.Mesh(new THREE.BufferGeometry(), roadMat);
    this.edges = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: NEON }),
    );
    this.world.scale.z = TILE_DEPTH;
    this.world.add(this.road, this.edges);
    this.scene.add(this.world);

    this.ship = createShip(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.4, metalness: 0.5 }));
    this.ship.scale.z = TILE_DEPTH;
    this.engineLight.position.set(0, 0.08, 0.15);
    this.ship.add(this.engineLight);
    this.scene.add(this.ship, this.flash, this.sparks.points, this.sky);
    buildSky(this.sky);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 192), 0.9, 0.45, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setLevel(level: Level): void {
    const geo = buildRoadGeometry(level);
    this.road.geometry.dispose();
    this.edges.geometry.dispose();
    this.road.geometry = geo;
    this.edges.geometry = new THREE.EdgesGeometry(geo, 25);
    this.sparks.clear();
    this.lastStatus = 'alive';
  }

  render(f: Frame): void {
    const shipX = columnX(f.x);
    const shipZ = -f.z * TILE_DEPTH;
    this.ship.position.set(shipX, f.y, shipZ);
    this.ship.visible = f.status !== 'exploded';

    // 카메라: 뒤에서 살짝 위. 계기판이 화면 아래 35%를 덮으므로 우주선을 화면 중간(원작 y=100/200)에 둔다.
    // 좌우는 절반만 따라가고, 빠를수록 화각을 넓혀 속도감을 준다
    this.camera.fov = 58 + f.speedLevel * 0.35;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(shipX * 0.5, 0.95 + f.y * 0.5, shipZ + 2.4);
    this.camera.lookAt(shipX * 0.8, f.y * 0.6 - 0.05, shipZ - 0.4);
    this.sky.position.copy(this.camera.position);

    this.emitEngine(f, shipX, shipZ);
    if (f.status === 'exploded' && this.lastStatus !== 'exploded') this.explode(shipX, f.y, shipZ);
    this.lastStatus = f.status;
    this.flash.intensity = Math.max(0, this.flash.intensity - f.dt * 30);
    this.sparks.update(f.dt, 3);
    this.sky.rotation.z += f.dt * 0.004;

    this.composer.render(f.dt);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
    this.bloom.setSize(Math.floor(width / 2), Math.floor(height / 2)); // 블룸은 절반 해상도로 충분하다
  }

  /** 엔진 분사: 속도에 비례해 두 엔진에서 불꽃을 뒤로 흘린다 */
  private emitEngine(f: Frame, shipX: number, shipZ: number): void {
    this.engineLight.intensity = f.status === 'alive' ? 0.4 + f.speedLevel * 0.03 : 0;
    if (f.status !== 'alive' || f.speedLevel < 0.5) return;
    this.emitCarry += (10 + f.speedLevel * 2) * f.dt;
    const v = new THREE.Vector3();
    while (this.emitCarry >= 1) {
      this.emitCarry -= 1;
      for (const side of [-1, 1]) {
        v.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.3) * 0.3, 3 + Math.random() * 2);
        this.sparks.emit({ x: shipX + side * 0.09, y: f.y + 0.06, z: shipZ + 0.12 }, v, ENGINE, 0.08 + Math.random() * 0.08);
      }
    }
  }

  private explode(x: number, y: number, z: number): void {
    const v = new THREE.Vector3();
    for (let i = 0; i < 260; i++) {
      v.randomDirection().multiplyScalar(0.8 + Math.random() * 3.2);
      v.y = Math.abs(v.y) * 0.8 + 0.5;
      this.sparks.emit({ x, y: y + 0.1, z }, v, FIRE[i % FIRE.length], 0.6 + Math.random() * 0.9);
    }
    this.flash.position.set(x, y + 0.4, z);
    this.flash.intensity = 10;
  }
}

/** 멀리 있는 별과 성운. 카메라를 따라다녀 무한히 먼 곳처럼 보인다 */
function buildSky(group: THREE.Group): void {
  const n = 1800;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.randomDirection().multiplyScalar(150);
    pos.set([v.x, Math.abs(v.y) * 0.9 + 2, v.z], i * 3);
    const b = 0.5 + Math.random() * 0.5;
    col.set([b, b, Math.min(1, b + 0.2)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(
    new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, fog: false, sizeAttenuation: true })),
  );

  const nebulae: [number, number, number, number, string][] = [
    [-60, 35, -120, 110, '#7a2aa8'],
    [70, 50, -130, 130, '#1f4fb8'],
    [10, 20, -140, 90, '#b8336a'],
  ];
  for (const [x, y, z, size, color] of nebulae) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(color), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55, transparent: true }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    group.add(sprite);
  }
}

function glowTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

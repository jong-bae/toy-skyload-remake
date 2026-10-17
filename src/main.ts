// 앱 진입점: 테스트 레벨을 원작 투영으로 렌더링하고 키보드로 플레이한다 (실패 시 자동 재시작)
import * as THREE from 'three';
import testLevel from '../levels/test-01.json';
import { Session } from './core/session';
import type { ShipStatus } from './core/simulation';
import { Keyboard } from './input/keyboard';
import { parseLevel } from './level/parse';
import { createExplosion, updateExplosion } from './render/explosion';
import { classicMaterial } from './render/material';
import { SHIP_CAMERA_DISTANCE } from './render/projection';
import { buildRoadGeometry, columnX } from './render/road';
import { createShip } from './render/ship';

const ASPECT = 4 / 3; // 원작 320×200을 4:3 모니터에 표시하던 비율

const level = parseLevel(testLevel);
const keyboard = new Keyboard(window);
const session = new Session(level);

const END_MESSAGES: Record<Exclude<ShipStatus, 'alive'>, string> = {
  cleared: '클리어! Enter: 다시 하기',
  exploded: '폭발',
  fell: '추락',
  noFuel: '연료가 바닥났다',
  noOxygen: '산소가 바닥났다',
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const hud = document.createElement('div');
hud.id = 'hud';
document.body.appendChild(hud);
const fadeLayer = document.createElement('div');
fadeLayer.id = 'fade';
document.body.appendChild(fadeLayer);

const scene = new THREE.Scene();
scene.background = starfield();
const camera = new THREE.Camera(); // 투영은 셰이더에서 하므로 위치만 쓴다

const material = classicMaterial();
const road = new THREE.Mesh(buildRoadGeometry(level), material);
road.frustumCulled = false;
scene.add(road);
const ship = createShip(material);
scene.add(ship);
const explosion = createExplosion(material);
scene.add(explosion);

function fit() {
  const w = Math.min(window.innerWidth, window.innerHeight * ASPECT);
  renderer.setSize(Math.floor(w), Math.floor(w / ASPECT));
}
window.addEventListener('resize', fit);
fit();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  // 두 키 모두 매 프레임 소비해서, 플레이 중 누른 Enter가 끝난 뒤에 뒤늦게 반영되지 않게 한다
  const pressedR = keyboard.consume('KeyR');
  const pressedEnter = keyboard.consume('Enter');
  if (pressedR || (pressedEnter && session.sim.state.status !== 'alive')) session.restart();
  const alpha = session.update(dt, keyboard.input());

  const a = session.sim.previous;
  const b = session.sim.state;
  const lerp = (p: number, q: number) => p + (q - p) * alpha;
  const z = lerp(a.z, b.z);
  ship.position.set(columnX(lerp(a.x, b.x)), lerp(a.y, b.y), -z);
  ship.visible = b.status !== 'exploded';
  explosion.position.copy(ship.position);
  updateExplosion(explosion, b.status === 'exploded' ? session.timeSinceEnd : null);
  camera.position.z = -(z - SHIP_CAMERA_DISTANCE);

  const pct = (v: number, max: number) => Math.max(0, Math.ceil((v / max) * 100));
  hud.textContent =
    b.status === 'alive'
      ? `속도 ${Math.floor(b.speedLevel)} · 연료 ${pct(b.fuel, level.fuel)}% · 산소 ${pct(b.oxygen, level.oxygen)}%`
      : END_MESSAGES[b.status];
  fadeLayer.style.opacity = String(session.fade());
  renderer.render(scene, camera);
});

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

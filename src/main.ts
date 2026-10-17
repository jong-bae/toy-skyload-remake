// 앱 진입점: 타이틀 → 스테이지 선택 → 플레이 흐름을 관리하고 원작 투영으로 렌더링한다
import * as THREE from 'three';
import { Session } from './core/session';
import type { ShipStatus } from './core/simulation';
import { Keyboard } from './input/keyboard';
import { STAGES } from './level/catalog';
import type { Level } from './level/types';
import { createExplosion, updateExplosion } from './render/explosion';
import { classicMaterial } from './render/material';
import { SHIP_CAMERA_DISTANCE } from './render/projection';
import { buildRoadGeometry, columnX } from './render/road';
import { createShip } from './render/ship';
import { Dashboard, dashboardValues } from './ui/dashboard';
import { Menu, moveCursor, SELECT_COLUMNS } from './ui/menu';
import { Progress } from './ui/progress';

const ASPECT = 4 / 3; // 원작 320×200을 4:3 모니터에 표시하던 비율
const TITLE_ITEMS = ['시작', '조작법'];

const END_MESSAGES: Record<Exclude<ShipStatus, 'alive' | 'cleared'>, string> = {
  exploded: '폭발',
  fell: '추락',
  noFuel: '연료가 바닥났다',
  noOxygen: '산소가 바닥났다',
};

type Mode = 'title' | 'controls' | 'select' | 'play';

const keyboard = new Keyboard(window);
const progress = Progress.fromBrowser();

// 3D 화면과 계기판을 같은 크기로 겹치는 4:3 영역
const screen = document.createElement('div');
screen.id = 'screen';
document.body.appendChild(screen);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
screen.appendChild(renderer.domElement);
const dashCanvas = document.createElement('canvas');
dashCanvas.id = 'dash';
screen.appendChild(dashCanvas);
const dashboard = new Dashboard(dashCanvas);

const hud = document.createElement('div');
hud.id = 'hud';
screen.appendChild(hud);
const fadeLayer = document.createElement('div');
fadeLayer.id = 'fade';
document.body.appendChild(fadeLayer);
const menuLayer = document.createElement('div');
document.body.appendChild(menuLayer);
const menu = new Menu(menuLayer);

const scene = new THREE.Scene();
scene.background = starfield();
const camera = new THREE.Camera(); // 투영은 셰이더에서 하므로 위치만 쓴다

const material = classicMaterial();
const road = new THREE.Mesh(new THREE.BufferGeometry(), material);
road.frustumCulled = false;
scene.add(road);
const ship = createShip(material);
scene.add(ship);
const explosion = createExplosion(material);
scene.add(explosion);

let mode: Mode = 'title';
let titleIndex = 0;
let stageIndex = 0;
let session = loadStage(0);

function loadStage(i: number): Session {
  stageIndex = i;
  road.geometry.dispose();
  road.geometry = buildRoadGeometry(STAGES[i]);
  return new Session(STAGES[i]);
}

function showTitle() {
  mode = 'title';
  menu.showTitle(TITLE_ITEMS, titleIndex);
}

function showSelect() {
  mode = 'select';
  if (session.sim.state.status !== 'alive' || session.sim.state.time > 0) session = loadStage(stageIndex);
  menu.showSelect(
    STAGES.map((s: Level, i) => ({ name: s.name, gravity: s.gravity, cleared: progress.has(i) })),
    stageIndex,
  );
}

function selectStage(i: number) {
  if (i !== stageIndex) session = loadStage(i);
  showSelect();
}

function play(i: number) {
  session = loadStage(i);
  mode = 'play';
  menu.hide();
}

function activateTitle() {
  if (titleIndex === 0) showSelect();
  else {
    mode = 'controls';
    menu.showControls();
  }
}

menu.onPick = (i) => {
  if (mode === 'title') {
    titleIndex = i;
    activateTitle();
  } else if (mode === 'controls') showTitle();
  else if (mode === 'select') play(i);
};

function handleMenuKeys() {
  const up = keyboard.consume('ArrowUp');
  const down = keyboard.consume('ArrowDown');
  const left = keyboard.consume('ArrowLeft');
  const right = keyboard.consume('ArrowRight');
  const enter = keyboard.consume('Enter');
  const esc = keyboard.consume('Escape');
  if (mode === 'title') {
    const next = moveCursor(titleIndex, Number(down) - Number(up), TITLE_ITEMS.length);
    if (next !== titleIndex) {
      titleIndex = next;
      showTitle();
    }
    if (enter) activateTitle();
  } else if (mode === 'controls') {
    if (enter || esc) showTitle();
  } else if (mode === 'select') {
    const delta = (Number(right) - Number(left)) + SELECT_COLUMNS * (Number(down) - Number(up));
    const next = moveCursor(stageIndex, delta, STAGES.length);
    if (next !== stageIndex) selectStage(next);
    if (enter) play(stageIndex);
    else if (esc) showTitle();
  }
}

function handlePlayKeys() {
  // 키를 매 프레임 소비해서, 플레이 중 누른 Enter가 끝난 뒤에 뒤늦게 반영되지 않게 한다
  const pressedR = keyboard.consume('KeyR');
  const pressedEnter = keyboard.consume('Enter');
  const pressedEsc = keyboard.consume('Escape');
  for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) keyboard.consume(code);
  const status = session.sim.state.status;
  if (pressedEsc) showSelect();
  else if (status === 'cleared' && pressedEnter) {
    if (stageIndex + 1 < STAGES.length) play(stageIndex + 1);
    else showSelect();
  } else if (pressedR || (pressedEnter && status !== 'alive')) session.restart();
}

function fit() {
  const w = Math.floor(Math.min(window.innerWidth, window.innerHeight * ASPECT));
  const h = Math.floor(w / ASPECT);
  renderer.setSize(w, h);
  screen.style.width = `${w}px`;
  screen.style.height = `${h}px`;
}
window.addEventListener('resize', fit);
fit();
showTitle();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  let alpha = 1;
  if (mode === 'play') {
    handlePlayKeys();
    alpha = session.update(dt, keyboard.input());
    if (session.sim.state.status === 'cleared' && !progress.has(stageIndex)) progress.mark(stageIndex);
  } else {
    handleMenuKeys();
  }

  const a = session.sim.previous;
  const b = session.sim.state;
  const lerp = (p: number, q: number) => p + (q - p) * alpha;
  const z = lerp(a.z, b.z);
  ship.position.set(columnX(lerp(a.x, b.x)), lerp(a.y, b.y), -z);
  ship.visible = b.status !== 'exploded';
  explosion.position.copy(ship.position);
  updateExplosion(explosion, b.status === 'exploded' ? session.timeSinceEnd : null);
  camera.position.z = -(z - SHIP_CAMERA_DISTANCE);

  dashCanvas.hidden = mode !== 'play';
  if (mode === 'play') dashboard.draw(dashboardValues(b, session.level));
  hud.hidden = mode !== 'play';
  hud.textContent =
    b.status === 'alive'
      ? `${stageIndex + 1}. ${session.level.name}`
      : b.status === 'cleared'
        ? `클리어! Enter: ${stageIndex + 1 < STAGES.length ? '다음 스테이지' : '스테이지 선택'} · Esc: 스테이지 선택`
        : END_MESSAGES[b.status];
  fadeLayer.style.opacity = String(mode === 'play' ? session.fade() : 0);
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

// 앱 진입점: 타이틀 → 스테이지 선택 → 플레이 흐름을 관리하고 선택한 화면 모드로 렌더링한다
import * as THREE from 'three';
import { detectEvents } from './audio/events';
import { Sfx } from './audio/sfx';
import { Session } from './core/session';
import type { ShipStatus } from './core/simulation';
import { Keyboard } from './input/keyboard';
import { STAGES } from './level/catalog';
import type { Level } from './level/types';
import { ClassicView } from './render/classic';
import type { View } from './render/view';
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
const sfx = new Sfx();
window.addEventListener('keydown', () => sfx.unlock());
window.addEventListener('pointerdown', () => sfx.unlock());

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

const view: View = new ClassicView(renderer);

let mode: Mode = 'title';
let titleIndex = 0;
let stageIndex = 0;
let session = loadStage(0);

function loadStage(i: number): Session {
  stageIndex = i;
  view.setLevel(STAGES[i]);
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
  sfx.ui('select');
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
      sfx.ui('move');
      showTitle();
    }
    if (enter) {
      sfx.ui('select');
      activateTitle();
    }
  } else if (mode === 'controls') {
    if (enter || esc) showTitle();
  } else if (mode === 'select') {
    const delta = Number(right) - Number(left) + SELECT_COLUMNS * (Number(down) - Number(up));
    const next = moveCursor(stageIndex, delta, STAGES.length);
    if (next !== stageIndex) {
      sfx.ui('move');
      selectStage(next);
    }
    if (enter) {
      sfx.ui('select');
      play(stageIndex);
    } else if (esc) showTitle();
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
  view.resize(w, h);
  screen.style.width = `${w}px`;
  screen.style.height = `${h}px`;
}
window.addEventListener('resize', fit);
fit();
showTitle();

let last = performance.now();
// 효과음 이벤트는 같은 판 안에서만 비교한다 (재시작하면 연료가 차서 보급으로 오인할 수 있다)
let lastSim = session.sim;
let lastState = session.sim.state;
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  let alpha = 1;
  if (mode === 'play') {
    handlePlayKeys();
    alpha = session.update(dt, keyboard.input());
    if (session.sim.state.status === 'cleared' && !progress.has(stageIndex)) progress.mark(stageIndex);
    if (session.sim === lastSim) detectEvents(lastState, session.sim.state).forEach((e) => sfx.event(e));
  } else {
    handleMenuKeys();
  }
  lastSim = session.sim;
  lastState = session.sim.state;
  sfx.engine(mode === 'play' && session.sim.state.status === 'alive' ? session.sim.state.speedLevel : null);

  const a = session.sim.previous;
  const b = session.sim.state;
  const lerp = (p: number, q: number) => p + (q - p) * alpha;
  view.render({
    x: lerp(a.x, b.x),
    y: lerp(a.y, b.y),
    z: lerp(a.z, b.z),
    speedLevel: b.speedLevel,
    status: b.status,
    timeSinceEnd: session.timeSinceEnd,
    dt,
  });

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
});

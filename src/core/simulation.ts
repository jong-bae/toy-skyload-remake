// 고정 시간 간격으로 우주선 상태를 갱신하는 결정론적 게임 루프
import {
  BOOST_FACTOR,
  BOUNCE_MIN_IMPACT,
  BOUNCE_RATIO,
  EXPLODE_SPEED_LEVEL,
  FALL_DEATH_Y,
  FIXED_DT,
  JUMP_REPEAT_DELAY,
  ROAD_COLUMNS,
  SHIP_LENGTH,
  SPEED_LEVEL_MAX,
  SPEED_LEVEL_STEP_TIME,
  STEP_TOLERANCE,
  STICKY_FACTOR,
} from './config';
import { blockingCells, stopBefore, stopBeside, supportHeight, tileUnder } from './collision';
import { forwardSpeed, gravityAccel, jumpVelocity, lateralSpeed } from './physics';
import type { Level } from '../level/types';

export interface Input {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

export type ShipStatus = 'alive' | 'cleared' | 'exploded' | 'fell' | 'noFuel' | 'noOxygen';

export interface ShipState {
  /** 좌우 위치 (칸, 도로 왼쪽 끝 = 0) */
  x: number;
  /** 높이 (h) */
  y: number;
  /** 전진 위치 (타일) */
  z: number;
  /** 속도 단계 (0 ~ SPEED_LEVEL_MAX, 연속값) */
  speedLevel: number;
  /** 수직 속도 (h/s, 위가 +) */
  vy: number;
  grounded: boolean;
  /** 이번 착지 후 땅에 닿아 있던 시간 */
  groundTime: number;
  /** 남은 연료 (주행 가능한 타일 수) */
  fuel: number;
  /** 남은 산소 (초) */
  oxygen: number;
  status: ShipStatus;
  /** 경과 시간 (초) */
  time: number;
}

export const NO_INPUT: Input = { accelerate: false, brake: false, left: false, right: false, jump: false };

export function initialState(level: Level): ShipState {
  return {
    x: ROAD_COLUMNS / 2,
    y: 0,
    z: 0.5,
    speedLevel: 0,
    vy: 0,
    grounded: true,
    groundTime: Infinity,
    fuel: level.fuel,
    oxygen: level.oxygen,
    status: 'alive',
    time: 0,
  };
}

/** 한 스텝 진행한 새 상태를 돌려준다. 입력 상태는 바꾸지 않는다. */
export function step(prev: ShipState, input: Input, level: Level, dt: number = FIXED_DT): ShipState {
  if (prev.status !== 'alive') return prev;
  const s: ShipState = { ...prev, time: prev.time + dt };

  // 딛고 있는 특수 블록
  const tile = s.grounded ? tileUnder(level, s.x, s.z, s.y) : null;

  // 속도 단계: 가속·감속 모두 같은 비율, 자연 감속 없음. Boost·Sticky는 저절로 가속·감속
  let dir = Number(input.accelerate) - Number(input.brake);
  if (tile?.type === 'boost') dir += BOOST_FACTOR;
  if (tile?.type === 'sticky') dir -= STICKY_FACTOR;
  s.speedLevel = Math.min(SPEED_LEVEL_MAX, Math.max(0, s.speedLevel + (dir * dt) / SPEED_LEVEL_STEP_TIME));

  // 전진과 정면 충돌
  const z = s.z + forwardSpeed(s.speedLevel) * dt;
  const front = blockingCells(level, s.x, z, s.y);
  if (front.length > 0) {
    if (s.speedLevel >= EXPLODE_SPEED_LEVEL) {
      s.status = 'exploded';
      return s;
    }
    s.z = Math.max(s.z, stopBefore(front));
    s.speedLevel = 0;
  } else {
    s.z = z;
  }
  s.fuel -= s.z - prev.z; // 연료는 주행 거리만큼 소모 (정지 중에는 줄지 않음)

  // 좌우 이동과 측면 충돌 (관성 없음). Slippery 위에서는 조종할 수 없다
  const side = Number(input.right) - Number(input.left);
  if (side !== 0 && tile?.type !== 'slippery') {
    const x = s.x + side * lateralSpeed(s.speedLevel) * dt;
    const block = blockingCells(level, x, s.z, s.y);
    s.x = block.length > 0 ? stopBeside(block, side > 0) : x;
  }

  // 수직: 받침, 점프, 중력, 착지
  const support = supportHeight(level, s.x, s.z);
  if (s.grounded && (support === null || support < s.y - STEP_TOLERANCE)) {
    s.grounded = false;
    s.vy = 0;
  }

  if (s.grounded) {
    s.y = support ?? s.y;
    s.groundTime += dt;
    const inTunnel = tileUnder(level, s.x, s.z, s.y)?.tunnel === true;
    if (input.jump && !inTunnel && s.groundTime >= JUMP_REPEAT_DELAY) {
      s.grounded = false;
      s.vy = jumpVelocity(level.gravity);
    }
  }

  if (!s.grounded) {
    const prevY = s.y;
    const g = gravityAccel(level.gravity);
    s.y += s.vy * dt - 0.5 * g * dt * dt; // 등가속 정확해 (오일러 적분은 높이를 깎는다)
    s.vy -= g * dt;
    if (s.vy <= 0 && support !== null && s.y <= support && prevY >= support - STEP_TOLERANCE) {
      const impact = -s.vy;
      s.y = support;
      if (!input.jump && impact > BOUNCE_MIN_IMPACT) {
        s.vy = impact * BOUNCE_RATIO;
      } else {
        s.vy = 0;
        s.grounded = true;
        s.groundTime = 0;
      }
    }
    if (s.y < FALL_DEATH_Y) s.status = 'fell';
  }

  // 닿은 블록 효과
  if (s.grounded) {
    const touched = tileUnder(level, s.x, s.z, s.y);
    if (touched?.type === 'burning') s.status = 'exploded';
    if (touched?.type === 'supplies') {
      s.fuel = level.fuel;
      s.oxygen = level.oxygen;
    }
  }

  s.oxygen -= dt;
  if (s.status === 'alive') {
    if (s.oxygen <= 0) s.status = 'noOxygen';
    else if (s.fuel <= 0) s.status = 'noFuel';
    else if (s.z + SHIP_LENGTH / 2 >= level.rows.length) s.status = 'cleared';
  }
  return s;
}

/** 실제 경과 시간을 고정 간격 스텝으로 나눠 진행한다. 렌더링 보간용으로 직전 상태를 보관한다. */
export class Simulation {
  state: ShipState;
  previous: ShipState;
  private accumulator = 0;

  constructor(readonly level: Level) {
    this.state = initialState(level);
    this.previous = this.state;
  }

  /** @returns 직전 상태와 현재 상태 사이 보간 비율 (0~1) */
  advance(realDt: number, input: Input): number {
    this.accumulator += realDt;
    while (this.accumulator >= FIXED_DT) {
      this.previous = this.state;
      this.state = step(this.state, input, this.level);
      this.accumulator -= FIXED_DT;
    }
    return this.accumulator / FIXED_DT;
  }
}

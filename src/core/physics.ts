// 측정 표로 속도 단계·중력값을 실제 이동 속도로 바꾸는 함수
import { GRAVITY_TABLE, JUMP_VELOCITY_TABLE, LATERAL_TABLE, SPEED_TABLE } from './config';

/** 표를 선형 보간한다. 범위 밖은 양 끝 구간을 연장한다. */
export function interpolate(table: readonly (readonly [number, number])[], x: number): number {
  let i = 1;
  while (i < table.length - 1 && x > table[i][0]) i++;
  const [x0, y0] = table[i - 1];
  const [x1, y1] = table[i];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** 속도 단계 → 전진 속도 (타일/초) */
export function forwardSpeed(level: number): number {
  return Math.max(0, interpolate(SPEED_TABLE, level));
}

/** 속도 단계 → 좌우 이동 속도 (칸/초) */
export function lateralSpeed(level: number): number {
  return interpolate(LATERAL_TABLE, level);
}

/** GRAV-O-METER 표시값 → 중력 가속도 (h/s²) */
export function gravityAccel(gravity: number): number {
  return interpolate(GRAVITY_TABLE, gravity);
}

/** GRAV-O-METER 표시값 → 점프 초기 속도 (h/s) */
export function jumpVelocity(gravity: number): number {
  return interpolate(JUMP_VELOCITY_TABLE, gravity);
}

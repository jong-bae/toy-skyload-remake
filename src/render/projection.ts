// 원작의 유사 3D 화면 투영(docs/measurements.md 2장)을 재현하는 공식과 셰이더 코드
/*
 * 원작 320×200 화면 기준
 *   지면 행     y_g(d) = 8 + K / d          (d = 카메라에서 전진 거리, 타일)
 *   배율        S(d)   = y_g(d) - 32        (1h가 차지하는 픽셀, 32에서 0으로 수렴)
 *   화면 x      = 159.5 + X · S             (X = 좌우 위치, h)
 *   화면 y      = y_g - H · S               (H = 높이, h)
 * 표준 원근이 아니라서 삼각형 내부가 곡선으로 휘므로 메시는 전진 방향으로 잘게 나눈다.
 */

export const SCREEN_W = 320;
export const SCREEN_H = 200;
export const CENTER_X = 159.5;
export const LATERAL_HORIZON = 32;
export const DEPTH_ORIGIN = 8;
/** 타일 1칸 = Δ(1/(y - 8)) 0.00396 */
export const DEPTH_K = 1 / 0.00396;
/** 우주선 접지 행(y = 100)까지의 카메라 거리 (타일) */
export const SHIP_CAMERA_DISTANCE = DEPTH_K / (100 - DEPTH_ORIGIN);
/** 노면이 한 점으로 모이는 거리 = 그릴 수 있는 최대 거리 (타일) */
export const DRAW_DISTANCE = DEPTH_K / (LATERAL_HORIZON - DEPTH_ORIGIN);
/** 이보다 가까운 지오메트리는 화면 아래로 벗어나므로 잘라낸다 */
export const NEAR_DISTANCE = 0.5;
/** 칸 1개의 폭 (h) */
export const COLUMN_WIDTH = 2 / 3;

/** 카메라 기준 좌표 → 원작 화면 좌표 (픽셀) */
export function projectClassic(x: number, h: number, d: number): { sx: number; sy: number } {
  const yg = DEPTH_ORIGIN + DEPTH_K / d;
  const scale = yg - LATERAL_HORIZON;
  return { sx: CENTER_X + x * scale, sy: yg - h * scale };
}

const f = (n: number) => n.toFixed(6);

/** 카메라 공간 좌표(x = 좌우 h, y = 높이 h, -z = 전진 타일)를 클립 좌표로 바꾸는 GLSL 함수 */
export const CLASSIC_PROJECT_GLSL = /* glsl */ `
vec4 classicProject(vec3 p) {
  float d = -p.z;
  float dc = max(d, 0.05);
  float yg = ${f(DEPTH_ORIGIN)} + ${f(DEPTH_K)} / dc;
  float scale = yg - ${f(LATERAL_HORIZON)};
  float sx = ${f(CENTER_X)} + p.x * scale;
  float sy = yg - p.y * scale;
  float depth = (d - ${f(NEAR_DISTANCE)}) / ${f(DRAW_DISTANCE - NEAR_DISTANCE)} * 2.0 - 1.0;
  return vec4(sx / ${f(SCREEN_W / 2)} - 1.0, 1.0 - sy / ${f(SCREEN_H / 2)}, depth, 1.0);
}
`;

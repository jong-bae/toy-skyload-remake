// 원작 블랙박스 측정값(docs/measurements.md)에서 가져온 물리 튜닝 상수
// 단위: 전진 z = 타일, 좌우 x = 칸, 높이 y = h(카메라 높이, 1칸 = ⅔h), 시간 = 초

/** 고정 시뮬레이션 간격. 원작 녹화(VGA 70Hz)와 같은 주기라 리플레이 비교가 쉽다 */
export const FIXED_DT = 1 / 70;

export const ROAD_COLUMNS = 7;

// 전진 속도 (M-01~M-03)
export const SPEED_LEVEL_MAX = 33;
/** 가속·감속키를 누르는 동안 1단계가 바뀌는 시간 */
export const SPEED_LEVEL_STEP_TIME = 0.118;
/** [속도 단계, 타일/초]. 33단계는 거듭제곱 맞춤 외삽값 */
export const SPEED_TABLE: readonly (readonly [number, number])[] = [
  [0, 0],
  [6, 1.34],
  [11, 2.27],
  [20, 3.6],
  [33, 5.5],
];

// 좌우 이동 (M-04): [속도 단계, 칸/초], 관성 없음
export const LATERAL_TABLE: readonly (readonly [number, number])[] = [
  [0, 0.57],
  [6, 1.5],
  [11, 2.07],
  [20, 3.0],
  [30, 4.35],
];

// 점프·중력 (M-05): 중력별 포물선 맞춤값. 1700은 터널 출발이라 미측정 → 외삽
/** [GRAV-O-METER 표시값, 중력 가속도 h/s²]. 1700은 600~900 기울기로 외삽 */
export const GRAVITY_TABLE: readonly (readonly [number, number])[] = [
  [100, 9.02],
  [400, 16.14],
  [500, 18.44],
  [600, 22.08],
  [900, 27.12],
  [1700, 40.4],
];
/** [GRAV-O-METER 표시값, 점프 초기 속도 h/s]. 대부분 약 4.8이고 900만 낮다. 1700은 900 값 유지 */
export const JUMP_VELOCITY_TABLE: readonly (readonly [number, number])[] = [
  [100, 4.81],
  [400, 4.79],
  [500, 4.73],
  [600, 4.83],
  [900, 4.47],
  [1700, 4.47],
];
/** 점프키를 누르고 있을 때 착지 후 다시 뛰기까지의 접지 시간 */
export const JUMP_REPEAT_DELAY = 0.07;
/** 점프키를 뗀 채 착지하면 착지 속도의 이 비율로 튕긴다 */
export const BOUNCE_RATIO = 0.44;
/** 착지 속도가 이보다 작으면 튕기지 않는다 (원작은 한 번만 튕김) */
export const BOUNCE_MIN_IMPACT = 2.2;

// 충돌 (M-08, M-09)
/** 이 단계 이상으로 정면 충돌하면 폭발, 미만이면 정지 */
export const EXPLODE_SPEED_LEVEL = 10;
/** 이 높이 차 이하는 막지 않는다 (같은 높이 판정 오차) */
export const STEP_TOLERANCE = 0.02;

// 우주선 크기
/** 몸체 폭 (칸). 몸체가 도로에서 완전히 벗어나야 떨어지는 것과 맞는다 (M-07) */
export const SHIP_WIDTH = 0.64;
/** 몸체 길이 (타일). 원작에서 재지 못한 가정값 */
export const SHIP_LENGTH = 0.5;

// 추락 (M-07)
/** 이 높이 아래로 떨어지면 실패 */
export const FALL_DEATH_Y = -1.5;

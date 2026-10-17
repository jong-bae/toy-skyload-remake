// 화면 모드(클래식·현대식)가 공통으로 구현하는 렌더링 인터페이스
import type { ShipStatus } from '../core/simulation';
import type { Level } from '../level/types';

/** 한 프레임을 그리는 데 필요한 상태. 위치는 시뮬레이션 단위(칸, h, 타일)로 보간된 값 */
export interface Frame {
  x: number;
  y: number;
  z: number;
  speedLevel: number;
  status: ShipStatus;
  /** 실패·클리어 후 경과 시간 */
  timeSinceEnd: number;
  /** 지난 프레임 이후 실제 경과 시간 (초) */
  dt: number;
}

export interface View {
  setLevel(level: Level): void;
  render(frame: Frame): void;
  resize(width: number, height: number): void;
}

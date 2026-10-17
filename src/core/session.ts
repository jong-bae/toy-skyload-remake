// 한 판의 진행 흐름: 실패하면 화면을 어둡게 한 뒤 자동 재시작, 클리어하면 대기
import { FADE_TIME, RESTART_DELAY } from './config';
import { Simulation, type Input } from './simulation';
import type { Level } from '../level/types';

export class Session {
  sim: Simulation;
  /** 실패·클리어 후 경과 시간 (초) */
  timeSinceEnd = 0;

  constructor(readonly level: Level) {
    this.sim = new Simulation(level);
  }

  /** @returns 렌더링 보간 비율 (0~1) */
  update(dt: number, input: Input): number {
    const status = this.sim.state.status;
    if (status === 'alive') return this.sim.advance(dt, input);
    this.timeSinceEnd += dt;
    if (status !== 'cleared' && this.timeSinceEnd >= RESTART_DELAY[status]) this.restart();
    return 1;
  }

  restart(): void {
    this.sim = new Simulation(this.level);
    this.timeSinceEnd = 0;
  }

  /** 화면을 덮는 어둠 (0~1). 실패 후 자동 재시작 직전 FADE_TIME 동안 어두워진다 */
  fade(): number {
    const status = this.sim.state.status;
    if (status === 'alive' || status === 'cleared') return 0;
    const start = RESTART_DELAY[status] - FADE_TIME;
    return Math.min(1, Math.max(0, (this.timeSinceEnd - start) / FADE_TIME));
  }
}

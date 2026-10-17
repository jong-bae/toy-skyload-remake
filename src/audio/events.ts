// 직전 상태와 현재 상태를 비교해 효과음을 낼 게임 이벤트를 뽑는다
import type { ShipState } from '../core/simulation';

export type GameEvent = 'jump' | 'land' | 'bump' | 'supplies' | 'exploded' | 'fell' | 'noFuel' | 'noOxygen' | 'cleared';

export function detectEvents(prev: ShipState, cur: ShipState): GameEvent[] {
  const events: GameEvent[] = [];
  if (prev.status === 'alive' && cur.status !== 'alive') {
    events.push(cur.status);
    return events;
  }
  if (prev.grounded && !cur.grounded && cur.vy > 0) events.push('jump');
  const bounced = !prev.grounded && prev.vy < 0 && cur.vy > 0;
  if ((!prev.grounded && cur.grounded) || bounced) events.push('land');
  if (prev.speedLevel > 1 && cur.speedLevel === 0) events.push('bump'); // 정면으로 막히면 속도가 즉시 0이 된다
  if (cur.fuel > prev.fuel + 1e-6 || cur.oxygen > prev.oxygen + 1e-6) events.push('supplies');
  return events;
}

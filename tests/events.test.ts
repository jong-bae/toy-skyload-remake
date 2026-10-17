// 효과음 이벤트 감지가 실제 시뮬레이션 상태 변화와 맞는지 검증한다
import { describe, expect, it } from 'vitest';
import { detectEvents, type GameEvent } from '../src/audio/events';
import type { ShipState } from '../src/core/simulation';
import { FLAT, makeLevel, repeat, run } from './helpers';

function eventsOf(states: ShipState[]): GameEvent[] {
  return states.slice(1).flatMap((s, i) => detectEvents(states[i], s));
}

describe('효과음 이벤트', () => {
  it('점프하면 jump, 착지와 튕김마다 land', () => {
    const events = eventsOf(run(FLAT, 1.5, (t) => ({ jump: t < 0.05 })));
    expect(events).toEqual(['jump', 'land', 'land']);
  });

  it('벽에 막혀 멈추면 bump', () => {
    const wall = makeLevel([...repeat('_______', 3), ...repeat('#######', 3)]);
    expect(eventsOf(run(wall, 3, {}, { speedLevel: 6 }))).toEqual(['bump']);
  });

  it('보급 블록은 처음 밟을 때 한 번만 supplies', () => {
    const lv = makeLevel([...repeat('_______', 2), ...repeat('SSSSSSS', 6), ...repeat('_______', 20)]);
    expect(eventsOf(run(lv, 4, {}, { speedLevel: 6 })).filter((e) => e === 'supplies')).toHaveLength(1);
  });

  it('폭발하면 exploded 하나만', () => {
    const wall = makeLevel([...repeat('_______', 3), ...repeat('#######', 3)]);
    expect(eventsOf(run(wall, 3, {}, { speedLevel: 20 }))).toEqual(['exploded']);
  });
});

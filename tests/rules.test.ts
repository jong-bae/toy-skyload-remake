// M4 게임 규칙(특수 블록, 연료·산소, 터널, 클리어)을 검증한다
import { describe, expect, it } from 'vitest';
import { BOOST_FACTOR, STICKY_FACTOR, SPEED_LEVEL_STEP_TIME } from '../src/core/config';
import { parseLevel } from '../src/level/parse';
import { last, repeat, run } from './helpers';

const level = (rows: string[], extra: { gravity?: number; fuel?: number; oxygen?: number } = {}) =>
  parseLevel({ name: 'rules', gravity: extra.gravity ?? 500, fuel: extra.fuel, oxygen: extra.oxygen, rows });

describe('특수 블록', () => {
  it('Supplies를 밟으면 연료·산소가 가득 찬다', () => {
    const lv = level(repeat('SSSSSSS', 20), { fuel: 100, oxygen: 50 });
    const s = last(run(lv, 0.1, {}, { fuel: 3, oxygen: 2 }));
    expect(s.fuel).toBe(100);
    expect(s.oxygen).toBeGreaterThan(49.8);
  });

  it('Boost 위에서는 키를 누르지 않아도 가속한다', () => {
    const s = last(run(level(repeat('BBBBBBB', 50)), SPEED_LEVEL_STEP_TIME * 2));
    expect(s.speedLevel).toBeCloseTo((BOOST_FACTOR * s.time) / SPEED_LEVEL_STEP_TIME, 6);
  });

  it('Sticky 위에서는 저절로 감속한다', () => {
    const s = last(run(level(repeat('KKKKKKK', 50)), SPEED_LEVEL_STEP_TIME * 2, {}, { speedLevel: 20 }));
    expect(s.speedLevel).toBeCloseTo(20 - (STICKY_FACTOR * s.time) / SPEED_LEVEL_STEP_TIME, 6);
  });

  it('Slippery 위에서는 좌우로 조종할 수 없다', () => {
    const s = last(run(level(repeat('LLLLLLL', 50)), 0.5, { right: true }));
    expect(s.x).toBe(3.5);
  });

  it('Burning에 닿으면 폭발한다', () => {
    const s = last(run(level([...repeat('_______', 2), ...repeat('RRRRRRR', 5)]), 3, {}, { speedLevel: 6 }));
    expect(s.status).toBe('exploded');
  });

  it('Burning 위로 뛰어넘으면 괜찮다', () => {
    // 20단계(3.6타일/초)로 중심이 z≈2.6일 때 뛰면 체공 1.85타일 → 중심이 줄 4에 착지
    const lv = level([...repeat('_______', 3), 'RRRRRRR', ...repeat('_______', 20)]);
    const s = last(run(lv, 2, (t) => ({ jump: t > 0.58 && t < 0.63 }), { speedLevel: 20 }));
    expect(s.status).toBe('alive');
  });
});

describe('연료·산소', () => {
  it('산소는 시간에 따라 줄고 다 떨어지면 실패한다', () => {
    const s = last(run(level(repeat('_______', 20), { oxygen: 1 }), 1.2));
    expect(s.status).toBe('noOxygen');
  });

  it('연료는 정지 중에는 줄지 않는다', () => {
    const s = last(run(level(repeat('_______', 20), { fuel: 5 }), 3));
    expect(s.fuel).toBe(5);
  });

  it('연료는 주행 거리만큼 줄고 다 떨어지면 실패한다', () => {
    const s = last(run(level(repeat('_______', 50), { fuel: 2 }), 3, {}, { speedLevel: 6 }));
    expect(s.status).toBe('noFuel');
    expect(s.z - 0.5).toBeCloseTo(2, 1);
  });
});

describe('터널', () => {
  it('터널 안에서는 점프할 수 없다', () => {
    const states = run(level(repeat('TTTTTTT', 20)), 1, { jump: true });
    expect(states.every((s) => s.grounded)).toBe(true);
  });

  it('지붕보다 높이 뛴 채로 들어가면 부딪힌다', () => {
    const lv = level([...repeat('_______', 2), ...repeat('TTTTTTT', 20)], { gravity: 100 });
    const s = last(run(lv, 2, (t) => ({ jump: t < 0.05 }), { speedLevel: 11 }));
    expect(s.status).toBe('exploded');
  });
});

describe('클리어', () => {
  it('마지막 줄 끝에 닿으면 클리어', () => {
    const states = run(level(repeat('_______', 5)), 5, {}, { speedLevel: 6 });
    expect(last(states).status).toBe('cleared');
    expect(states.some((s) => s.status === 'fell')).toBe(false);
  });
});

// 코어 물리가 원작 측정값(docs/measurements.md)을 ±10% 안에서 재현하는지 검증한다
import { describe, expect, it } from 'vitest';
import { FIXED_DT, SHIP_WIDTH } from '../src/core/config';
import { Simulation, initialState } from '../src/core/simulation';
import { BLOCK_HEIGHT } from '../src/level/parse';
import { FLAT, last, makeLevel, near, repeat, run } from './helpers';

/** 착지 전까지의 체공 시간과 최고 높이 */
function jumpStats(states: { y: number; grounded: boolean; time: number }[]) {
  const t0 = states.findIndex((s) => !s.grounded);
  const t1 = states.findIndex((s, i) => i > t0 && s.y <= 0);
  const peak = Math.max(...states.slice(t0, t1).map((s) => s.y));
  return { airtime: (t1 - t0) * FIXED_DT, peak };
}

describe('전진 속도 (M-01~M-03)', () => {
  it('가속키를 누르면 0.118초마다 1단계씩 올라 약 3.9초에 최대가 된다', () => {
    const states = run(FLAT, 4.2, { accelerate: true });
    const at = (t: number) => states[Math.round(t / FIXED_DT)].speedLevel;
    expect(near(at(1.18), 10)).toBe(true);
    expect(near(at(2.36), 20)).toBe(true);
    expect(at(4.0)).toBe(33);
  });

  it.each([
    [6, 1.34],
    [11, 2.27],
    [20, 3.6],
  ])('%i단계 등속 속도는 %f 타일/초', (level, tilesPerSec) => {
    const states = run(FLAT, 2, {}, { speedLevel: level });
    expect(near((last(states).z - states[0].z) / 2, tilesPerSec)).toBe(true);
  });

  it('키를 떼도 속도가 줄지 않는다', () => {
    const states = run(FLAT, 5, {}, { speedLevel: 6 });
    expect(last(states).speedLevel).toBe(6);
  });

  it('감속키는 가속과 같은 비율로 줄인다', () => {
    const states = run(FLAT, 1.18, { brake: true }, { speedLevel: 20 });
    expect(near(last(states).speedLevel, 10)).toBe(true);
  });
});

describe('좌우 이동 (M-04)', () => {
  const WIDE = makeLevel(repeat('_______', 400));
  it.each([
    [0, 0.57],
    [6, 1.5],
    [11, 2.07],
    [20, 3.0],
    [30, 4.35],
  ])('%i단계에서 좌우 속도는 %f 칸/초', (level, colsPerSec) => {
    const states = run(WIDE, 0.2, { right: true }, { speedLevel: level, x: 3.5 });
    expect(near((last(states).x - 3.5) / 0.2, colsPerSec)).toBe(true);
  });

  it('키를 떼면 바로 멈춘다', () => {
    const states = run(WIDE, 0.5, (t) => ({ right: t < 0.2 }));
    const xAtRelease = states[Math.round(0.2 / FIXED_DT) + 1].x;
    expect(last(states).x).toBeCloseTo(xAtRelease, 6);
  });
});

describe('점프 (M-05)', () => {
  it.each([
    [100, 1.099, 1.265],
    [400, 0.599, 0.691],
    [500, 0.514, 0.588],
    [600, 0.457, 0.515],
    [900, 0.357, 0.368],
  ])('중력 %i: 체공 %f초, 최고 높이 %f h', (gravity, airtime, peak) => {
    const level = makeLevel(repeat('_______', 50), gravity);
    const stats = jumpStats(run(level, 2, (t) => ({ jump: t < 0.05 })));
    expect(near(stats.airtime, airtime)).toBe(true);
    expect(near(stats.peak, peak)).toBe(true);
  });

  it('달리면서 뛰어도 체공 시간이 같다', () => {
    const still = jumpStats(run(FLAT, 2, (t) => ({ jump: t < 0.05 })));
    const moving = jumpStats(run(FLAT, 2, (t) => ({ jump: t < 0.05 }), { speedLevel: 6 }));
    expect(moving.airtime).toBeCloseTo(still.airtime, 6);
  });

  it('점프키를 떼고 착지하면 한 번 작게 튕긴다 (중력 500: 0.12h)', () => {
    const states = run(FLAT, 1.5, (t) => ({ jump: t < 0.05 }));
    const land = states.findIndex((s, i) => i > 5 && s.y === 0);
    const bounce = Math.max(...states.slice(land).map((s) => s.y));
    expect(near(bounce, 0.118, 0.15)).toBe(true);
    expect(last(states).grounded).toBe(true);
  });

  it('점프키를 누르고 있으면 착지하자마자 다시 뛴다', () => {
    const states = run(FLAT, 1.6, { jump: true });
    const takeoffs = states.filter((s, i) => i > 0 && states[i - 1].grounded && !s.grounded).length;
    expect(takeoffs).toBe(3);
  });
});

describe('충돌 (M-08, M-09)', () => {
  // 우주선 앞 3줄 뒤에 도로를 가로막는 벽
  const WALL = makeLevel([...repeat('_______', 3), ...repeat('#######', 3)]);

  it('9단계 이하로 정면 충돌하면 벽 앞에 멈춘다', () => {
    const s = last(run(WALL, 3, {}, { speedLevel: 9 }));
    expect(s.status).toBe('alive');
    expect(s.speedLevel).toBe(0);
    expect(s.z).toBeLessThan(3);
  });

  it('10단계 이상으로 정면 충돌하면 폭발한다', () => {
    expect(last(run(WALL, 3, {}, { speedLevel: 10 })).status).toBe('exploded');
  });

  it('옆 벽으로 이동하면 막힌다', () => {
    const lane = makeLevel(repeat('##___##', 50));
    const s = last(run(lane, 3, { left: true }));
    expect(s.x).toBeCloseTo(2 + SHIP_WIDTH / 2, 3);
    expect(s.status).toBe('alive');
  });

  it('블록 위로 뛰어오를 수 있다', () => {
    const step = makeLevel([...repeat('_______', 2), ...repeat('#######', 20)]);
    // 0.6초에 뛰면 블록 앞(줄 2)에 닿을 때 높이가 블록(0.3h)보다 높다
    const s = last(run(step, 3, (t) => ({ jump: t >= 0.6 && t < 0.66 }), { speedLevel: 6 }));
    expect(s.status).toBe('alive');
    expect(s.y).toBe(BLOCK_HEIGHT);
  });
});

describe('추락 (M-07)', () => {
  const ONE_LANE = makeLevel(repeat('...._..', 50).map((r) => '...' + r.slice(4, 5) + '...'));

  it('몸체가 도로에서 완전히 벗어나야 떨어진다', () => {
    const edge = 0.5 + SHIP_WIDTH / 2; // 중심 이탈 거리 (칸)
    const inside = last(run(ONE_LANE, 0.2, {}, { x: 3.5 + edge - 0.01 }));
    const outside = last(run(ONE_LANE, 0.2, {}, { x: 3.5 + edge + 0.01 }));
    expect(inside.grounded).toBe(true);
    expect(outside.grounded).toBe(false);
  });

  it('구멍으로 떨어지면 실패한다', () => {
    const gap = makeLevel([...repeat('_______', 3), ...repeat('.......', 30)]);
    expect(last(run(gap, 5, {}, { speedLevel: 6 })).status).toBe('fell');
  });
});

describe('고정 스텝 루프', () => {
  it('1초를 진행하면 70스텝을 돈다', () => {
    const sim = new Simulation(FLAT);
    sim.advance(1.0 + 1e-9, { accelerate: false, brake: false, left: false, right: false, jump: false });
    expect(sim.state.time).toBeCloseTo(1.0, 6);
  });

  it('같은 입력이면 같은 결과가 나온다 (결정론)', () => {
    const inputs = (t: number) => ({ accelerate: t < 2, right: t > 1 && t < 1.3, jump: t > 2.5 && t < 2.6 });
    const a = run(FLAT, 4, inputs);
    const b = run(FLAT, 4, inputs);
    expect(last(a)).toEqual(last(b));
    expect(last(a)).not.toEqual(initialState(FLAT));
  });
});

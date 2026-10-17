// 클리어 기록 저장과 메뉴 커서 이동을 검증한다
import { describe, expect, it } from 'vitest';
import { initialState } from '../src/core/simulation';
import { parseLevel } from '../src/level/parse';
import { dashboardValues } from '../src/ui/dashboard';
import { moveCursor } from '../src/ui/menu';
import { Progress } from '../src/ui/progress';

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe('클리어 기록', () => {
  it('저장했다가 다시 불러온다', () => {
    const store = memoryStore();
    new Progress(store).mark(3);
    expect(new Progress(store).has(3)).toBe(true);
    expect(new Progress(store).has(2)).toBe(false);
  });

  it('깨진 값이 저장돼 있으면 빈 기록으로 시작한다', () => {
    expect(new Progress(memoryStore({ 'skyload.cleared': '{깨짐' })).has(0)).toBe(false);
  });

  it('저장소가 예외를 던져도 이번 실행 동안은 기억한다', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const p = new Progress(broken);
    p.mark(1);
    expect(p.has(1)).toBe(true);
  });
});

describe('메뉴 커서', () => {
  it('양 끝에서 멈춘다', () => {
    expect(moveCursor(0, -1, 10)).toBe(0);
    expect(moveCursor(9, 2, 10)).toBe(9);
    expect(moveCursor(4, 2, 10)).toBe(6);
  });
});

describe('계기판 표시값', () => {
  const lv = parseLevel({ name: 't', gravity: 400, fuel: 100, oxygen: 50, rows: ['_______', 'TTTTTTT'] });

  it('속도 칸 수와 연료·산소 비율', () => {
    const v = dashboardValues({ ...initialState(lv), speedLevel: 12.7, fuel: 25, oxygen: 50 }, lv);
    expect(v).toMatchObject({ speedWedges: 12, fuel: 0.25, oxygen: 1, gravity: 400, jump: 'IDLE' });
  });

  it('공중이면 JUMP, 터널 안이면 LOCK', () => {
    expect(dashboardValues({ ...initialState(lv), grounded: false, y: 0.3 }, lv).jump).toBe('JUMP');
    expect(dashboardValues({ ...initialState(lv), z: 1.5 }, lv).jump).toBe('LOCK');
  });

  it('바닥난 값은 0으로 표시한다', () => {
    expect(dashboardValues({ ...initialState(lv), fuel: -3 }, lv).fuel).toBe(0);
  });
});

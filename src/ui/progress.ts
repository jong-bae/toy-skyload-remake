// 클리어한 스테이지 기록을 브라우저 저장소에 보관한다 (저장소를 쓸 수 없으면 이번 실행 동안만 기억)
const KEY = 'skyload.cleared';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export class Progress {
  private cleared = new Set<number>();

  constructor(private readonly store: KeyValueStore | null) {
    try {
      const raw = store?.getItem(KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) list.filter((v) => Number.isInteger(v)).forEach((v) => this.cleared.add(v));
    } catch {
      // 저장소 접근이 막혔거나 값이 깨졌으면 빈 기록으로 시작한다
    }
  }

  /** 브라우저 localStorage를 쓴다. 접근 자체가 막힌 환경이면 메모리에만 기억한다 */
  static fromBrowser(): Progress {
    try {
      return new Progress(window.localStorage);
    } catch {
      return new Progress(null);
    }
  }

  has(stage: number): boolean {
    return this.cleared.has(stage);
  }

  mark(stage: number): void {
    this.cleared.add(stage);
    try {
      this.store?.setItem(KEY, JSON.stringify([...this.cleared].sort((a, b) => a - b)));
    } catch {
      // 저장 실패는 무시한다 (기록은 이번 실행 동안 유지)
    }
  }
}

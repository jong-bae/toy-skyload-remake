// 키보드 상태를 추적해 시뮬레이션 입력으로 바꾼다 (원작 조작: 방향키 + 스페이스)
import type { Input } from '../core/simulation';

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export class Keyboard {
  private held = new Set<string>();
  private pressed = new Set<string>();

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => this.held.clear());
  }

  input(): Input {
    return {
      accelerate: this.held.has('ArrowUp'),
      brake: this.held.has('ArrowDown'),
      left: this.held.has('ArrowLeft'),
      right: this.held.has('ArrowRight'),
      jump: this.held.has('Space'),
    };
  }

  /** 마지막 확인 이후 새로 눌렸는지 (한 번만 true) */
  consume(code: string): boolean {
    return this.pressed.delete(code);
  }
}

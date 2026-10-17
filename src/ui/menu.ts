// 타이틀·조작법·스테이지 선택 화면을 그리는 DOM 오버레이
export interface StageEntry {
  name: string;
  gravity: number;
  cleared: boolean;
}

/** 목록에서 커서를 옮긴다 (양 끝에서 멈춘다) */
export function moveCursor(index: number, delta: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index + delta));
}

export const SELECT_COLUMNS = 2;

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class Menu {
  /** 항목을 클릭했을 때 그 번호로 호출된다 */
  onPick: (index: number) => void = () => {};

  constructor(private readonly root: HTMLElement) {
    root.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
      if (item) this.onPick(Number(item.dataset.index));
    });
  }

  showTitle(items: string[], index: number): void {
    this.root.hidden = false;
    this.root.className = 'menu title';
    this.root.innerHTML = `
      <h1>SKYLOAD</h1>
      <p class="sub">Inspired by SkyRoads (1993) · 비공식 팬 리메이크</p>
      <ul>${items.map((t, i) => `<li data-index="${i}" class="${i === index ? 'on' : ''}">${escape(t)}</li>`).join('')}</ul>
      <p class="hint">↑↓ 선택 · Enter 결정</p>`;
  }

  showControls(): void {
    this.root.hidden = false;
    this.root.className = 'menu controls';
    this.root.innerHTML = `
      <h2>조작법</h2>
      <table>
        <tr><td>↑ / ↓</td><td>가속 / 감속</td></tr>
        <tr><td>← / →</td><td>좌우 이동</td></tr>
        <tr><td>Space</td><td>점프 (누르고 있으면 연속 점프)</td></tr>
        <tr><td>R</td><td>처음부터 다시</td></tr>
        <tr><td>Esc</td><td>스테이지 선택으로</td></tr>
      </table>
      <h2>블록</h2>
      <table>
        <tr><td><i style="background:#4646d8"></i>Supplies</td><td>연료·산소 보급</td></tr>
        <tr><td><i style="background:#46d24a"></i>Boost</td><td>저절로 가속</td></tr>
        <tr><td><i style="background:#0a8a12"></i>Sticky</td><td>저절로 감속</td></tr>
        <tr><td><i style="background:#5a5a5a"></i>Slippery</td><td>좌우 조종 불가</td></tr>
        <tr><td><i style="background:#d23c3c"></i>Burning</td><td>닿으면 폭발</td></tr>
      </table>
      <p class="hint" data-index="0">Enter / Esc 돌아가기</p>`;
  }

  showSelect(stages: StageEntry[], index: number): void {
    this.root.hidden = false;
    this.root.className = 'menu select';
    this.root.innerHTML = `
      <h2>스테이지 선택</h2>
      <ol>${stages
        .map(
          (s, i) => `<li data-index="${i}" class="${i === index ? 'on' : ''}">
            <b>${i + 1}</b> ${escape(s.name)} <small>중력 ${s.gravity}</small>${s.cleared ? '<em>✓</em>' : ''}</li>`,
        )
        .join('')}</ol>
      <p class="hint">방향키 선택 · Enter 시작 · Esc 타이틀</p>`;
  }

  hide(): void {
    this.root.hidden = true;
  }
}

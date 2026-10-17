// 원작 배치를 따른 계기판: 320×200 가상 해상도로 화면 아래 70행에 그리고 픽셀 그대로 확대한다
import { tileUnder } from '../core/collision';
import { SPEED_LEVEL_MAX } from '../core/config';
import type { ShipState } from '../core/simulation';
import type { Level } from '../level/types';

export interface DashboardValues {
  /** 켜진 SPEED 칸 수 (0~33) */
  speedWedges: number;
  /** 남은 비율 (0~1) */
  oxygen: number;
  fuel: number;
  gravity: number;
  jump: 'IDLE' | 'JUMP' | 'LOCK';
}

export function dashboardValues(s: ShipState, level: Level): DashboardValues {
  const ratio = (v: number, max: number) => Math.min(1, Math.max(0, v / max));
  const inTunnel = s.grounded && tileUnder(level, s.x, s.z, s.y)?.tunnel === true;
  return {
    speedWedges: Math.min(SPEED_LEVEL_MAX, Math.floor(s.speedLevel + 1e-9)),
    oxygen: ratio(s.oxygen, level.oxygen),
    fuel: ratio(s.fuel, level.fuel),
    gravity: level.gravity,
    jump: !s.grounded ? 'JUMP' : inTunnel ? 'LOCK' : 'IDLE',
  };
}

export const DASH_TOP = 130; // 원작 계기판이 시작하는 행

const CX = 160;
const CY = 166;
const RING_START = (120 * Math.PI) / 180; // 왼쪽 아래에서 시계 방향으로
const RING_SWEEP = (300 * Math.PI) / 180;

const C = {
  panel: '#56645f',
  panelDark: '#3b4743',
  edge: '#9aaba4',
  lit: '#9a1a86',
  unlit: '#22104f',
  hub: '#74837d',
  amber: '#d6b25a',
  text: '#e9f1ec',
  ink: '#111',
};

export class Dashboard {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = 320;
    canvas.height = 200;
    this.ctx = canvas.getContext('2d')!;
  }

  draw(v: DashboardValues): void {
    const g = this.ctx;
    g.clearRect(0, 0, 320, 200);

    // 패널
    g.fillStyle = C.panel;
    g.beginPath();
    g.moveTo(0, DASH_TOP + 8);
    g.quadraticCurveTo(CX, DASH_TOP - 6, 320, DASH_TOP + 8);
    g.lineTo(320, 200);
    g.lineTo(0, 200);
    g.fill();
    g.strokeStyle = C.edge;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = C.panelDark;
    g.fillRect(0, 186, 320, 14);

    // SPEED 링 (33칸)
    const step = RING_SWEEP / SPEED_LEVEL_MAX;
    for (let i = 0; i < SPEED_LEVEL_MAX; i++) {
      const a0 = RING_START + i * step + 0.012;
      const a1 = RING_START + (i + 1) * step - 0.012;
      g.fillStyle = i < v.speedWedges ? C.lit : C.unlit;
      g.beginPath();
      g.arc(CX, CY, 33, a0, a1);
      g.arc(CX, CY, 18, a1, a0, true);
      g.fill();
    }

    // 가운데: 위쪽 호 O2, 아래쪽 호 FUEL (왼쪽부터 채워짐)
    g.fillStyle = C.hub;
    g.beginPath();
    g.arc(CX, CY, 17, 0, Math.PI * 2);
    g.fill();
    this.arc(Math.PI + 0.25, Math.PI * 2 - 0.25, v.oxygen, false);
    this.arc(Math.PI - 0.25, 0.25, v.fuel, true);
    this.label('O2', CX, CY - 3, 7);
    this.label('FUEL', CX, CY + 6, 7);
    this.label('SPEED', CX, 196, 8);

    // GRAV-O-METER, JUMP-O-MASTER
    this.box(88, String(v.gravity));
    this.box(196, v.jump);
    this.label('GRAV-O-METER', 106, 174, 7);
    this.label('JUMP-O-MASTER', 214, 174, 7);
  }

  /** 반지름 9~15의 호를 from에서 to 방향으로 비율만큼 채운다 */
  private arc(from: number, to: number, ratio: number, ccw: boolean): void {
    const g = this.ctx;
    const span = ccw ? from - to : to - from;
    g.fillStyle = C.unlit;
    g.beginPath();
    g.arc(CX, CY, 15, from, to, ccw);
    g.arc(CX, CY, 9, to, from, !ccw);
    g.fill();
    if (ratio <= 0) return;
    const end = ccw ? from - span * ratio : from + span * ratio;
    g.fillStyle = C.lit;
    g.beginPath();
    g.arc(CX, CY, 15, from, end, ccw);
    g.arc(CX, CY, 9, end, from, !ccw);
    g.fill();
  }

  private box(x: number, text: string): void {
    const g = this.ctx;
    g.fillStyle = C.panelDark;
    g.fillRect(x - 1, 149, 38, 17);
    g.fillStyle = C.amber;
    g.fillRect(x, 150, 36, 15);
    g.fillStyle = C.ink;
    g.font = 'bold 10px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x + 18, 158);
  }

  private label(text: string, x: number, y: number, size: number): void {
    const g = this.ctx;
    g.fillStyle = C.text;
    g.font = `bold ${size}px monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, y);
  }
}

// 최근 0.5초 동안의 평균 프레임 수를 잰다 (F 키로 화면에 표시)
const WINDOW = 0.5;

export class FpsMeter {
  fps = 0;
  private frames = 0;
  private elapsed = 0;

  tick(dt: number): void {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed >= WINDOW) {
      this.fps = this.frames / this.elapsed;
      this.frames = 0;
      this.elapsed = 0;
    }
  }
}

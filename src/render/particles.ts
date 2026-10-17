// 수명이 있는 점 입자들을 한 번에 그리는 파티클 시스템 (폭발 불꽃, 엔진 분사)
import * as THREE from 'three';

export class Particles {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly vel: Float32Array;
  private readonly base: Float32Array; // 태어날 때 색 (수명에 따라 어두워진다)
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private next = 0;

  constructor(readonly capacity: number, size: number) {
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.base = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  /** 입자 하나를 만든다. 가득 차면 가장 오래된 입자를 덮어쓴다 */
  emit(p: THREE.Vector3Like, v: THREE.Vector3Like, color: THREE.Color, life: number): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.base.set([color.r, color.g, color.b], i * 3);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  /** 입자를 움직이고 수명이 줄수록 어둡게 한다 (가산 혼합이라 검은색은 보이지 않는다) */
  update(dt: number, gravity = 0): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - dt);
      const k = i * 3;
      this.vel[k + 1] -= gravity * dt;
      for (let a = 0; a < 3; a++) this.pos[k + a] += this.vel[k + a] * dt;
      const fade = this.life[i] / this.maxLife[i];
      for (let a = 0; a < 3; a++) this.col[k + a] = this.base[k + a] * fade;
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
    this.points.geometry.getAttribute('color').needsUpdate = true;
  }

  /** 살아 있는 입자 수 */
  get alive(): number {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) if (this.life[i] > 0) n++;
    return n;
  }

  /** 지정한 입자의 현재 위치·색 (테스트용) */
  sample(i: number): { position: [number, number, number]; color: [number, number, number] } {
    const k = i * 3;
    return {
      position: [this.pos[k], this.pos[k + 1], this.pos[k + 2]],
      color: [this.col[k], this.col[k + 1], this.col[k + 2]],
    };
  }

  clear(): void {
    this.life.fill(0);
    this.col.fill(0);
    this.points.geometry.getAttribute('color').needsUpdate = true;
  }
}

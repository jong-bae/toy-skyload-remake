// 파티클 수명·이동·색 감쇠·덮어쓰기를 검증한다
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Particles } from '../src/render/particles';

const WHITE = new THREE.Color(1, 1, 1);

describe('파티클', () => {
  it('속도대로 움직이고 수명이 줄수록 어두워진다', () => {
    const p = new Particles(4, 1);
    p.emit({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, WHITE, 1);
    p.update(0.5);
    const s = p.sample(0);
    expect(s.position[0]).toBeCloseTo(0.5, 6);
    expect(s.color[0]).toBeCloseTo(0.5, 6);
  });

  it('중력을 받으면 아래로 떨어진다', () => {
    const p = new Particles(1, 1);
    p.emit({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, WHITE, 2);
    p.update(0.5, 4);
    expect(p.sample(0).position[1]).toBeLessThan(0);
  });

  it('수명이 다하면 사라진다', () => {
    const p = new Particles(4, 1);
    p.emit({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, WHITE, 0.2);
    expect(p.alive).toBe(1);
    p.update(0.3);
    expect(p.alive).toBe(0);
    expect(p.sample(0).color).toEqual([0, 0, 0]);
  });

  it('가득 차면 가장 오래된 입자를 덮어쓴다', () => {
    const p = new Particles(2, 1);
    for (let i = 0; i < 3; i++) p.emit({ x: i, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, WHITE, 1);
    expect(p.alive).toBe(2);
    expect(p.sample(0).position[0]).toBe(2);
  });
});

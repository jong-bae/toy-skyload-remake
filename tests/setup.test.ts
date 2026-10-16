// 테스트 환경이 TypeScript와 three 모듈을 정상적으로 불러오는지 확인하는 스모크 테스트
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

describe('테스트 환경', () => {
  it('three 수학 모듈을 불러올 수 있다', () => {
    const v = new THREE.Vector3(1, 2, 2);
    expect(v.length()).toBe(3);
  });
});

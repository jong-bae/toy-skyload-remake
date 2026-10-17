// 테스트 레벨을 자동 조종으로 끝까지 통과할 수 있는지 검증한다
import { describe, expect, it } from 'vitest';
import testLevel from '../levels/test-01.json';
import { parseLevel } from '../src/level/parse';
import { autoplay, testLevelTarget } from './autopilot';

describe('테스트 레벨 01', () => {
  const level = parseLevel(testLevel);

  it('자동 조종으로 클리어한다', () => {
    const { final: s } = autoplay(level, testLevelTarget(level));
    expect(s.status, `z=${s.z.toFixed(2)} y=${s.y.toFixed(2)} 속도=${s.speedLevel.toFixed(1)}`).toBe('cleared');
  });
});

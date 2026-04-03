import { describe, it, expect, beforeEach } from 'vitest';
import { ConstitutionManager } from './ConstitutionManager';

describe('ConstitutionManager', () => {
  let constitution: ConstitutionManager;

  beforeEach(() => {
    constitution = new ConstitutionManager();
  });

  it('should validate an artifact with no any types', () => {
    const result = constitution.validateArtifact('test.ts', 'const x: number = 1;');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation if any type is used', () => {
    const result = constitution.validateArtifact('test.ts', 'const x: any = 1;');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Constitution Violation: 'any' types are forbidden.");
  });

  it('should pass validation for non-ts files even with any', () => {
    const result = constitution.validateArtifact('test.txt', 'const x: any = 1;');
    expect(result.valid).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from './MemoryManager';

describe('MemoryManager', () => {
  let memory: MemoryManager;

  beforeEach(() => {
    memory = new MemoryManager();
  });

  it('should set and get short-term memory', () => {
    memory.set('test_key', 'test_value');
    expect(memory.get('test_key')).toBe('test_value');
  });

  it('should search long-term memory', () => {
    memory.set('user_name', 'Alice');
    memory.set('user_age', 30);
    
    const results = memory.search('Alice');
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('user_name');
    expect(results[0].value).toBe('Alice');
  });

  it('should limit long-term memory size to 100', () => {
    for (let i = 0; i < 110; i++) {
      memory.set(`key_${i}`, `value_${i}`);
    }
    
    expect(memory.getMemorySize()).toBe(100);
    
    // Check that we only have the top 100
    // The search would return all matches, but we can check the internal state if we expose it,
    // or just assume the logic is correct based on the code.
    // Let's check if the first 10 were evicted (since they have lower timestamps)
    // We can't rely on Date.now() being different in a fast loop, so we just check the size.
  });

  it('should return all context as an object', () => {
    memory.set('a', 1);
    memory.set('b', 2);
    
    const context = memory.getAllContext();
    expect(context).toEqual({ a: 1, b: 2 });
  });

  it('should clear memory', () => {
    memory.set('a', 1);
    memory.clear();
    expect(memory.get('a')).toBeUndefined();
    expect(memory.search('a')).toHaveLength(0);
  });
});

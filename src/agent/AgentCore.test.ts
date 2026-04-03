import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentCore } from './AgentCore';

// Mock @google/genai
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            action: 'output',
            content: 'test content',
            reasoning: 'test reasoning',
            fileName: 'test.ts'
          })
        })
      }
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING'
    }
  };
});

// Mock DB
vi.mock('../db/db', () => ({
  getPool: vi.fn(),
  isDbEnabled: vi.fn().mockReturnValue(false)
}));

describe('AgentCore', () => {
  let agent: AgentCore;

  beforeEach(() => {
    agent = new AgentCore('test-api-key');
  });

  it('should initialize with default tools', () => {
    expect(agent.getLogs()).toHaveLength(0);
    expect(agent.getPhase()).toBe('0_INIT');
  });

  it('should handle /speckit-init command', async () => {
    await agent.handleCommand('/speckit-init');
    const logs = agent.getLogs();
    expect(logs.some(l => l.message.includes('Command received: /speckit-init'))).toBe(true);
    expect(agent.getPhase()).toBe('0_INIT');
    
    const goals = agent.getPlanner().getGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].description).toBe('Initialize SpecKit Project');
  });

  it('should handle a generic goal command', async () => {
    await agent.handleCommand('Build a website');
    const logs = agent.getLogs();
    expect(logs.some(l => l.message.includes('Starting new goal: Build a website'))).toBe(true);
  });

  it('should handle unknown speckit protocol error', async () => {
    try {
      await agent.handleCommand('/speckit.unknown');
    } catch (e) {
      // Expected
    }
    const logs = agent.getLogs();
    expect(logs.some(l => l.type === 'error' && l.message.includes('Unknown SpecKit protocol: /speckit.unknown'))).toBe(true);
  });

  it('should handle empty command error', async () => {
    try {
      await agent.handleCommand('   ');
    } catch (e) {
      // Expected
    }
    const logs = agent.getLogs();
    expect(logs.some(l => l.type === 'error' && l.message.includes('Command cannot be empty'))).toBe(true);
  });
});

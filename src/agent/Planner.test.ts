import { describe, it, expect, beforeEach } from 'vitest';
import { Planner } from './Planner';

describe('Planner', () => {
  let planner: Planner;

  beforeEach(() => {
    planner = new Planner();
  });

  it('should create a goal', () => {
    const goal = planner.createGoal('Test Goal');
    expect(goal.description).toBe('Test Goal');
    expect(goal.tasks).toHaveLength(0);
    expect(planner.getGoals()).toContain(goal);
  });

  it('should add a task to a goal', () => {
    const goal = planner.createGoal('Test Goal');
    const task = planner.addTaskToGoal(goal.id, 'Test Task', 'JavaDev', '4_IMPLEMENT');
    
    expect(task.description).toBe('Test Task');
    expect(task.status).toBe('pending');
    expect(goal.tasks).toContain(task);
  });

  it('should get pending tasks for current phase', () => {
    const goal = planner.createGoal('Test Goal');
    planner.addTaskToGoal(goal.id, 'Init Task', 'CEO', '0_INIT');
    planner.addTaskToGoal(goal.id, 'Specify Task', 'PM', '1_SPECIFY');
    
    planner.setPhase('0_INIT');
    const pending = planner.getPendingTasks();
    expect(pending).toHaveLength(1);
    expect(pending[0].task.description).toBe('Init Task');
  });

  it('should respect task dependencies', () => {
    const goal = planner.createGoal('Test Goal');
    const task1 = planner.addTaskToGoal(goal.id, 'Task 1', 'CEO', '0_INIT');
    const task2 = planner.addTaskToGoal(goal.id, 'Task 2', 'CEO', '0_INIT', [task1.id]);
    
    planner.setPhase('0_INIT');
    
    // Task 2 should not be pending because Task 1 is not completed
    let pending = planner.getPendingTasks();
    expect(pending).toHaveLength(1);
    expect(pending[0].task.id).toBe(task1.id);
    
    // Complete Task 1
    planner.updateTaskStatus(task1.id, 'completed');
    
    // Now Task 2 should be pending
    pending = planner.getPendingTasks();
    expect(pending).toHaveLength(1);
    expect(pending[0].task.id).toBe(task2.id);
  });

  it('should update task status', () => {
    const goal = planner.createGoal('Test Goal');
    const task = planner.addTaskToGoal(goal.id, 'Test Task', 'JavaDev', '4_IMPLEMENT');
    
    planner.updateTaskStatus(task.id, 'running');
    expect(task.status).toBe('running');
    
    const result = { data: 'some result' };
    planner.updateTaskStatus(task.id, 'completed', result);
    expect(task.status).toBe('completed');
    expect(task.result).toEqual(result);
  });
});

import { AgentGoal, AgentTask, PersonaRole, WorkflowPhase } from "../types/agent";
import { v4 as uuidv4 } from "uuid";

export class Planner {
  private goals: AgentGoal[] = [];
  private currentPhase: WorkflowPhase = '0_INIT';

  createGoal(description: string, priority: number = 1): AgentGoal {
    const goal: AgentGoal = {
      id: uuidv4(),
      description,
      tasks: [],
      priority,
      context: {},
      phase: this.currentPhase
    };
    this.goals.push(goal);
    return goal;
  }

  addTaskToGoal(goalId: string, taskDescription: string, persona: PersonaRole, phase: WorkflowPhase, dependencies: string[] = []): AgentTask {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) throw new Error("Goal not found");

    const task: AgentTask = {
      id: uuidv4(),
      description: taskDescription,
      status: 'pending',
      dependencies,
      persona,
      phase
    };
    goal.tasks.push(task);
    return task;
  }

  getPendingTasks(): { goal: AgentGoal; task: AgentTask }[] {
    const pending: { goal: AgentGoal; task: AgentTask }[] = [];
    
    // Sort goals by priority
    const sortedGoals = [...this.goals].sort((a, b) => b.priority - a.priority);

    for (const goal of sortedGoals) {
      for (const task of goal.tasks) {
        if (task.status === 'pending' && task.phase === this.currentPhase) {
          // Check dependencies
          const depsMet = task.dependencies?.every(depId => 
            goal.tasks.find(t => t.id === depId)?.status === 'completed'
          ) ?? true;

          if (depsMet) {
            pending.push({ goal, task });
          }
        }
      }
    }
    return pending;
  }

  updateTaskStatus(taskId: string, status: AgentTask['status'], result?: any, error?: string) {
    for (const goal of this.goals) {
      const task = goal.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        task.result = result;
        task.error = error;
        return;
      }
    }
  }

  setPhase(phase: WorkflowPhase) {
    this.currentPhase = phase;
  }

  getPhase() {
    return this.currentPhase;
  }

  getGoals() {
    return this.goals;
  }
}

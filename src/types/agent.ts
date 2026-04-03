export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'gated';

export type PersonaRole = 
  | 'CEO' | 'PM' | 'Architect' | 'BA' | 'DBA' 
  | 'JavaDev' | 'NodeDev' | 'FEDev' | 'QA' 
  | 'TechLead' | 'ProjectManager' | 'DevOps' | 'ProposalArchitect';

export type WorkflowPhase = 
  | '0_INIT' | '1_SPECIFY' | '1B_CLARIFY' | '2_PLAN' 
  | '2B_ANALYZE' | '3_TASKS' | '4_IMPLEMENT' | '5_COMMIT' 
  | '6_DEPLOY' | '7_SHIP';

export interface AgentPersona {
  role: PersonaRole;
  name: string;
  description: string;
  keyOutput: string;
}

export interface Artifact {
  id: string;
  name: string;
  path: string;
  content: string;
  phase: WorkflowPhase;
  author: PersonaRole;
  timestamp: number;
}

export interface AgentTask {
  id: string;
  description: string;
  status: TaskStatus;
  reasoning?: string;
  result?: any;
  error?: string;
  dependencies?: string[];
  persona: PersonaRole;
  phase: WorkflowPhase;
}

export interface AgentGoal {
  id: string;
  description: string;
  tasks: AgentTask[];
  priority: number;
  context: Record<string, any>;
  phase: WorkflowPhase;
}

export interface AgentLog {
  timestamp: number;
  type: 'thought' | 'action' | 'error' | 'success';
  message: string;
  data?: any;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  timestamp: number;
  importance: number;
}

import { GoogleGenAI, Type } from "@google/genai";
import { Planner } from "./Planner";
import { MemoryManager } from "./MemoryManager";
import { ToolRegistry } from "./ToolRegistry";
import { ConstitutionManager } from "./ConstitutionManager";
import { PERSONAS } from "./PersonaService";
import { AgentLog, AgentTask, PersonaRole, WorkflowPhase, Artifact } from "../types/agent";
import { getPool, isDbEnabled } from "../db/db";

export class SpecKitError extends Error {
  constructor(message: string, public cause?: string) {
    super(message);
    this.name = 'SpecKitError';
  }
}

export class AgentCore {
  private planner: Planner;
  private memory: MemoryManager;
  private tools: ToolRegistry;
  private constitution: ConstitutionManager;
  private ai: GoogleGenAI;
  private logs: AgentLog[] = [];
  private artifacts: Artifact[] = [];
  private isRunning: boolean = false;

  constructor(apiKey: string) {
    this.planner = new Planner();
    this.memory = new MemoryManager();
    this.tools = new ToolRegistry();
    this.constitution = new ConstitutionManager();
    this.ai = new GoogleGenAI({ apiKey });
    this.setupDefaultTools();
    this.loadFromDb().catch(err => console.error("Failed to load from DB:", err));
  }

  private setupDefaultTools() {
    this.tools.register({
      name: "search_memory",
      description: "Search the agent's long-term memory for relevant information.",
      parameters: { query: { type: "string" } },
      execute: async ({ query }) => this.memory.search(query)
    });

    this.tools.register({
      name: "web_search",
      description: "Search the web for real-time information.",
      parameters: { query: { type: "string" } },
      execute: async ({ query }) => {
        // Placeholder for real web search integration
        return `Search results for: ${query} (Mocked)`;
      }
    });

    this.tools.register({
      name: "mcp_call",
      description: "Call a Model Context Protocol (MCP) server tool.",
      parameters: { server: { type: "string" }, tool: { type: "string" }, args: { type: "object" } },
      execute: async ({ server, tool, args }) => {
        return `MCP Call to ${server}/${tool} with args ${JSON.stringify(args)} (Mocked)`;
      }
    });
  }

  private async loadFromDb() {
    if (!isDbEnabled()) return;
    try {
      const pool = getPool();
      if (!pool) return;
      const logsRes = await pool.query("SELECT * FROM logs ORDER BY timestamp ASC");
      this.logs = logsRes.rows;

      const artifactsRes = await pool.query("SELECT * FROM artifacts ORDER BY timestamp ASC");
      this.artifacts = artifactsRes.rows;

      // Load goals and tasks into planner
      const goalsRes = await pool.query("SELECT * FROM goals");
      for (const goal of goalsRes.rows) {
        const g = this.planner.createGoal(goal.description, goal.priority);
        g.id = goal.id;
        g.phase = goal.phase;
        g.context = goal.context;

        const tasksRes = await pool.query("SELECT * FROM tasks WHERE goal_id = $1", [goal.id]);
        for (const task of tasksRes.rows) {
          const t = this.planner.addTaskToGoal(g.id, task.description, task.persona, task.phase, task.dependencies);
          t.id = task.id;
          t.status = task.status;
          t.reasoning = task.reasoning;
          t.result = task.result;
          t.error = task.error;
        }
      }
      this.log('success', "Agent state restored from PostgreSQL.");
    } catch (err) {
      console.warn("Could not load from DB (likely first run or no connection):", err);
    }
  }

  private async log(type: AgentLog['type'], message: string, data?: any) {
    const entry: AgentLog = { timestamp: Date.now(), type, message, data };
    this.logs.push(entry);
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');

    // Persist log to DB
    if (isDbEnabled()) {
      try {
        const pool = getPool();
        if (pool) {
          await pool.query(
            "INSERT INTO logs (timestamp, type, message, data) VALUES ($1, $2, $3, $4)",
            [entry.timestamp, entry.type, entry.message, entry.data]
          );
        }
      } catch (err) {
        console.error("Failed to persist log to DB:", err);
      }
    }
  }

  async handleCommand(command: string) {
    this.log('action', `Command received: ${command}`);
    
    try {
      if (!command || command.trim() === '') {
        throw new SpecKitError("Command cannot be empty.", "You must provide a goal or a protocol command (e.g., /speckit-init).");
      }

      if (command.startsWith('/')) {
        const cmd = command.split(' ')[0];
        switch (cmd) {
          case '/speckit-init':
            await this.initWorkflow();
            break;
          case '/speckit.specify':
            await this.runPhase('1_SPECIFY');
            break;
          case '/speckit.plan':
            await this.runPhase('2_PLAN');
            break;
          case '/speckit.implement':
            await this.runPhase('4_IMPLEMENT');
            break;
          case '/db.test':
            await this.testDatabaseConnection();
            break;
          default:
            if (cmd.startsWith('/speckit.')) {
              throw new SpecKitError(
                `Unknown SpecKit protocol: ${cmd}`, 
                "Check the available commands in the suggestions or use /speckit-init to start."
              );
            }
            await this.runGoal(command);
        }
      } else {
        await this.runGoal(command);
      }
    } catch (error: any) {
      const message = error.message;
      const cause = error instanceof SpecKitError ? error.cause : "An unexpected internal error occurred.";
      
      this.log('error', `Command execution failed: ${message}`);
      if (cause) {
        this.log('thought', `Potential cause: ${cause}`);
      }
      
      this.isRunning = false;
      console.error(`Error executing command "${command}":`, error);
      
      // Re-throw to let the server handle it for the toast
      throw error;
    }
  }

  private async testDatabaseConnection() {
    this.log('thought', "Testing PostgreSQL database connection...");
    
    if (!isDbEnabled()) {
      this.log('error', "Database is not enabled. Check your DATABASE_URL in .env.");
      return;
    }

    const pool = getPool();
    if (!pool) {
      this.log('error', "Failed to get database pool.");
      return;
    }

    let client;
    try {
      client = await pool.connect();
      const res = await client.query('SELECT NOW() as current_time, version() as version');
      this.log('success', "Database connection successful!");
      this.log('thought', `Server Time: ${res.rows[0].current_time}`);
      this.log('thought', `PostgreSQL Version: ${res.rows[0].version}`);
      
      // Check if tables exist
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      this.log('thought', `Initialized Tables: ${tables.rows.map((r: any) => r.table_name).join(', ')}`);
    } catch (err: any) {
      this.log('error', `Database connection failed: ${err.message}`);
      console.error("Database connection test error:", err);
    } finally {
      if (client) client.release();
    }
  }

  private async initWorkflow() {
    this.log('thought', "Scaffolding workspace and loading Constitution...");
    this.planner.setPhase('0_INIT');
    const goal = this.planner.createGoal("Initialize SpecKit Project");
    
    // Persist goal to DB
    if (isDbEnabled()) {
      try {
        const pool = getPool();
        if (pool) {
          await pool.query(
            "INSERT INTO goals (id, description, priority, context, phase) VALUES ($1, $2, $3, $4, $5)",
            [goal.id, goal.description, goal.priority, goal.context, goal.phase]
          );
        }
      } catch (err) {
        console.error("Failed to persist goal to DB:", err);
      }
    }

    this.planner.addTaskToGoal(goal.id, "Scaffold workspace directories", 'CEO', '0_INIT');
    this.planner.addTaskToGoal(goal.id, "Load and enforce Constitution", 'CEO', '0_INIT');
    
    // Persist tasks to DB
    if (isDbEnabled()) {
      for (const task of goal.tasks) {
        try {
          const pool = getPool();
          if (pool) {
            await pool.query(
              "INSERT INTO tasks (id, goal_id, description, status, persona, phase, dependencies) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [task.id, goal.id, task.description, task.status, task.persona, task.phase, task.dependencies]
            );
          }
        } catch (err) {
          console.error("Failed to persist task to DB:", err);
        }
      }
    }
    
    await this.processPendingTasks();
  }

  private async runPhase(phase: WorkflowPhase) {
    this.planner.setPhase(phase);
    this.log('thought', `Transitioning to phase: ${phase}`);
    
    // Auto-generate tasks for the phase based on personas
    const goals = this.planner.getGoals();
    if (goals.length === 0) {
      throw new SpecKitError(
        "No active goal found.", 
        "You must initialize a project with /speckit-init or set a goal first before running phase commands."
      );
    }
    const goal = goals[0]; // Assume first goal for now

    if (phase === '1_SPECIFY') {
      this.planner.addTaskToGoal(goal.id, "Define Strategy & MVP", 'PM', '1_SPECIFY');
      this.planner.addTaskToGoal(goal.id, "Generate BRD & Gherkin Specs", 'BA', '1_SPECIFY');
    } else if (phase === '2_PLAN') {
      this.planner.addTaskToGoal(goal.id, "Design System Architecture (SAD)", 'Architect', '2_PLAN');
      this.planner.addTaskToGoal(goal.id, "Design Database Schema", 'DBA', '2_PLAN');
    }

    await this.processPendingTasks();
  }

  private async processPendingTasks() {
    this.isRunning = true;
    while (this.isRunning) {
      const pending = this.planner.getPendingTasks();
      if (pending.length === 0) break;

      for (const { task, goal } of pending) {
        await this.executeTask(task, goal);
      }
    }
    this.isRunning = false;
  }

  async runGoal(description: string) {
    this.log('thought', `Starting new goal: ${description}`);
    const goal = this.planner.createGoal(description);
    this.isRunning = true;

    while (this.isRunning) {
      const pending = this.planner.getPendingTasks();
      if (pending.length === 0) {
        this.log('success', "All tasks completed for the current goal.");
        this.isRunning = false;
        break;
      }

      for (const { task, goal } of pending) {
        await this.executeTask(task, goal);
      }
    }

    // Self-Improvement Loop: Reflect on the completed goal
    await this.reflectOnGoal(description);
  }

  private async reflectOnGoal(description: string) {
    this.log('thought', "Reflecting on completed goal for self-improvement...");
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Goal: ${description}
          Logs: ${JSON.stringify(this.logs.slice(-20))}
          
          Reflect on how this goal was handled. What could be improved? 
          Store key learnings in memory.
        `,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              learnings: { type: Type.STRING },
              improvement: { type: Type.STRING }
            },
            required: ["learnings", "improvement"]
          }
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from model");
      }
      
      const reflection = JSON.parse(text);
      this.memory.set(`learning_${Date.now()}`, reflection, 5);
      this.log('success', `Self-improvement reflection stored: ${reflection.learnings}`);
    } catch (error: any) {
      this.log('error', `Failed to perform self-improvement reflection: ${error.message}`);
      console.error("Reflection failed:", error);
    }
  }

  private async executeTask(task: AgentTask, goal: any) {
    const persona = PERSONAS[task.persona];
    this.log('thought', `[${persona.name}] Executing task: ${task.description}`);
    this.planner.updateTaskStatus(task.id, 'running');

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Persona: ${persona.name} (${persona.role}) - ${persona.description}
          Goal: ${goal.description}
          Current Task: ${task.description}
          Phase: ${task.phase}
          Key Output Required: ${persona.keyOutput}
          Context: ${JSON.stringify(this.memory.getAllContext())}
          
          Follow the SpecKit Constitution:
          1. Quality Standards: >85% test coverage, no any types
          2. Testing Policy: Shift-Left TDD
          3. Tech Stack: Java 21+ / Node 20+
        `,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              content: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              fileName: { type: Type.STRING }
            },
            required: ["action", "content", "reasoning", "fileName"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from model");
      }

      const decision = JSON.parse(text);
      this.log('thought', `[${persona.name}] ${decision.reasoning}`);

      // Validate against constitution
      const validation = this.constitution.validateArtifact(decision.fileName, decision.content);
      if (!validation.valid) {
        throw new Error(`Constitution Violation: ${validation.errors.join(', ')}`);
      }

      // Store artifact
      const artifact: Artifact = {
        id: Math.random().toString(36).substr(2, 9),
        name: decision.fileName,
        path: `/artifacts/${task.phase}/${decision.fileName}`,
        content: decision.content,
        phase: task.phase,
        author: task.persona,
        timestamp: Date.now()
      };
      this.artifacts.push(artifact);
      this.log('success', `[${persona.name}] Artifact generated: ${artifact.name}`);
      
      // Persist artifact to DB
      if (isDbEnabled()) {
        try {
          const pool = getPool();
          if (pool) {
            await pool.query(
              "INSERT INTO artifacts (id, name, path, content, phase, author, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [artifact.id, artifact.name, artifact.path, artifact.content, artifact.phase, artifact.author, artifact.timestamp]
            );
          }
        } catch (err) {
          console.error("Failed to persist artifact to DB:", err);
        }
      }

      this.planner.updateTaskStatus(task.id, 'completed', artifact);
      
      // Update task in DB
      if (isDbEnabled()) {
        try {
          const pool = getPool();
          if (pool) {
            await pool.query(
              "UPDATE tasks SET status = $1, result = $2, reasoning = $3 WHERE id = $4",
              ['completed', artifact, decision.reasoning, task.id]
            );
          }
        } catch (err) {
          console.error("Failed to update task in DB:", err);
        }
      }

      this.memory.set(task.description, artifact);
    } catch (error: any) {
      this.log('error', `[${persona.name}] Task failed: ${error.message}`);
      this.planner.updateTaskStatus(task.id, 'failed', undefined, error.message);
      
      // Update task in DB
      if (isDbEnabled()) {
        try {
          const pool = getPool();
          if (pool) {
            await pool.query(
              "UPDATE tasks SET status = $1, error = $2 WHERE id = $3",
              ['failed', error.message, task.id]
            );
          }
        } catch (err) {
          console.error("Failed to update task in DB:", err);
        }
      }
      
      this.isRunning = false;
    }
  }

  getArtifacts() { return this.artifacts; }
  getPhase() { return this.planner.getPhase(); }

  getLogs() { return this.logs; }
  getPlanner() { return this.planner; }
}

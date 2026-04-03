import { AgentTask } from "../types/agent";

export type ToolFunction = (args: any, context: any) => Promise<any>;

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: ToolFunction;
}

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, args: any, context: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return await tool.execute(args, context);
  }
}

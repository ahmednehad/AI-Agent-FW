import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { AgentCore } from "./src/agent/AgentCore";
import { initDb } from "./src/db/db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB
  try {
    await initDb();
  } catch (err) {
    console.error("Database initialization failed. Persistence may be disabled.", err);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in the environment.");
  }

  const agent = new AgentCore(apiKey || "");

  // API Routes
  app.post("/api/agent/command", async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "Command is required" });
    
    try {
      // We await handleCommand to catch initial validation errors
      // If it's a long-running goal, handleCommand will start it and return
      // but we need to be careful about how we handle the async execution.
      // For now, let's just catch the immediate errors.
      await agent.handleCommand(command);
      res.json({ status: "started", message: "Agent is processing your command." });
    } catch (err: any) {
      console.error("Agent command failed:", err);
      res.status(400).json({ 
        error: err.message, 
        cause: err.cause || "The agent encountered an issue while processing your request."
      });
    }
  });

  app.get("/api/agent/logs", (req, res) => {
    res.json(agent.getLogs());
  });

  app.get("/api/agent/artifacts", (req, res) => {
    res.json(agent.getArtifacts());
  });

  app.get("/api/agent/status", (req, res) => {
    res.json({
      goals: agent.getPlanner().getGoals(),
      phase: agent.getPhase(),
      isRunning: true 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

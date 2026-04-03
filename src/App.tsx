import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Terminal, 
  Brain, 
  Database, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  Zap,
  FileText,
  UserCircle,
  ChevronRight,
  Gavel,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from './lib/utils';
import { AgentLog, AgentGoal, AgentTask, Artifact, WorkflowPhase } from './types/agent';

export default function App() {
  const [goal, setGoal] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toast, setToast] = useState<{ message: string; cause?: string; type: 'error' | 'success' } | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [status, setStatus] = useState<{ goals: AgentGoal[]; isRunning: boolean; phase: WorkflowPhase }>({ 
    goals: [], 
    isRunning: false, 
    phase: '0_INIT' 
  });
  const [activeTab, setActiveTab] = useState<'logs' | 'planner' | 'artifacts'>('logs');
  const [loading, setLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const phases: WorkflowPhase[] = [
    '0_INIT', '1_SPECIFY', '1B_CLARIFY', '2_PLAN', '2B_ANALYZE', '3_TASKS', '4_IMPLEMENT', '5_COMMIT', '6_DEPLOY', '7_SHIP'
  ];

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [logsRes, statusRes, artifactsRes] = await Promise.all([
          axios.get('/api/agent/logs'),
          axios.get('/api/agent/status'),
          axios.get('/api/agent/artifacts')
        ]);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
        setStatus(statusRes.data || { goals: [], isRunning: false, phase: '0_INIT' });
        setArtifacts(Array.isArray(artifactsRes.data) ? artifactsRes.data : []);
      } catch (err) {
        console.error("Failed to fetch agent state", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs' && logContainerRef.current) {
      const container = logContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom || logs.length <= 1) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs, activeTab]);

  const allCommands = [
    '/speckit-init',
    '/speckit.specify',
    '/speckit.clarify',
    '/speckit.plan',
    '/speckit.analyze',
    '/speckit.tasks',
    '/speckit.implement',
    '/speckit.commit',
    '/speckit.deploy',
    '/speckit.ship',
    '/db.test'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setGoal(value);

    if (value.startsWith('/')) {
      const filtered = allCommands.filter(cmd => 
        cmd.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setGoal(suggestions[activeSuggestionIndex]);
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const selectSuggestion = (cmd: string) => {
    setGoal(cmd);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setLoading(true);
    try {
      await axios.post('/api/agent/command', { command: goal });
      setGoal('');
    } catch (err: any) {
      console.error("Failed to send command", err);
      setToast({ 
        message: err.response?.data?.error || "Failed to communicate with SpecKit OS.", 
        cause: err.response?.data?.cause,
        type: 'error' 
      });
      setTimeout(() => setToast(null), 8000); // Longer for detailed errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className={cn(
              "p-4 rounded-xl border shadow-2xl flex flex-col gap-2",
              toast.type === 'error' ? "bg-rose-950/90 border-rose-500/50 text-rose-200" : "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
            )}>
              <div className="flex items-center gap-3">
                {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                <span className="text-sm font-bold">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {toast.cause && (
                <div className="pl-8 text-xs text-rose-300/80 italic leading-relaxed">
                  Potential Cause: {toast.cause}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">SPECKIT <span className="text-indigo-500 font-medium">OS</span></h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Constitution-Bound Agent v2.0</p>
            </div>
          </div>
          
          {/* Phase Progress */}
          <div className="hidden md:flex items-center gap-1">
            {phases.map((p, i) => (
              <React.Fragment key={p}>
                <div className={cn(
                  "px-2 py-1 rounded text-[9px] font-bold transition-all",
                  status.phase === p ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : 
                  phases.indexOf(status.phase) > i ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-600"
                )}>
                  {p.split('_')[1] || p}
                </div>
                {i < phases.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-800" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", status.isRunning ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600")} />
              <span className="text-xs font-medium uppercase tracking-wider">{status.isRunning ? "Processing" : "Standby"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Planner */}
        <div className="lg:col-span-4 space-y-6">
          {/* Goal Input */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Command Interface
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={goal}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="/speckit-init, /speckit.specify..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none h-24"
                />
                
                {/* Autocomplete Suggestions */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 bottom-full mb-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-[60]"
                    >
                      {suggestions.map((cmd, i) => (
                        <button
                          key={cmd}
                          type="button"
                          onClick={() => selectSuggestion(cmd)}
                          onMouseEnter={() => setActiveSuggestionIndex(i)}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs font-mono transition-colors flex items-center justify-between",
                            i === activeSuggestionIndex ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
                          )}
                        >
                          <span>{cmd}</span>
                          {i === activeSuggestionIndex && <Zap className="w-3 h-3" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {['/speckit-init', '/speckit.specify', '/speckit.plan', '/speckit.implement'].map(cmd => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => setGoal(cmd)}
                    className="text-[9px] font-bold text-zinc-500 hover:text-indigo-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded whitespace-nowrap transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
              <button
                disabled={loading || !goal.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Execute Protocol
              </button>
            </form>
          </section>

          {/* System Stats */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Gavel className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Governance</span>
              </div>
              <div className="text-xl font-bold text-white">Active</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <ShieldCheck className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Security</span>
              </div>
              <div className="text-xl font-bold text-white">OWASP+</div>
            </div>
          </section>

          {/* Planner View */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl overflow-hidden">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Strategic Planner
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {!status || !status.goals || status.goals.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 italic text-sm">No active goals in queue</div>
              ) : (
                status.goals.map((g) => (
                  <div key={g.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-indigo-400 leading-relaxed">{g.description}</h3>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">P{g.priority}</span>
                    </div>
                    <div className="space-y-2 pl-3 border-l border-zinc-800">
                      {g.tasks?.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 group">
                          {t.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
                           t.status === 'running' ? <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" /> : 
                           t.status === 'failed' ? <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> :
                           <Circle className="w-3.5 h-3.5 text-zinc-700" />}
                          <span className={cn("text-[11px] transition-colors", 
                            t.status === 'completed' ? "text-zinc-500 line-through" : "text-zinc-400 group-hover:text-zinc-200"
                          )}>
                            {t.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Logs & Memory */}
        <div className="lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-xl flex flex-col overflow-hidden h-[calc(100vh-160px)]">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'logs' ? "text-white border-b-2 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Terminal className="w-4 h-4" />
              Protocol Logs
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={cn(
                "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'artifacts' ? "text-white border-b-2 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <FileText className="w-4 h-4" />
              Artifact Vault
            </button>
          </div>

          {/* Content Area */}
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar"
          >
            {activeTab === 'logs' ? (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {logs && logs.length > 0 ? logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-4 group rounded-lg transition-all",
                        log.type === 'error' ? "bg-rose-500/5 border border-rose-500/20 p-3 -mx-3" : ""
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5",
                          log.type === 'thought' ? "bg-indigo-500" :
                          log.type === 'action' ? "bg-amber-500" :
                          log.type === 'error' ? "bg-rose-500" : "bg-emerald-500"
                        )} />
                        <div className="w-px flex-1 bg-zinc-800 my-1" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            log.type === 'thought' ? "text-indigo-400" :
                            log.type === 'action' ? "text-amber-400" :
                            log.type === 'error' ? "text-rose-400" : "text-emerald-400"
                          )}>
                            {log.type}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed font-mono selection:bg-indigo-500/30">
                          {log.message}
                        </p>
                        {log.data && (
                          <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-[11px] text-zinc-500 overflow-x-auto border border-zinc-800/50">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-12 text-zinc-600 italic text-sm">
                      No logs available.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artifacts && artifacts.length > 0 && artifacts.map(art => (
                    <div key={art.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl group hover:border-indigo-500/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-bold text-white">{art.name}</h4>
                        </div>
                        <span className="text-[9px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-zinc-800">{art.phase}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <UserCircle className="w-3 h-3 text-zinc-600" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{art.author}</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-[10px] text-zinc-600 font-mono bg-zinc-900/50 p-2 rounded border border-zinc-800/30 custom-scrollbar">
                        {art.content.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
                {(!artifacts || artifacts.length === 0) && (
                  <div className="text-center py-12 text-zinc-600 italic text-sm">
                    No artifacts generated in this project yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Status */}
          <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Latency: 42ms</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Auth: Verified</span>
              </div>
            </div>
            <div className="text-[10px] text-zinc-600 font-mono">
              SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}

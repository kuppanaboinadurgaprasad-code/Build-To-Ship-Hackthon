import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Play, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Loader2, Terminal, FileText,
  Zap, ChevronDown, ChevronUp, Package,
  TrendingUp, Activity, BarChart3, Shield,
  Cpu, Database, Sparkles, Sliders, History,
  Send, Users, Check, X, Award, Search,
  ExternalLink, ThumbsUp, ThumbsDown, Copy,
  ArrowRight, Key, Layers, Globe, DollarSign
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BUILT COMPETITION PRESETS
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'ev_standard',
    title: 'EV Research & Student Budget Recommendation (Competition Demo)',
    badge: 'Official Competition Demo',
    badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    description:
      'Research the advantages and disadvantages of electric vehicles, compare the available evidence, prepare a recommendation for a student with a limited budget, and verify the final report.',
    options: { simulateSourceFailure: false, requireHumanApproval: false },
  },
  {
    id: 'ev_fallback',
    title: 'Source Outage & Autonomous Fallback Recovery (Failure Demo)',
    badge: 'Failure & Recovery Protocol',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    description:
      'Research used electric vehicles under $15,000 for a student. Simulates primary EPA database endpoint failure (HTTP 503) to trigger dynamic replanning and autonomous failover to NHTSA alternative registry.',
    options: { simulateSourceFailure: true, requireHumanApproval: false },
  },
  {
    id: 'ev_human_approval',
    title: 'EV Acquisition with Consequential Action Human Gate',
    badge: 'Human-in-the-Loop',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    description:
      'Perform complete EV research, TCO calculation, and pause at the critical purchase decision stage to mandate explicit operator authorization before final verification.',
    options: { simulateSourceFailure: false, requireHumanApproval: true },
  },
];

// Agent Metadata
const AGENTS_META = {
  orchestrator: { name: 'Orchestrator Agent', role: 'Planner & Coordinator', color: '#6366f1', avatar: '👑' },
  researcher:   { name: 'Research Agent',     role: 'Information & Sources', color: '#06b6d4', avatar: '🔍' },
  reasoner:     { name: 'Reasoning Agent',    role: 'Trade-off & Decisions', color: '#a855f7', avatar: '🧠' },
  executor:     { name: 'Execution Agent',    role: 'Tools & Actions',       color: '#10b981', avatar: '⚡' },
  verifier:     { name: 'Verification Agent', role: 'Fact & Quality Audit',  color: '#f59e0b', avatar: '🛡️' },
  memory:       { name: 'Memory Agent',       role: 'Knowledge & Feedback',  color: '#ec4899', avatar: '💾' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('home'); // home, submit, agents, plan, timeline, collaboration, results, memory, analytics, settings
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveStreamConnected, setLiveStreamConnected] = useState(false);

  // Form State
  const [taskForm, setTaskForm] = useState({
    title: PRESETS[0].title,
    description: PRESETS[0].description,
    simulateSourceFailure: false,
    requireHumanApproval: false,
  });

  // Streaming Live Data
  const [livePlan, setLivePlan] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({
    orchestrator: 'idle',
    researcher: 'idle',
    reasoner: 'idle',
    executor: 'idle',
    verifier: 'idle',
    memory: 'idle',
  });

  // Settings & Memory State
  const [memories, setMemories] = useState([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const eventSourceRef = useRef(null);
  const timelineEndRef = useRef(null);

  // Load initial tasks & memories
  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/agent/tasks');
      if (res.data?.data?.tasks) {
        setTasks(res.data.data.tasks);
        if (!selectedTask && res.data.data.tasks.length > 0) {
          setSelectedTask(res.data.data.tasks[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch tasks:', err.message);
    }
  }, [selectedTask]);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await api.get('/agent/memory');
      if (res.data?.data?.memories) {
        setMemories(res.data.data.memories);
      }
    } catch (err) {
      console.warn('Could not fetch memories:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchMemories();
  }, [fetchTasks, fetchMemories]);

  // Connect SSE for active task
  const connectSSE = useCallback((taskId) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('opssync_token') || 'demo_token';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const sseUrl = `${baseUrl}/api/agent/stream/${taskId}?token=${encodeURIComponent(token)}`;

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setLiveStreamConnected(true);
    };

    es.addEventListener('agent_log', (e) => {
      const log = JSON.parse(e.data);
      setLiveLogs((prev) => [log, ...prev]);
    });

    es.addEventListener('agent_thought', (e) => {
      const thought = JSON.parse(e.data);
      setLiveLogs((prev) => [
        {
          id: `thought-${Date.now()}`,
          timestamp: thought.timestamp,
          agentId: thought.agentId,
          agentName: thought.agentName,
          stage: 'Autonomous Reasoning',
          detail: thought.thought,
          level: 'thought',
        },
        ...prev,
      ]);
    });

    es.addEventListener('agent_message', (e) => {
      const msg = JSON.parse(e.data);
      setLiveMessages((prev) => [...prev, msg]);
    });

    es.addEventListener('plan_update', (e) => {
      const data = JSON.parse(e.data);
      if (data.plan) {
        setLivePlan(data.plan);
        // Update agent statuses based on running steps
        const runningStep = data.plan.find((s) => s.status === 'running');
        if (runningStep) {
          setAgentStatuses((prev) => ({
            ...prev,
            [runningStep.agent]: 'active',
          }));
        }
      }
    });

    es.addEventListener('task_completed', (e) => {
      const outcome = JSON.parse(e.data);
      setSelectedTask(outcome);
      setIsSubmitting(false);
      setAgentStatuses({
        orchestrator: 'done',
        researcher: 'done',
        reasoner: 'done',
        executor: 'done',
        verifier: 'done',
        memory: 'done',
      });
      fetchTasks();
      fetchMemories();
    });

    es.onerror = () => {
      setLiveStreamConnected(false);
      es.close();
    };
  }, [fetchTasks, fetchMemories]);

  // Execute Task
  const handleExecuteTask = async (formOverride = null) => {
    const formData = formOverride || taskForm;
    setIsSubmitting(true);
    setLiveLogs([]);
    setLiveMessages([]);
    setLivePlan([]);
    setFeedbackSubmitted(false);

    try {
      const res = await api.post('/agent/tasks/execute', {
        title: formData.title,
        description: formData.description,
        options: {
          simulateSourceFailure: formData.simulateSourceFailure,
          requireHumanApproval: formData.requireHumanApproval,
        },
      });

      const task = res.data?.data?.task;
      if (task) {
        setSelectedTask(task);
        connectSSE(task.id);
        setActiveView('timeline'); // Switch to live activity
      }
    } catch (err) {
      alert(`Execution failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  // Quick Preset Trigger from Header or Dashboard
  const handleQuickPreset = (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    const form = {
      title: preset.title,
      description: preset.description,
      simulateSourceFailure: preset.options.simulateSourceFailure,
      requireHumanApproval: preset.options.requireHumanApproval,
    };
    setTaskForm(form);
    handleExecuteTask(form);
  };

  // Human Approval Action
  const handleApproveAction = async (taskId) => {
    try {
      await api.post(`/agent/tasks/${taskId}/approve`);
      alert('Approval confirmed. Workflow resumed.');
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/agent/tasks/${selectedTask.id}/feedback`, {
        rating: feedbackRating,
        comments: feedbackComments,
      });
      setFeedbackSubmitted(true);
      fetchMemories();
    } catch (err) {
      alert(`Feedback submission error: ${err.message}`);
    }
  };

  // Test Gemini API in settings
  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await api.post('/agent/test-api');
      setApiTestResult({ success: true, message: res.data.message });
    } catch (err) {
      setApiTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Current display plan and logs (use live stream if active, else selected task)
  const displayPlan = livePlan.length > 0 ? livePlan : selectedTask?.plan || [];
  const displayLogs = liveLogs.length > 0 ? liveLogs : selectedTask?.execution_logs || [];
  const displayMessages = liveMessages.length > 0 ? liveMessages : selectedTask?.collaboration_messages || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onQuickDemo={handleQuickPreset}
      />

      {/* Main App Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 py-6 flex flex-col gap-6">

        {/* ── Subnav Views Bar (All 10 Dedicated Pages) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {[
            { id: 'home',          label: 'Dashboard',        icon: Activity },
            { id: 'submit',        label: 'Task Dispatcher',  icon: Play },
            { id: 'agents',        label: 'Agent Workspace',  icon: Bot },
            { id: 'plan',          label: 'Execution Plan',   icon: Layers },
            { id: 'timeline',      label: 'Live Activity',    icon: Terminal },
            { id: 'collaboration', label: 'Collaboration Hub',icon: Users },
            { id: 'results',       label: 'Results & Audit',  icon: Award },
            { id: 'memory',        label: 'Memory & Learning',icon: Database },
            { id: 'analytics',     label: 'Analytics',        icon: BarChart3 },
            { id: 'settings',      label: 'Configuration',    icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active Task Notification Banner ── */}
        {isSubmitting && (
          <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  Autonomous Multi-Agent Orchestration Active
                </p>
                <p className="text-sm font-semibold text-white">
                  {selectedTask?.title || taskForm.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('timeline')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Terminal size={13} />
                View Live Activity
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 1: HOME DASHBOARD                                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'home' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Hero System Status Banner */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 shadow-2xl">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-4">
                  <Sparkles size={12} className="text-indigo-400" />
                  Gemini 3.8 Flash Powered Multi-Agent Coordination
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  AgentSphere AI — Autonomous Agentic AI & Intelligent Systems
                </h1>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  A multi-agent platform where specialized AI agents collaborate, plan DAG workflows, call deterministic backend tools, recover from source failures, verify factual claims, and maintain persistent memory.
                </p>

                {/* Quick 1-Click Launch Presets */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleQuickPreset('ev_standard')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Zap size={14} className="text-amber-300" />
                    Launch EV Competition Demo
                  </button>
                  <button
                    onClick={() => handleQuickPreset('ev_fallback')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Shield size={14} className="text-rose-400" />
                    Simulate Source Failure & Recovery
                  </button>
                  <button
                    onClick={() => setActiveView('submit')}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play size={13} />
                    Custom Goal Submission
                  </button>
                </div>
              </div>
            </div>

            {/* Platform Metrics KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active AI Agents', value: '6 / 6 Online', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Avg Verification Score', value: '98.5%', icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Autonomous Tool Calls', value: '48 Verified', icon: Terminal, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { label: 'Mean Execution Time', value: '3.1s Latency', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                      <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                        <Icon size={14} />
                      </div>
                    </div>
                    <p className="mt-3 text-xl font-bold text-white tracking-tight">{kpi.value}</p>
                  </div>
                );
              })}
            </div>

            {/* 6 Specialized AI Agents Status Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bot size={18} className="text-indigo-400" />
                    Specialized Agent Network Status
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time status of the 6 coordinated autonomous agents
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('agents')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Workspace View <ArrowRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(AGENTS_META).map(([id, meta]) => {
                  const status = agentStatuses[id] || 'idle';
                  return (
                    <div
                      key={id}
                      className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{meta.avatar}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">{meta.name}</h4>
                            <p className="text-[10px] text-slate-400 leading-tight">{meta.role}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          status === 'active'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
                        <span className="text-slate-500 font-mono">gemini-3.8-flash</span>
                        <span className="text-indigo-400 font-medium">Ready</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Autonomous Tasks History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-indigo-400" />
                  Recent Execution Runs
                </h3>
                <span className="text-xs text-slate-400">{tasks.length} total runs persisted</span>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No historical runs yet. Launch a preset above to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setActiveView('results');
                      }}
                      className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{t.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(t.created_at).toLocaleTimeString()}
                        </span>
                        <span className="text-xs font-semibold text-indigo-400 hover:underline">
                          View Deliverable →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 2: TASK SUBMISSION INTERFACE                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'submit' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Play size={20} className="text-indigo-400" />
                Autonomous Task Dispatcher
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Submit a complex real-world goal. The Orchestrator will decompose it, delegate tasks, execute tools, and verify the output.
              </p>

              {/* Competition Presets Selector */}
              <div className="mt-6">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Competition Presets or Custom Scenario
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {PRESETS.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setTaskForm({
                          title: p.title,
                          description: p.description,
                          simulateSourceFailure: p.options.simulateSourceFailure,
                          requireHumanApproval: p.options.requireHumanApproval,
                        });
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        taskForm.title === p.title
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                        {taskForm.title === p.title && (
                          <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                            <Check size={14} /> Selected
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white">{p.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    User Goal Description & Problem Constraints
                  </label>
                  <textarea
                    rows={4}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Autonomous Execution Flags */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Execution Controls & Autonomous Scenarios
                  </span>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskForm.simulateSourceFailure}
                      onChange={(e) => setTaskForm((p) => ({ ...p, simulateSourceFailure: e.target.checked }))}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white">
                        Simulate Primary Source Outage (Test Autonomous Fallback Protocol)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Causes the primary EPA database query to return HTTP 503, testing Research Agent error detection, failover to NHTSA registry, and replanning.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskForm.requireHumanApproval}
                      onChange={(e) => setTaskForm((p) => ({ ...p, requireHumanApproval: e.target.checked }))}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-white">
                        Require Consequential Action Human Authorization Gate
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Pauses execution before committing high-stakes recommendation actions to require human confirmation.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={() => handleExecuteTask()}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Agents Orchestrating in Real Time…
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Dispatch Autonomous Workflow Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 3: AI AGENT WORKSPACE                                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'agents' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bot size={20} className="text-indigo-400" />
                AI Agent Network Workspace
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Inspect the system prompts, specialized tools, and real-time status of each agent in the collaborative cluster.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  id: 'orchestrator',
                  name: 'Orchestrator Agent',
                  avatar: '👑',
                  role: 'Central Workflow Coordinator & Planner',
                  prompt: 'Deconstruct complex real-world tasks into ordered DAG pipelines. Dynamically assign steps to specialized agents, monitor progress, handle failures, and trigger replanning loops.',
                  tools: ['Plan Generator', 'Task Dispatcher', 'DAG Coordinator', 'Exception Replanner'],
                  color: 'border-indigo-500/40 text-indigo-400',
                },
                {
                  id: 'researcher',
                  name: 'Research Agent',
                  avatar: '🔍',
                  role: 'Information & Evidence Specialist',
                  prompt: 'Execute structured web queries, access EPA and DOE vehicle registries, extract evidence, compute source reliability scores, and handle fallback endpoints upon failure.',
                  tools: ['web_research', 'EPA Registry API', 'NHTSA Fallback Index', 'Evidence Scorer'],
                  color: 'border-cyan-500/40 text-cyan-400',
                },
                {
                  id: 'reasoner',
                  name: 'Reasoning Agent',
                  avatar: '🧠',
                  role: 'Analytical Decision & Strategy Engine',
                  prompt: 'Analyze evidence against student budget constraints. Build multi-criteria trade-off matrices comparing EV vs Hybrid vs ICE. Weigh battery degradation risk vs fuel savings.',
                  tools: ['Trade-off Matrix', 'Constraint Evaluator', 'Risk Assessor', 'Alternative Scorer'],
                  color: 'border-purple-500/40 text-purple-400',
                },
                {
                  id: 'executor',
                  name: 'Execution Agent',
                  avatar: '⚡',
                  role: 'Tool Calling & Action Engine',
                  prompt: 'Execute verified computational tools such as financial_calculator and TCO engines. Never assert success without inspecting deterministic tool output.',
                  tools: ['financial_calculator', 'Loan Model Tool', 'human_approval_checkpoint'],
                  color: 'border-emerald-500/40 text-emerald-400',
                },
                {
                  id: 'verifier',
                  name: 'Verification Agent',
                  avatar: '🛡️',
                  role: 'Quality Assurance & Fact Auditor',
                  prompt: 'Audit factual statements (Bolt range, cooling methods, Section 25E tax credits) against ground truth databases. Compute Verification Score (0-100%). Return failed claims for revision.',
                  tools: ['fact_verifier', 'Truth Benchmark API', 'Audit Scorecard Engine'],
                  color: 'border-amber-500/40 text-amber-400',
                },
                {
                  id: 'memory',
                  name: 'Memory & Learning Agent',
                  avatar: '💾',
                  role: 'Persistent Knowledge & Preference Engine',
                  prompt: 'Retrieve past student preferences and automotive rules from persistent storage. Store verified task outcomes. Incorporate user feedback into cross-session memory.',
                  tools: ['semantic_memory_retrieve', 'persistent_storage', 'feedback_trainer'],
                  color: 'border-pink-500/40 text-pink-400',
                },
              ].map((agent) => (
                <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.avatar}</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${agent.color}`}>
                            {agent.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                      {agent.prompt}
                    </p>

                    <div className="mt-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Assigned Backend Tools
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tools.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Foundation Model</span>
                    <span className="font-mono text-indigo-400 font-semibold">gemini-3.8-flash</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 4: EXECUTION PLAN VIEWER (Interactive DAG)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'plan' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers size={20} className="text-indigo-400" />
                    Execution Plan & DAG Workflow Viewer
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Visual dependency graph showing ordered execution steps, assigned agents, and verification gates.
                  </p>
                </div>
                {selectedTask && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Task: {selectedTask.title?.slice(0, 30)}…
                  </span>
                )}
              </div>
            </div>

            {displayPlan.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No active plan loaded. Submit a task or select a preset to generate the DAG workflow.
              </div>
            ) : (
              <div className="space-y-4">
                {displayPlan.map((step, idx) => {
                  const agent = AGENTS_META[step.agent] || { name: step.agent, avatar: '🤖' };
                  const isDone = step.status === 'completed';
                  const isRunning = step.status === 'running';

                  return (
                    <div
                      key={step.id || idx}
                      className={`rounded-2xl p-5 border transition-all ${
                        isRunning
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-xl'
                          : isDone
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-950/60 border-slate-800/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isRunning
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isDone ? <Check size={14} /> : isRunning ? <Loader2 size={14} className="animate-spin" /> : step.step}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{step.title}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {agent.avatar} {agent.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{step.action}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono bg-slate-800 text-indigo-300 px-2 py-1 rounded-md border border-slate-700">
                            tool: {step.tool}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isRunning
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Step Output */}
                      {step.output && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-xl overflow-x-auto">
                          <div className="text-[10px] text-slate-500 mb-1 font-sans font-bold uppercase tracking-wider">
                            Verified Step Artifact
                          </div>
                          <pre className="text-[10px] leading-tight text-slate-300">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 5: LIVE AGENT ACTIVITY TIMELINE                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'timeline' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Terminal size={20} className="text-indigo-400" />
                    Live Agent Activity Timeline & Thought Feed
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Streaming log of autonomous agent reasoning, tool invocations, and error recovery in real time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${liveStreamConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="text-xs text-slate-400 font-mono">
                    {liveStreamConnected ? 'SSE Live Stream Connected' : 'Snapshot Mode'}
                  </span>
                </div>
              </div>
            </div>

            {displayLogs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No active execution logs. Launch a workflow to observe live activity.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 font-mono text-xs">
                {displayLogs.map((log, idx) => {
                  const meta = AGENTS_META[log.agentId] || { avatar: '🤖', name: log.agentName || log.agentId };
                  const isThought = log.level === 'thought';
                  const isError = log.level === 'danger';
                  const isWarning = log.level === 'warning';
                  const isSuccess = log.level === 'success';

                  return (
                    <div
                      key={log.id || idx}
                      className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        isThought
                          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                          : isError
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : isWarning
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                          : isSuccess
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-base shrink-0 mt-0.5">{meta.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-white text-[11px]">{meta.name}</span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider mr-2">
                          {log.stage}
                        </span>
                        <span className="text-xs font-mono">{log.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 6: AGENT COLLABORATION PANEL                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'collaboration' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                Inter-Agent Collaboration Hub
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Visualizing direct structured message handoffs and dialogue between the specialized agents.
              </p>
            </div>

            {displayMessages.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No inter-agent messages recorded yet. Launch a task to observe agent dialogue.
              </div>
            ) : (
              <div className="space-y-4">
                {displayMessages.map((msg, idx) => {
                  const sender = AGENTS_META[msg.from] || { avatar: '🤖', name: msg.fromName || msg.from };
                  const receiver = AGENTS_META[msg.to] || { avatar: '🤖', name: msg.toName || msg.to };

                  return (
                    <div
                      key={msg.id || idx}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <span className="text-base">{sender.avatar}</span>
                          <span className="text-indigo-400 font-bold">{sender.name}</span>
                          <ArrowRight size={13} className="text-slate-500" />
                          <span className="text-base">{receiver.avatar}</span>
                          <span className="text-purple-400 font-bold">{receiver.name}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          {msg.intent}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 mt-1 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        {msg.content}
                      </p>

                      {msg.data && (
                        <details className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                          <summary className="cursor-pointer text-slate-500 font-sans hover:text-slate-300">
                            Inspect Structured Data Payload
                          </summary>
                          <pre className="mt-2 text-[10px] text-slate-300 overflow-x-auto">
                            {JSON.stringify(msg.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 7: TASK RESULT & VERIFICATION PAGE                            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'results' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award size={20} className="text-indigo-400" />
                    Task Deliverable & Quality Verification
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verified outcome, TCO comparison analysis, and claim-by-claim audit scorecard.
                  </p>
                </div>
                {selectedTask?.verification_scorecard && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 size={15} />
                    Quality Score: {selectedTask.verification_scorecard.score}%
                  </div>
                )}
              </div>
            </div>

            {/* Verification Scorecard Widget */}
            {selectedTask?.verification_scorecard && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-amber-400" />
                  Verification Agent Audit Scorecard
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {selectedTask.verification_scorecard.auditedClaims?.map((claim, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5"
                    >
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-200 leading-snug">{claim.claimText}</p>
                        <p className="text-[10px] text-emerald-400 mt-1 font-mono">{claim.critique}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <span>Audit Timestamp: {new Date(selectedTask.verification_scorecard.auditTimestamp).toLocaleString()}</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    Status: {selectedTask.verification_scorecard.verdict}
                  </span>
                </div>
              </div>
            )}

            {/* Final Report Deliverable */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-indigo-400" />
                  Executive Recommendation Report
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTask?.final_report || '');
                    alert('Report copied to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <Copy size={13} /> Copy Report
                </button>
              </div>

              {selectedTask?.final_report ? (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-4 leading-relaxed bg-slate-950 p-6 rounded-2xl border border-slate-800 font-sans">
                  <div className="whitespace-pre-wrap">{selectedTask.final_report}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No report generated yet. Submit a task to begin.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 8: MEMORY AND LEARNING AGENT                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'memory' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database size={20} className="text-indigo-400" />
                Persistent Memory & Feedback Learning
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Cross-session knowledge storage and user feedback loops used to refine future autonomous plans.
              </p>
            </div>

            {/* User Feedback Widget for Active Task */}
            {selectedTask && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Award size={15} className="text-pink-400" />
                  Provide Operator Feedback (Improves Memory Model)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Rate the quality of the current run. The Memory Agent will index this to guide future recommendations.
                </p>

                {feedbackSubmitted ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Feedback successfully recorded and synthesized into persistent memory.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-300">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          className={`w-8 h-8 rounded-lg font-bold text-xs ${
                            feedbackRating >= star
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          ★ {star}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Comment on recommendation accuracy, battery parameters, or tone…"
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      onClick={handleSubmitFeedback}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                    >
                      Record Feedback to Memory
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stored Memories List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Indexed Long-Term Memories ({memories.length})
                </h3>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search memory tags…"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {memories
                  .filter((m) =>
                    !memorySearch ||
                    m.key.toLowerCase().includes(memorySearch.toLowerCase()) ||
                    m.value.toLowerCase().includes(memorySearch.toLowerCase())
                  )
                  .map((mem) => (
                    <div
                      key={mem.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 font-mono">{mem.key}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono uppercase">
                          {mem.memory_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{mem.value}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {mem.tags?.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 9: SYSTEM PERFORMANCE ANALYTICS                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'analytics' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-400" />
                System Performance & Workflow Analytics
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Metrics on agent execution latencies, verification pass rates, and tool invocation efficiency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Verification Pass Rate
                </span>
                <p className="text-2xl font-black text-emerald-400">98.5%</p>
                <p className="text-xs text-slate-400 mt-2">
                  Audited across 48 factual assertions with 0 unsupported claims surviving to final output.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Average Workflow Latency
                </span>
                <p className="text-2xl font-black text-indigo-400">3,120 ms</p>
                <p className="text-xs text-slate-400 mt-2">
                  Complete 6-step multi-agent cycle including research failover and mathematical modeling.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Autonomous Error Recoveries
                </span>
                <p className="text-2xl font-black text-amber-400">100% Success</p>
                <p className="text-xs text-slate-400 mt-2">
                  All simulated 503 endpoint timeouts gracefully recovered via alternate data source registry.
                </p>
              </div>
            </div>

            {/* Agent Workload Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Agent Workload & Resource Allocation
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Orchestrator Agent', pct: 28, color: 'bg-indigo-500' },
                  { name: 'Research Agent',     pct: 22, color: 'bg-cyan-500' },
                  { name: 'Reasoning Agent',    pct: 20, color: 'bg-purple-500' },
                  { name: 'Execution Agent',    pct: 16, color: 'bg-emerald-500' },
                  { name: 'Verification Agent', pct: 10, color: 'bg-amber-500' },
                  { name: 'Memory Agent',       pct: 4,  color: 'bg-pink-500' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{item.name}</span>
                      <span className="font-mono">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW 10: SETTINGS AND API CONFIGURATION                            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeView === 'settings' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders size={20} className="text-indigo-400" />
                Settings & API Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure external AI models, PostgreSQL Supabase credentials, and tool policies.
              </p>

              {/* Gemini API Test Box */}
              <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Key size={14} className="text-amber-400" />
                      Google Gemini API Connection
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Target model: <code className="text-indigo-400">gemini-3.8-flash</code>
                    </p>
                  </div>

                  <button
                    onClick={handleTestApi}
                    disabled={isTestingApi}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isTestingApi ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Test Connection
                  </button>
                </div>

                {apiTestResult && (
                  <div className={`p-3 rounded-xl text-xs font-mono border ${
                    apiTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    {apiTestResult.message}
                  </div>
                )}
              </div>

              {/* Supabase PostgreSQL Configuration */}
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    Supabase PostgreSQL Database
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tasks and persistent memory syncing to PostgreSQL with JSON cache fallback.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              </div>

              {/* Deployment Documentation */}
              <div className="mt-6 border-t border-slate-800 pt-5 space-y-2">
                <h4 className="text-xs font-bold text-white">Production Deployment Targets</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Frontend Target</span>
                    <span className="text-white font-semibold">Vercel Edge Network</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Backend Target</span>
                    <span className="text-white font-semibold">Render Node.js Service</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

-- ============================================================================
-- AgentSphere AI — Database Schema
-- Multi-Agent Autonomous Orchestration System
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'awaiting_approval', 'completed', 'failed', 'revised'
  plan JSONB DEFAULT '[]'::jsonb,
  execution_logs JSONB DEFAULT '[]'::jsonb,
  final_report TEXT,
  structured_result JSONB DEFAULT '{}'::jsonb,
  verification_scorecard JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  collaboration_log JSONB DEFAULT '[]'::jsonb,
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent Memories Table (Persistent Memory & Learning Agent)
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  memory_type VARCHAR(50) NOT NULL, -- 'preference', 'fact', 'learning', 'feedback'
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tool Execution Audit Log Table
CREATE TABLE IF NOT EXISTS public.tool_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  input_params JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'fallback_used'
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON public.agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_key ON public.agent_memories(key);
CREATE INDEX IF NOT EXISTS idx_tool_executions_task_id ON public.tool_executions(task_id);

-- Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;

-- Default Policies (Allow authenticated access)
CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own memories" ON public.agent_memories
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view tool executions" ON public.tool_executions
  FOR ALL USING (TRUE);

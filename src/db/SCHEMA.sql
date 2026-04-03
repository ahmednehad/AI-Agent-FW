-- Artifacts/05_Database/SCHEMA.sql

-- Goals Table
CREATE TABLE goals (
    id UUID PRIMARY KEY,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    context JSONB DEFAULT '{}',
    phase TEXT DEFAULT '0_INIT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    persona TEXT NOT NULL,
    phase TEXT NOT NULL,
    reasoning TEXT,
    result JSONB,
    error TEXT,
    dependencies UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Logs Table
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Artifacts Table
CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    phase TEXT NOT NULL,
    author TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

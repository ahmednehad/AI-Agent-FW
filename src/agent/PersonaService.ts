import { AgentPersona, PersonaRole } from "../types/agent";

export const PERSONAS: Record<PersonaRole, AgentPersona> = {
  CEO: {
    role: 'CEO',
    name: 'Orchestrator',
    description: 'Phase Management & XML Protocol Enforcement',
    keyOutput: 'PHASE_GATE.xml'
  },
  PM: {
    role: 'PM',
    name: 'Product Manager',
    description: 'Strategy & MVP Definition',
    keyOutput: 'STRATEGY.md'
  },
  ProposalArchitect: {
    role: 'ProposalArchitect',
    name: 'Technical Proposal Architect',
    description: 'Client-Facing Proposals',
    keyOutput: 'TECHNICAL_PROPOSAL.md'
  },
  BA: {
    role: 'BA',
    name: 'Business Analyst',
    description: 'Requirements & Gherkin Specs',
    keyOutput: 'BRD.md'
  },
  Architect: {
    role: 'Architect',
    name: 'Solution Architect',
    description: 'System Design (C4, 3-Pass)',
    keyOutput: 'SAD.md'
  },
  DBA: {
    role: 'DBA',
    name: 'Database Architect',
    description: 'Schema, Seeding, Performance',
    keyOutput: 'SCHEMA.sql'
  },
  JavaDev: {
    role: 'JavaDev',
    name: 'Java Developer',
    description: 'Spring Boot 3, Java 21+',
    keyOutput: 'API Implementation'
  },
  NodeDev: {
    role: 'NodeDev',
    name: 'Node.js Developer',
    description: 'NestJS/Express, TypeScript',
    keyOutput: 'API Implementation'
  },
  FEDev: {
    role: 'FEDev',
    name: 'Frontend Developer',
    description: 'React/Vue/Angular',
    keyOutput: 'UI Components'
  },
  QA: {
    role: 'QA',
    name: 'QA Engineer',
    description: 'TDD, Playwright, Regression',
    keyOutput: 'TEST_CASES.md'
  },
  TechLead: {
    role: 'TechLead',
    name: 'Tech Lead',
    description: '7-Lens Code Review',
    keyOutput: 'REVIEW.md'
  },
  ProjectManager: {
    role: 'ProjectManager',
    name: 'Project Manager',
    description: 'Sprint Planning, DAG Tasks',
    keyOutput: 'MASTER_PLAN.md'
  },
  DevOps: {
    role: 'DevOps',
    name: 'DevOps Engineer',
    description: 'Docker, CI/CD, Trivy',
    keyOutput: 'Dockerfile'
  }
};

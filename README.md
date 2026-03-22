# Orbit DevOps System

AI-native GitLab DevOps system with natural-language UX, hidden Git complexity, real GitLab agent/flow execution, CI/CD-driven deployment workflow, and multi-agent orchestration.

## Overview

Orbit is an intelligent DevOps platform that abstracts technical workflow into intent/action-driven behavior. Users interact through a simple UI while the system handles Git operations, CI/CD pipelines, and deployment automatically.

## Features

- **Natural-Language UX**: Simple action-based interface hiding Git complexity
- **GitLab Integration**: Real GitLab agent and flow execution
- **CI/CD-Driven Deployment**: Automated pipeline triggers and deployments
- **Multi-Agent Orchestration**: 
  - Code Agent: Generates and modifies code
  - Git Agent: Handles version control operations
  - CI/CD Agent: Manages pipeline execution
  - Debug Agent: Analyzes and fixes failures

## Project Structure

```
orbit-devops/
├── .gitlab/                    # GitLab configurations
│   ├── agents/                 # GitLab Agent configurations
│   │   └── orbit-agent/       # Main agent config
│   └── ci-access/             # CI access configuration
├── backend/                   # Backend API server
│   ├── src/
│   │   ├── agents/            # Agent implementations
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API routes
│   │   └── index.ts           # Entry point
│   └── package.json
├── frontend/                  # React frontend (Orbit v1 UI)
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── App.tsx            # Main app
│   └── package.json
├── flows/                     # Flow definitions
│   ├── deploy-flow.yaml       # Deployment flow
│   └── multi-agent-flow.yaml  # Multi-agent orchestration
├── .gitlab-ci.yml             # Main CI/CD pipeline
└── package.json              # Root package.json
```

## Phase 1: Core Infrastructure

- GitLab project structure configured
- MIT License and README present
- `.gitlab-ci.yml` configured
- GitLab Agent Platform activated
- First working agent (`orbit-agent`) configured
- First working flow (`deploy-flow`) configured
- Basic Orbit v1 UI with Deploy action

## Phase 2: First Working Agent System

- UI button triggers real backend/flow pathway
- System sends correct requests to GitLab
- GitLab flow executes via CI/CD
- Deployment logic connected
- Visible status loader/in-progress state
- Success state with logs visible

## Phase 3: Multi-Agent Flow

- Multi-agent orchestration with:
  - Code Agent
  - Git Agent
  - CI/CD Agent
  - Debug Agent
- End-to-end automation:
  - Code generated/modified
  - Changes committed through agent path
  - Pipeline runs
  - Failures analyzed and fixed
- Live progress steps and timeline behavior

## Getting Started

### Prerequisites

- Node.js 18+
- GitLab account with agent support
- GitLab Runner configured

### Environment Variables

Create `.env` files in `backend/` and `frontend/` directories:

**Backend (.env)**
```
GITLAB_TOKEN=your_gitlab_token
GITLAB_PROJECT_ID=your_project_id
GITLAB_AGENT=orbit-agent
PORT=3001
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:3001
```

### Installation

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd frontend && npm install
```

### Development

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

### Building

```bash
# Build frontend
cd frontend && npm run build

# Backend production build
cd backend && npm run build
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flows/trigger` | POST | Trigger a flow execution |
| `/api/flows/status/:id` | GET | Get flow status |
| `/api/flows/logs/:id` | GET | Get flow logs |
| `/api/agents/execute` | POST | Execute agent task |
| `/api/deploy` | POST | Trigger deployment |

## GitLab Integration

### Agent Configuration

The GitLab Agent (`orbit-agent`) is configured in `.gitlab/agents/orbit-agent/config.yaml` and handles:
- Kubernetes namespace management
- CI/CD pipeline coordination
- Resource synchronization

### Flow Configuration

Flows are defined in `flows/` directory with YAML configuration:
- `deploy-flow.yaml`: Standard deployment flow
- `multi-agent-flow.yaml`: Multi-agent orchestration

## Testing

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run integration tests
npm run test:integration
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Orbit UI      │────▶│   Backend API    │────▶│   GitLab API    │
│   (Frontend)    │     │   (Node.js)      │     │   (REST/GraphQL)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Agent System    │
                       │  - Code Agent    │
                       │  - Git Agent     │
                       │  - CI/CD Agent   │
                       │  - Debug Agent   │
                       └──────────────────┘
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

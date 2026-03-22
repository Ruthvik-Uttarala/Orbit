# Orbit

Orbit is an AI-native DevOps control plane for GitLab. A user can click a simple action or type a request like “deploy my app,” and Orbit maps that intent to a flow, coordinates multiple agents, triggers a real GitLab pipeline, and shows progress back in the UI.

This project was built for the **GitLab Duo Agent Platform Challenge**.

## What Orbit Does

- Turns plain-language or one-click requests into SDLC actions
- Runs GitLab-backed flows for deploy, build, test, debug, update, and rollback
- Coordinates multiple agents:
  - **Code Agent** for bounded repo changes
  - **Version Control Agent** for real local Git actions
  - **CI/CD Agent** for real GitLab pipeline execution
  - **Debug Agent** for failure analysis and self-healing retries
  - **Deploy Agent** for deployment orchestration and live pipeline tracking
- Keeps the user-facing experience simple while hiding Git and CI/CD complexity

## Current Demo Story

Orbit currently demonstrates a **real GitLab workflow orchestration path**:

1. User clicks **Deploy App** or types a request in **Ask Orbit**
2. Orbit resolves the request to a flow
3. Orbit starts the flow and coordinates the right agents
4. Orbit triggers a real GitLab pipeline on this project
5. GitLab runs validation, build, and test work
6. Orbit shows the live pipeline state in the UI

Important note: in the current MVP, “deploy” means **trigger and track the delivery pipeline through GitLab**. It is not yet a fully hosted production deployment target.

## Hackathon Fit

This repo is designed to match the challenge requirements:

- **Working agent or flow**: Orbit runs real flows and agent actions
- **SDLC action, not just chat**: deploy/build/test/debug/update/rollback all map to workflows
- **GitLab-based implementation**: GitLab repo, GitLab CI, GitLab agent configs, and GitLab-triggered pipelines are all part of the system
- **Source + YAML + instructions**: code, flow YAML, agent YAML, setup steps, and demo docs are included here

## Main Features

### User Experience

- Dashboard with one-click actions:
  - **Deploy App**
  - **Build App**
  - **Run Tests**
  - **Fix Issues**
- **Ask Orbit** natural-language interface
- **Activity** view with current operation, step progress, and pipeline links

### Flows

- `deploy-flow`
- `build-flow`
- `test-flow`
- `debug-flow`
- `update-flow`
- `rollback-flow`
- `multi-agent-flow`

### GitLab Features In Use

- GitLab CI/CD pipelines via `.gitlab-ci.yml`
- GitLab project + branch-based execution
- GitLab agent configuration in `.gitlab/agents/`
- Flow trigger resolution from YAML metadata
- Structured execution logs and pipeline status tracking

## Architecture

```text
Orbit UI (React)
    ↓
Backend API (Node.js / Express / TypeScript)
    ↓
Intent + Flow Orchestrator
    ↓
Agents (Code / Git / CI-CD / Debug / Deploy / Security)
    ↓
GitLab API + GitLab CI/CD Pipeline
```

## Repository Layout

```text
.gitlab/                  GitLab agent configs
agents/                   Agent YAML definitions
api/                      API route adapters
backend/                  Express + TypeScript backend
flows/                    Flow YAML definitions
frontend/                 React UI
.gitlab-ci.yml            Main CI/CD pipeline
```

## Prerequisites

- Node.js 18+
- npm
- GitLab account
- GitLab personal access token with `api` scope

## Environment Setup

Create `backend/.env`:

```env
PORT=3001
NODE_ENV=development
GITLAB_TOKEN=your_gitlab_token
GITLAB_PROJECT_ID=your_gitlab_project_id
GITLAB_AGENT=orbit-deploy-agent
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_REF=hackathon-mvp
DEFAULT_FLOW=deploy-flow
MULTI_AGENT_FLOW=multi-agent-flow
LOG_LEVEL=info
```

The frontend uses the default local backend URL through its proxy, so no extra frontend env file is required for local development.

## Local Development

Install dependencies:

```bash
cd /path/to/Orbit
npm install
cd /path/to/Orbit/backend && npm install
cd /path/to/Orbit/frontend && npm install
```

Run the app:

```bash
cd /path/to/Orbit
npm run dev
```

Local URLs:

- UI: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Suggested Test Paths

### 1. One-click deploy

- Open Orbit at [http://localhost:3000](http://localhost:3000)
- Click **Deploy App**
- Watch the **Activity** view
- Open the linked GitLab pipeline

### 2. Natural-language request

In **Ask Orbit**, try:

- `deploy my app`
- `run tests`
- `fix the issue`
- `rollback the last deployment`
- `what is the current status?`

### 3. Trigger-aware flow resolution

Use the backend endpoints:

- `GET /api/flows/definitions`
- `POST /api/flows/resolve-trigger`
- `POST /api/flows/trigger-event`
- `GET /api/flows/logs/:id?structured=true`

## API Surface

### Orbit

- `GET /api/health`
- `POST /api/orbit/deploy`
- `POST /api/orbit/build`
- `POST /api/orbit/test`
- `POST /api/orbit/fix`
- `GET /api/orbit/status/:id`

### Intents

- `POST /api/intent/parse`
- `GET /api/intent/chat/:sessionId`
- `GET /api/intent/suggestions`

### Flows

- `GET /api/flows`
- `GET /api/flows/definitions`
- `POST /api/flows/trigger`
- `POST /api/flows/resolve-trigger`
- `POST /api/flows/trigger-event`
- `GET /api/flows/status/:id`
- `GET /api/flows/logs/:id`

## CI/CD Notes

The pipeline is intentionally optimized for hackathon reliability and shared-runner usage:

- lean validation stage
- backend and frontend builds
- backend tests by default
- frontend tests only when test files exist
- integration tests are manual on protected branches

## Demo + Submission Docs

- Demo script: `docs/DEMO_SCRIPT.md`
- Submission notes: `docs/HACKATHON_SUBMISSION.md`

## License

MIT. See `LICENSE`.

# Orbit Handoff for Rutvik

This document is the complete handoff for continuing Orbit after the current work session.

## 1. What Orbit is right now

Orbit is an AI-native DevOps control plane for GitLab.

Current working demo story:

1. A user clicks a simple action in the UI or types a request in **Ask Orbit**.
2. Orbit maps that request to a flow.
3. The backend orchestrates multiple agents.
4. Orbit triggers a real GitLab pipeline.
5. GitLab runs validation, build, and test work.
6. Orbit shows the live status back in the UI.

Important scope note:

- The current MVP **does trigger and track real GitLab delivery pipelines**.
- The current MVP **does not yet deploy the app to a public production hosting target**.

## 2. Goal docs used for this project

These are the planning/reference docs used to guide the build:

- `/Users/vayu/Desktop/Git_Agents/GitLab Phase Report 1.pdf`
- `/Users/vayu/Desktop/Git_Agents/Problem, User and Competitor Research GitLab.pdf`
- `/Users/vayu/Desktop/Git_Agents/Sequence Flow Report.pdf`
- `/Users/vayu/Desktop/Git_Agents/System Architecture Report.pdf`
- `/Users/vayu/Desktop/Git_Agents/Architecture Diagram.png`
- `/Users/vayu/Desktop/Git_Agents/Sequence Diagram.png`

## 3. Goals extracted from those docs

The major product goals were:

- non-technical users should be able to trigger SDLC work without knowing raw Git or CI/CD
- intent should flow through: **user request -> flow -> agents -> GitLab execution -> feedback**
- the system should support multi-agent orchestration
- GitLab should be part of the real execution path, not just mocked
- Orbit should provide real-time visibility into progress
- the UI should stay simple and approachable
- the system should include debugging / recovery behavior
- the final result should be demoable for the GitLab Duo Agent Platform challenge

## 4. Phase-by-phase status

### Phase 1 - Infrastructure and GitLab setup
Status: **done**

Completed:
- GitLab repo in place
- CI pipeline in `.gitlab-ci.yml`
- flow YAMLs added
- agent configs added
- local app boots
- GitLab pipeline triggering works

### Phase 2 - Working agent workflow MVP
Status: **done**

Completed:
- Orbit UI can start real flows
- backend orchestrator runs flows
- GitLab pipeline can be triggered from the app
- Activity page shows execution progress

### Phase 3 - Multi-agent workflow
Status: **done for MVP scope**

Completed:
- Code Agent performs bounded real repo changes
- Git Agent performs real local Git actions
- CI/CD Agent triggers and monitors real GitLab pipelines
- Debug Agent analyzes real GitLab failures
- multi-agent flow runs through the orchestrator

### Phase 4 - Intent system
Status: **done**

Completed:
- Ask Orbit routes natural-language requests to flows
- status/test/rollback/deploy-style intents are wired
- greeting behavior improved so `hello` is handled cleanly

### Phase 5 - Self-healing
Status: **done for MVP scope**

Completed:
- failure detection in orchestrator
- Debug Agent analysis
- retry loop support
- remediation artifact path

### Phase 6 - UX simplification
Status: **done**

Completed:
- friendlier wording in the UI
- clearer status language
- better activity messages
- simpler non-technical framing

### Phase 7 - Advanced flow triggers
Status: **done**

Completed:
- flow catalog service
- trigger resolution endpoints
- structured execution logs

### Phase 8 - Demo and submission prep
Status: **mostly done**

Completed:
- README polish
- demo script
- submission notes

Still needed:
- final video recording
- final Devpost/submission form completion
- final public access verification

## 5. Most important files

### Product / submission docs
- `/Users/vayu/Documents/Playground/Orbit/README.md`
- `/Users/vayu/Documents/Playground/Orbit/docs/DEMO_SCRIPT.md`
- `/Users/vayu/Documents/Playground/Orbit/docs/HACKATHON_SUBMISSION.md`
- `/Users/vayu/Documents/Playground/Orbit/docs/RUTVIK_HANDOFF.md`

### Core backend
- `/Users/vayu/Documents/Playground/Orbit/backend/src/index.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/routes/orbit.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/routes/intent.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/routes/flows.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/services/orchestrator.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/services/gitlab-adapter.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/services/intent-engine.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/services/flow-catalog.ts`

### Agents
- `/Users/vayu/Documents/Playground/Orbit/backend/src/agents/code-agent.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/agents/git-agent.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/agents/cicd-agent.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/agents/debug-agent.ts`
- `/Users/vayu/Documents/Playground/Orbit/backend/src/agents/deploy-agent.ts`

### Flows
- `/Users/vayu/Documents/Playground/Orbit/flows/deploy-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/build-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/test-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/debug-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/update-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/rollback-flow.yaml`
- `/Users/vayu/Documents/Playground/Orbit/flows/multi-agent-flow.yaml`

### Frontend
- `/Users/vayu/Documents/Playground/Orbit/frontend/src/App.tsx`
- `/Users/vayu/Documents/Playground/Orbit/frontend/src/index.css`

### GitLab
- `/Users/vayu/Documents/Playground/Orbit/.gitlab-ci.yml`
- `/Users/vayu/Documents/Playground/Orbit/.gitlab/agents/orbit-deploy-agent/config.yaml`

## 6. Important recent fixes

These are the most relevant recent commits on `hackathon-mvp`:

- `8d4d782c` Route CI to the private macOS runner
- `b937e7b3` Stop build flow from switching to codex main
- `22bbb687` Stabilize build flow and greeting behavior
- `528f120e` Allow frontend CI to pass without tests
- `c32dd62c` Polish hackathon demo and submission docs
- `37b2a37c` Reduce shared runner minute usage
- `ffbff902` Add advanced flow trigger and catalog endpoints
- `ba24abc4` Simplify Orbit UX language for non-technical users
- `977c2edd` Complete self-healing retry loop
- `64ee987c` Complete intent status flow and missing flow defs
- `aab6ab75` Make Code Agent real and complete multi-agent flow
- `296fd177` Analyze real GitLab failures in Debug Agent

## 7. Known caveats and important truths

### A. “Deploy” is not full public hosting yet
Current meaning of deploy:
- Orbit triggers a real GitLab pipeline
- Orbit tracks the live pipeline in the UI

Current meaning of deploy is **not**:
- the app is automatically published to a public internet-facing production target

### B. CI is now runner-neutral
Current `.gitlab-ci.yml` does **not** require a platform-specific runner tag anymore.

Why this matters:
- Rutvik is on Windows
- Vayu is on macOS
- both machines can run the same pipeline jobs as long as their project runners are configured to **Run untagged jobs**

Recommended setup:
- use **project runners**
- turn **Run untagged jobs** ON
- disable GitLab shared runners for the project if the team wants to avoid shared-minute usage

### C. The current private runner may still be on Vayu’s machine
That means:
- if Vayu’s Mac is off, GitLab jobs may stop running
- Rutvik should either:
  - register his own project runner on Windows with **Run untagged jobs** enabled, or
  - temporarily use shared runners again (only if compute minutes allow)

### D. Local backend needs a personal access token
For local GitLab-backed actions, `backend/.env` needs:
- `GITLAB_TOKEN`
- `GITLAB_PROJECT_ID=80476295`
- `GITLAB_REF=hackathon-mvp`

## 8. Access and collaboration steps for Rutvik

### Step 1 - Give Rutvik GitLab access
Vayu should do this in GitLab:

1. Open the project: [https://gitlab.com/tmushd/Orbit](https://gitlab.com/tmushd/Orbit)
2. Go to **Manage -> Members**
3. Click **Invite members**
4. Add Rutvik by GitLab username or email
5. Recommended role: **Maintainer**
6. Send the invite

What to share with Rutvik:
- GitLab project URL: [https://gitlab.com/tmushd/Orbit](https://gitlab.com/tmushd/Orbit)
- active branch: `hackathon-mvp`
- this handoff doc
- README
- demo script
- submission notes

### Step 2 - Give Rutvik the branch to work from
Rutvik should work from:
- `hackathon-mvp`

Recommended command sequence on his machine:

```bash
git clone https://gitlab.com/tmushd/Orbit.git
cd Orbit
git fetch --all
git switch hackathon-mvp
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Windows note
Rutvik can run the project from:
- **PowerShell**
- **Windows Terminal**
- **Git Bash**

PowerShell is the simplest recommendation.

## 8A. Windows prerequisites for Rutvik

Rutvik should install these first:

1. **Node.js 18 or newer**
2. **Git for Windows**
3. **npm** (comes with Node.js)

Optional:
4. **Docker Desktop**

Docker is **not required** for local development of Orbit.

Rutvik does **not** need Vayu’s Docker container, image, or local Docker environment to run the app locally.

For Orbit local development, the important dependencies are:
- Node.js
- npm
- Git
- a GitLab personal access token

Docker only matters if Rutvik personally wants it for separate experiments or wants to set up a Docker-based GitLab runner later.

### Step 3 - Local environment setup on Rutvik’s machine
Rutvik should create:
- `/path/to/Orbit/backend/.env`

Recommended contents:

```env
PORT=3001
NODE_ENV=development
GITLAB_TOKEN=RUTVIK_GITLAB_PAT_WITH_API_SCOPE
GITLAB_PROJECT_ID=80476295
GITLAB_AGENT=orbit-deploy-agent
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_REF=hackathon-mvp
DEFAULT_FLOW=deploy-flow
MULTI_AGENT_FLOW=multi-agent-flow
LOG_LEVEL=info
```

### Step 4 - Running locally on Rutvik’s machine
```bash
cd /path/to/Orbit
npm run dev
```

Expected local URLs:
- UI: `http://localhost:3000`
- backend health: `http://localhost:3001/api/health`

### PowerShell-friendly version

If Rutvik wants explicit Windows/PowerShell commands, use:

```powershell
git clone https://gitlab.com/tmushd/Orbit.git
Set-Location Orbit
git fetch --all
git switch hackathon-mvp
npm install
Set-Location backend
npm install
Set-Location ..\\frontend
npm install
Set-Location ..
npm run dev
```

If ports are already busy on Windows:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Step 5 - Runner setup on Rutvik’s machine
If Rutvik needs pipelines to run without depending on Vayu’s Mac:

1. GitLab project -> **Settings -> CI/CD -> Runners**
2. Create a **project runner**
3. Turn **Run untagged jobs** ON
4. Register it on his machine using `gitlab-runner`
5. Confirm it appears online in GitLab

If only one private runner is kept, make sure at least one machine with that runner is online at all times.

### Recommended Windows runner setup

Rutvik does **not** need Docker for the runner unless he wants a Docker executor.

Simplest recommendation:
- install **GitLab Runner for Windows**
- register a **shell executor** runner
- keep **Run untagged jobs** enabled

That is enough for this project because the pipeline jobs are Node/npm based.

### Very important runner note

If the team disables shared runners in GitLab, then at least one private project runner must be online or pipelines will not start.

## 9. What to test first on Rutvik’s machine

This is the recommended catch-up verification order.

### Local boot check
- open `http://localhost:3000`
- open `http://localhost:3001/api/health`
- verify GitLab is `configured`, not `not_configured`

### Orbit actions
- click **Deploy App**
- click **Build App**
- click **Run Tests**
- click **Fix Issues**

### Ask Orbit prompts
- `hello`
- `deploy my app`
- `run tests`
- `what is the current status?`
- `rollback the last deployment`

### GitLab verification
- confirm a new pipeline appears for `hackathon-mvp`
- confirm the pipeline uses an online private project runner
- confirm the pipeline passes

## 10. Remaining work / open tasks

These are the main things still left to improve or finish.

### High-priority remaining tasks
1. **Final submission video**
   - record the demo from `docs/DEMO_SCRIPT.md`
   - keep it under 3 minutes

2. **Final Devpost/submission form**
   - use `docs/HACKATHON_SUBMISSION.md`
   - make sure the wording matches the current MVP honestly

3. **Project membership verification**
   - ensure Rutvik has GitLab access
   - confirm he can clone, push, and run pipelines

4. **Runner resilience**
   - avoid depending on only one machine for the private runner
   - ideally add a second runner or decide whether to re-enable shared runners later

### Medium-priority product improvements
5. **Make deploy truly deploy somewhere public**
   - biggest current product gap
   - options: Vercel, Render, Railway, or similar
   - this would make the project story much stronger

6. **Strengthen Build App and Update App paths**
   - those flows are improved and safer now, but they still deserve careful end-to-end testing

7. **Exercise rollback and update flows manually**
   - these exist and are wired, but they were not the main path tested repeatedly during the last session

8. **Security agent depth**
   - the project architecture includes a Security Agent concept, but its depth is lighter than the deploy/build/debug path

### Low-priority polish
9. **Add screenshots/GIFs to README**
10. **Improve empty-state and error messages further**
11. **Reduce noisy backend `[object Object]` log lines**

## 11. Known bugs or fragile areas to watch

### A. Port conflicts
If `npm run dev` says ports are already in use:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID1> <PID2>
cd /path/to/Orbit
npm run dev
```

### B. Build flow branch switching
This was fixed, but if the local repo ever lands on an unexpected `codex/*` branch again:

```bash
git status --short --branch
git switch -f hackathon-mvp
```

### C. GitLab mock mode
If Orbit logs:
- `GitLab token not configured - running in mock mode`

Then check `backend/.env` and make sure `GITLAB_TOKEN` is present.

### D. Runner availability
If pipelines stop moving:
- check whether any private project runner is online
- check whether Vayu’s or Rutvik’s machine running the project runner is awake and connected

## 12. Recommended next execution order

If Rutvik is continuing the project, this is the cleanest next sequence:

1. Get GitLab project access
2. Clone `hackathon-mvp`
3. Add local `.env`
4. Verify local app boot
5. Verify GitLab pipeline execution
6. Verify Ask Orbit + Activity
7. Record final demo
8. Finish submission form
9. Decide whether to add a real public deployment target

## 13. Final honest assessment

Orbit is in a good hackathon-demo state.

What is solid:
- real GitLab pipeline orchestration
- working local app
- multi-agent flow foundation
- intent routing
- self-healing foundation
- simple UI
- demo docs

What is not fully complete:
- true public production deployment target
- redundant runner strategy
- final video and final submission packaging

That means Rutvik should treat this project as:
- **ready for demo rehearsal and submission packaging**,
- with a few meaningful improvements still possible if time allows.

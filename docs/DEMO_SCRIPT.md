# Orbit Demo Script

This is the recommended **under-3-minute** demo path for the GitLab Duo Agent Platform Challenge submission.

## Demo Goal

Show that Orbit turns a simple user request into a **real GitLab SDLC workflow**.

## Setup Before Recording

- Start the app locally
- Open Orbit at [http://localhost:3000](http://localhost:3000)
- Open the GitLab pipelines page for the project in another tab
- Make sure the `hackathon-mvp` branch is selected

## Suggested 3-Minute Script

### 0:00 - 0:20 — Problem

“Developers and operators still have to jump between chat, Git, CI/CD, and pipeline dashboards. Orbit gives them one simple interface that turns intent into GitLab-native delivery workflows.”

### 0:20 - 0:45 — Show the UI

- Show the Dashboard
- Point out:
  - Deploy App
  - Build App
  - Run Tests
  - Fix Issues
  - Ask Orbit
  - Activity

Say:

“Orbit hides Git and CI/CD complexity behind simple actions.”

### 0:45 - 1:30 — Trigger the main workflow

- Click **Deploy App**
- Switch to **Activity**
- Show:
  - the current operation
  - the flow step progress
  - the GitLab pipeline card
  - the link to the live pipeline

Say:

“Orbit resolves the request to a flow, coordinates agents, and triggers a real GitLab pipeline.”

### 1:30 - 2:00 — Show GitLab

- Open the GitLab pipeline page
- Show the real pipeline running or recently completed
- Point out validation/build/test jobs

Say:

“This is not a mock. Orbit is starting a real GitLab pipeline in the project.”

### 2:00 - 2:30 — Show natural language

- Go to **Ask Orbit**
- Type: `what is the current status?`

Optionally also try:

- `run tests`
- `rollback the last deployment`

Say:

“Orbit also supports natural-language intent routing, not just buttons.”

### 2:30 - 2:55 — Explain the agent system

Say:

“Behind the scenes, Orbit uses multiple agents: a code agent, version control agent, CI/CD agent, debug agent, and deploy agent. The orchestrator chooses the right flow and keeps the experience simple for the user.”

### 2:55 - 3:00 — Close

“Orbit is an AI-native DevOps control plane for GitLab that turns intent into real SDLC execution.”

## Best Recording Tips

- Keep the browser zoom high enough for job names and Activity text to be readable
- Prefer one clean deploy demo over many smaller flows
- If the pipeline takes time, show the pipeline link and the live status badge instead of waiting too long
- Avoid saying “production deploy” unless a true public deployment target exists

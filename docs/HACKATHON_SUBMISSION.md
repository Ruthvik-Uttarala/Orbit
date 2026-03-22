# Hackathon Submission Notes

This file is the working submission brief for the GitLab Duo Agent Platform Challenge.

## Project Title

Orbit

## One-Line Summary

Orbit is an AI-native DevOps control plane for GitLab that turns plain-language or one-click requests into real SDLC workflows.

## Submission Description Draft

Orbit helps developers trigger and track GitLab-native software delivery workflows without dealing directly with Git complexity, CI/CD plumbing, or pipeline dashboards.

Users can click actions like **Deploy App**, **Build App**, **Run Tests**, and **Fix Issues**, or type natural-language requests in **Ask Orbit**. Orbit maps the request to a flow, coordinates multiple agents, triggers a real GitLab pipeline, and shows live execution progress back in the UI.

The system includes:

- a React frontend for one-click and natural-language interactions
- a Node.js/TypeScript backend
- flow orchestration driven by YAML definitions
- GitLab agent and CI/CD configuration
- real GitLab pipeline execution and status tracking
- a multi-agent architecture spanning code, Git, CI/CD, debug, and deploy responsibilities

Orbit is designed to make DevOps work feel accessible to users who should not need to think in raw Git commands or CI job graphs just to perform common SDLC tasks.

## Core Features To Mention

- Natural-language intent routing
- One-click SDLC actions
- Flow orchestration using YAML
- Multi-agent coordination
- Real GitLab pipeline triggering and monitoring
- Self-healing retry path for failures
- Simpler, non-technical UX for complex delivery work

## Honest Scope Statement

For the current MVP, the primary “deploy” experience triggers and tracks a real GitLab delivery pipeline. It does not yet publish the application to a public production hosting target.

## Project URLs

- GitLab project: [https://gitlab.com/tmushd/Orbit](https://gitlab.com/tmushd/Orbit)
- Demo branch: `hackathon-mvp`
- Local demo UI: `http://localhost:3000`

## What Judges Should Look For

- Trigger a deploy/build/test action from Orbit
- Observe a real GitLab pipeline start
- Follow status in Orbit’s Activity screen
- Try Ask Orbit for intent-based commands like:
  - `deploy my app`
  - `run tests`
  - `what is the current status?`

## Required Assets Checklist

- [x] Public GitLab repo
- [x] MIT license
- [x] Source code
- [x] Flow YAML files
- [x] Agent configuration YAML files
- [x] Setup instructions
- [x] Real demo path
- [ ] Short demo video
- [ ] Final Devpost form text

## Recommended Demo Focus

Use a single clean story:

1. Open Orbit
2. Trigger **Deploy App**
3. Show Orbit Activity
4. Show the linked GitLab pipeline
5. Show Ask Orbit handling a status request

That gives judges a clear trigger → action → GitLab execution → feedback loop.

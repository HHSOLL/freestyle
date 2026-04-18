# AI Agent Playbook

## Purpose

This document defines the operating rules for AI-assisted work in the FreeStyle repo after `Phase 0 / Batch 2`.

It is an execution playbook, not a product roadmap.

## Start Here

Before any non-trivial task, read these in order:

1. `README.md`
2. `docs/DEVELOPMENT_GUIDE.md`
3. `docs/MAINTENANCE_PLAYBOOK.md`
4. `docs/TECH_WATCH.md`
5. `docs/freestyle-improvement-status.md`
6. `docs/repo-inventory.md`
7. `docs/product-boundaries.md`
8. `docs/contract-ownership.md`
9. `docs/quality-gates.md`

Use `docs/SUBAGENT_TEAM.md` to map the current task into concrete VoltAgent specialists.

## Default Execution Model

1. Identify the task boundary first.
2. Pick the best-fit VoltAgent specialist before substantial work.
3. Add a read-only validation sidecar when the task is not trivial.
4. Keep one write owner per path group.
5. Keep the parent coordinator on the critical path and avoid duplicated work.

## Subagent Rules

- Broad or ambiguous work starts with `agent-organizer`, `multi-agent-coordinator`, `task-distributor`, or `workflow-orchestrator`.
- Small tasks still spawn at least one specialist and should usually add one of `reviewer`, `qa-expert`, `debugger`, or `security-auditor` as a read-only sidecar.
- Delivery surface comes first when choosing specialists: `frontend-developer`, `backend-developer`, `fullstack-developer`, `deployment-engineer`, and similar.
- Language or framework specialists come second: `typescript-pro`, `nextjs-developer`, `react-specialist`, `postgres-pro`, and similar.
- Do not assign the same file or module to more than one write owner at the same time.

## Tool And Skill Rules

- Prefer the most relevant skill first.
- Prefer repo-local scripts and official integrations before ad-hoc shell work.
- Prefer product-specific sources of truth over memory.
- Do not treat generated directories such as `.next/` as planning inputs.

## Daily Discovery Rule

Check `docs/TECH_WATCH.md` before work begins.

- If the last check date is today, do not repeat discovery by default.
- If the last check date is not today, run the daily discovery pass before substantial work.
- If an external idea looks useful, ask for approval in Korean before adopting it.

Use this style:

`이런이런 좋은게 있는데 우리 프로젝트에 적용하면 좋을거같아서 가져와도 될까?`

The approval request must include:

- the concrete item
- why it helps this project
- expected scope
- main risk
- the smallest safe next step

## Boundary Rules

- Treat `Home`, `Closet`, `Canvas`, `Community`, and `Profile` as the active product shell.
- Treat compatibility redirects as redirects, not as first-class IA.
- Treat `/v1/legacy/*` and `/v1/lab/*` as isolated surfaces.
- Treat admin publishing as operational infrastructure, not public product navigation.
- Treat `docs/replatform-v2/**` as historical rollout context unless the task is explicitly about widget/canary work.

If a task would blur these boundaries, stop and narrow the change first.

## Git Workflow

For every non-read-only task:

1. start from `main`
2. create a dedicated branch, normally `codex/<task-slug>`
3. make the change on that branch only
4. run the required validation for the scope
5. push the branch
6. open a PR to `main`
7. merge only after checks are acceptable
8. return to `main`, sync it, and remove the merged task branch locally and remotely

Docs-only tasks follow the same branch and PR flow unless the task is explicitly read-only.

## Doc Sync Rules

When code or contracts change, update the paired docs in the same task cycle.

Minimum sync expectations:

- route or IA change -> `docs/product-boundaries.md`, `docs/architecture-overview.md`
- schema or API change -> `docs/api-contract.md`, `docs/contract-ownership.md`
- runtime or fit change -> `docs/garment-fitting-contract.md`, `docs/quality-gates.md`
- release or operational change -> `docs/MAINTENANCE_PLAYBOOK.md`, `docs/quality-gates.md`
- phase or batch completion -> `docs/freestyle-improvement-status.md`

## Quality Gate Rules

Use `docs/quality-gates.md` as the execution summary.

Minimum expectations:

- always run the baseline gate required by the scope
- do not claim a gate passed if it was skipped
- record skipped commands and why they were not needed
- do not merge if a required conditional gate was not run

## Stop Conditions

Pause and reassess when any of the following is true:

- the route class is unclear: product, redirect, admin, legacy, or lab
- two owners would need to write the same path in the same batch
- the change touches `@freestyle/contracts` but the affected consumers are not identified
- the change introduces a new asset without credits or validation coverage
- the change would require RLS, storage, or security behavior that is not yet defined
- the task depends on an external discovery item that has not been approved

## Communication Pattern

Use short progress updates with three elements:

1. what boundary is being worked on
2. what is being verified or changed now
3. what remains before the batch can close

## Task Checklist

- [ ] I identified the current phase and batch
- [ ] I picked a write owner and, when needed, a validation sidecar
- [ ] I checked `docs/TECH_WATCH.md`
- [ ] I confirmed the relevant route class and ownership boundary
- [ ] I listed the docs that must stay in sync
- [ ] I ran or explicitly skipped the required quality gates
- [ ] I used the branch / PR / merge workflow if tracked files changed

## Out Of Scope

- model benchmarking policy
- org-wide staffing or approval hierarchy
- business KPI planning

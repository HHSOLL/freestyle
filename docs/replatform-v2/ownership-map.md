# Replatform v2 Ownership Map

## Purpose
- Defines one write owner per path group for parallel delivery.
- Prevents merge conflicts and contract drift during Phase `0.5` to `5`.

## Path Ownership
| Scope | Write owner | Paths |
| --- | --- | --- |
| Contracts freeze/docs | Coordinator | `docs/replatform-v2/**`, `docs/api-contract.md`, `docs/architecture.md`, `README.md` |
| Design system foundation | Frontend design-system owner | `apps/web/src/app/globals.css`, `apps/web/src/components/layout/**`, `apps/web/src/features/renewal-app/components/**` |
| App routes implementation | Frontend app-routes owner | `apps/web/src/app/app/**` |
| Marketing routes implementation | Frontend marketing-routes owner | `apps/web/src/app/page.tsx`, `apps/web/src/app/examples/page.tsx`, `apps/web/src/app/how-it-works/page.tsx` |
| Widget API/contracts | Backend owner | `apps/api/src/routes/widget.routes.ts`, `apps/api/src/main.ts`, `packages/contracts/**`, `packages/shared/src/index.ts`, `packages/widget-sdk/**` |
| Rollout governance | Deployment owner | `docs/rollout-governance/**`, `infra/runbooks/**`, `docs/MAINTENANCE_PLAYBOOK.md` |
| Quality/security review | Reviewer sidecars (read-only) | Entire repo, no writes |

## Merge Sequence
1. Contracts freeze/docs
2. Widget API/contracts
3. Frontend design system + route shells
4. Rollout governance updates
5. Final reviewer pass and integration

## Handoff Rule
- If a change touches schema, env contract, or rollout thresholds, the coordinator must approve before merge.

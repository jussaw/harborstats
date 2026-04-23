# HarborStats Repo Guide

This repository has multiple areas with different responsibilities. Start at the repo root for orientation, then follow the more specific guide for the area you are editing.

## Repo Layout

- `web/`: main Next.js application, database schema, scripts, and tests
- `devops/`: deployment stack, compose files, and operational docs
- `.github/`: CI workflows
- `docs/`: specs and planning artifacts

## Instruction Scope

- If you are working in `web/`, follow `web/AGENTS.md` for app-specific rules, commands, testing, and framework guidance.
- More specific `AGENTS.md` files override this root guide within their subtree.
- Keep repo-wide changes aligned with the root `README.md`, and keep app-only conventions scoped to `web/`.

## Default Working Conventions

- Treat `web/` as the primary product surface.
- Run app commands from `web/`, not from the repo root.
- Keep deployment and infrastructure changes scoped to `devops/` unless the task explicitly spans both app and ops.
- Prefer small, targeted changes that match existing project structure.

## Common Entry Points

- Start with `README.md` at the repo root for overall project context.
- Use `web/README.md` for lower-level app setup and command details.
- Use `devops/README.md` for deployment, backup, and restore workflows.

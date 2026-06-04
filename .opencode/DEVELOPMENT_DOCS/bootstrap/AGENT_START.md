# Agent Start

Status: compatibility redirect
Audience: AI agent
Last verified: 2026-06-04

This file is no longer the canonical ByteForge AI entrypoint.

The canonical bootstrap flow is:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`
3. Role-specific documents named by `AI_BOOTSTRAP.md`
4. The assigned execution packet, if running executor work
5. Additive task-specific documents from `doc_allow_list`

Do not use this file as a source of current project state, phase status, roadmap
state, active tasks, next work, or runtime execution status. Those categories are
runtime/project state and must come from SQLite through approved command-surface
commands.

## Authority Model

- Code is implementation truth.
- SQLite is runtime/project state truth.
- Markdown is behavioral and policy truth.

## Required Redirect

After opening this file, read:

```text
AGENTS.md
.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md
```

Then follow the deterministic bootstrap rules in `AI_BOOTSTRAP.md`.

## Compatibility Note

Older prompts, packets, or tools may still reference
`.opencode/DEVELOPMENT_DOCS/AGENT_START.md`. Treat that reference as a pointer to
`.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`.

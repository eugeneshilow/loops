# AGENTS.md — loops

Rules for any agent running a loop from this repo. Same on Claude Code, Cursor, Codex.

## What this is

Open prompts (`skills/`) + shared scripts (`spine/`) that run a Telegram feedback loop on the user's own machine, as a userbot on the user's own account. No server. Read a skill before running it.

## Running a loop

1. Read the loop's `SKILL.md` fully.
2. Make sure setup ran: `.loops/personal.session` exists and deps are installed. If not, run the `setup` skill first.
3. Drive the spine: poll → transcribe → polish → (decide) → ship a fix → reply → repeat.
4. The always-on poller queues hits to a durable inbox; a live session drains it idempotently.

## Autonomy (inside the loop)

Inside the loop, act WITHOUT per-step approval: poll, transcribe, polish, ship a small fix, send the return. The loop is the unit of autonomy, not the message. Constant "send? / fix?" questions kill the loop — report after the fact.

## Boundaries (stop and ask)

- a new recipient outside the bound tester list / bound thread;
- off-topic content (not about the product under test);
- a reply that would promise features/prices or expose PII;
- a fix in a risky zone: payments, auth, env/secrets, schema, deploy, public landing page.

Never message a chat that is not in the run config. Never put secrets in a message, commit, or the inbox.

## Anti-loop (critical)

The `@claude` tag is the feedback marker. NEVER put `@claude` in a message the loop sends, and skip your own outgoing messages (`out`) and `🔔` self-notifications — otherwise the poller catches its own output and spins forever.

## Git

Ship fixes as small single-purpose commits in the user's product repo. Never commit `.loops/`, secrets, or downloaded media.

# loops

**Outbound agentic feedback loops on Telegram — they talk to real people, hear them out, ship the fix, and come back. They run in your own coding agent, on your own machine.**

Every loop here is an open prompt (a `SKILL.md`) plus a few small open scripts it calls. You load them into your own agent (Claude Code, Cursor, Codex); they run locally with your own Telegram account. Nothing runs on a server, nothing phones home. Read the prompts before you run them — that's the whole security model.

---

## What's inside

- **`tg-contacts-feedback`** — a closed loop with a known list of testers. It DMs them, waits for a reply that starts with `@claude` (text or a voice note), transcribes voice locally, polishes it into `{source, insight, action, return-question}`, ships a small fix, and replies with the new version.
- **`tg-comments-feedback`** — an open loop over `@claude` mentions across your chats / a launch thread, grouped by theme. (Newer — less battle-tested than contacts.)
- **`setup`** — the installer prompt. Hand it to your agent and it wires everything up: api keys, Telegram QR-login, the transcription backend, and a smoke test.

All three are skills = open prompts. The shared machinery — Telegram client, transcription, the durable inbox — lives once in [`spine/`](spine/README.md).

## How it actually works

It logs into *your own* Telegram as a userbot (GramJS / MTProto), so it reads the DMs and chats you already have — no separate bot, your testers just reply to you. When a message starts with `@claude`, the loop treats it as feedback-for-the-agent: it takes the text or the voice note, transcribes voice locally with whisper, and an always-on poller drops the hit into a durable inbox so nothing is lost even when no agent session is up. A live session drains the inbox, acts, and replies in-thread to close the loop. It reacts 👀 so you can see it caught your ping, and it never puts `@claude` in its own messages — otherwise it would catch itself and spin forever.

## Install (runs on your machine)

These loops need a couple of scripts plus Node deps, so the simplest path is to clone and let `setup` do the rest:

```
git clone https://github.com/eugeneshilow/loops && cd loops
```

Then open the folder in your agent and say **“run setup”** (or `/setup`). It installs deps, gets your Telegram credentials, runs the QR-login, sets up transcription, and smoke-tests — see [`skills/setup/SKILL.md`](skills/setup/SKILL.md).

To pull just the loop prompts into another project (without the scripts):

```
npx skills add eugeneshilow/loops --skill tg-contacts-feedback
```

## Bring your own (all yours, all local)

- **Your Telegram account.** `api_id` + `api_hash` from [my.telegram.org](https://my.telegram.org), then a one-time QR-login (scan in Telegram → Settings → Devices → Link Desktop Device). The session is written to `.loops/personal.session` on your machine and never leaves it.
- **A transcription backend.** `mlx-whisper` on Apple Silicon (default, model `whisper-small-mlx`) or `openai` (an API key), chosen by `STT_BACKEND`.

`.loops/` and every secret are git-ignored.

Built by [vibecoding](https://vibecoding.ru). MIT.

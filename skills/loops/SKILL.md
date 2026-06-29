---
name: loops
description: >
  Entry point and guide for the loops toolkit — outbound Telegram feedback loops that talk to
  real people, hear them out, ship a fix, and reply. Use when the user says "use loops" / "run
  loops" / invokes /loops, or wants to start a feedback loop with their testers or audience on
  Telegram. This skill orients the user, makes sure setup is done, lists whatever loops are
  available, helps pick one, and runs it. The user shouldn't need to memorize command names — you guide.
disable-model-invocation: true
compatibility: Requires Node >= 18, git, and a Telegram account. The first run walks setup.
metadata:
  version: "0.1.0"
---

# loops — start here

You are the guide for the loops toolkit. When the user activates you, drive the whole thing in plain language. Don't make them remember command names — you orchestrate.

## 1. Orient (one breath)

Tell the user, briefly: loops are outbound feedback loops on Telegram. Your agent listens for messages tagged `@claude` (text or voice), transcribes voice locally, ships a small fix, and replies — looping until the feedback dries up. It runs on their machine, as a userbot on their own Telegram.

## 2. Make sure setup is done

Check for `.loops/personal.session` and installed deps. If setup hasn't run, run the **setup** skill (`skills/setup/SKILL.md`) now: it fetches the scripts, installs deps, gets api keys, runs the QR login, and configures transcription. The only human steps are pasting api keys (my.telegram.org) and scanning a QR. Don't ask the user to run shell by hand — you do it.

## 3. List the available loops

Look at the loop skills present (every skill in this toolkit except `setup` and this `loops` guide). Today that's:

- **tg-contacts-feedback** — closed loop with a known tester list.
- **tg-comments-feedback** — open loop over `@claude` mentions across chats.

…but list whatever is actually installed — new loops dropped into the toolkit show up here automatically. Summarize each in one line.

## 4. Pick one and run it

Ask the user which loop to run (Claude Code: `AskUserQuestion`). Then follow that loop's `SKILL.md` end to end — bind its `loop.run.yaml`, run the loop, act with autonomy inside it, report after the fact.

## 5. Stay the guide

If the user is unsure, recommend `tg-contacts-feedback` (the battle-tested one) with a couple of pre-warned testers. Keep everything conversational; surface only the decisions that are genuinely theirs.

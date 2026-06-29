---
name: tg-contacts-feedback
description: >
  Use when the user has a short list of pre-warned testers and wants a closed feedback
  loop with them over their own Telegram. The loop DMs each tester a build link, waits for
  a reply that STARTS with @claude (text or a voice note), transcribes voice locally,
  polishes it into {source, insight, product action, return question}, ships a small git
  fix, and replies with the new version — repeating until signals stop being actionable.
  Acts without per-step approval inside the loop. Not for a public launch audience (that is
  tg-comments-feedback). Requires setup to have run first.
disable-model-invocation: true
compatibility: Requires the setup skill to have completed (.loops/personal.session present), git, and a transcription backend.
metadata:
  version: "0.1.0"
---

# tg-contacts-feedback — closed loop with known testers

A private loop with people you already warned. One @claude reply per tester, one small fix at a time, the new version DM'd straight back. It runs as a userbot on the user's own Telegram, so testers just reply to the user normally.

## Preconditions

- `setup` has run (`.loops/personal.session` exists, deps installed).
- A `loop.run.yaml` in the working dir (copy `examples/run.example.yaml`). On Claude Code, infer anything missing via AskUserQuestion and write the file.
- `LOOP_TESTERS` in `.loops/.env` mirrors `testers` from the run file (the poller only reads those handles).

Bindings: `testers` (the only allowed recipients), `link` (the build), `repo_path` + `editable_globs` (where fixes land, kept off risky zones), `gate` + `budget_*`, `run_tag`.

## The loop

Each iteration:

1. **Invite / re-invite.** For each tester: `node spine/send.mjs <@handle> "<invite>"`. The invite asks them to walk `link` and reply with a **voice note that STARTS with `@claude`**. The invite must NOT itself contain `@claude` (anti-loop). Send only on the first round, or after you ship a new version.
2. **Poll.** `node spine/poll.mjs --mode contacts` → JSON `{ found: [...] }`. Voice is already transcribed inline (`[voice->text]: …`).
3. **Polish.** For each item, write a record: `source` (the tester), `insight` (what they actually mean), `product_action` (the smallest concrete fix), `return_question` (what to ask back). Strength is `single` (one tester = one voice note).
4. **Decide & ship.** If `product_action` is a small in-scope fix (inside `editable_globs`, not a risky zone): make it in `repo_path`, run the repo's quick checks, commit a single-purpose commit, deploy/refresh `link`.
5. **Return.** `node spine/reply.mjs <peer> <msgId> "<what changed + new link + return_question>"` — posts as a reply to their original message. (`peer` and `msgId` come from the poll output.)
6. **Repeat** on a cadence until signals stop being actionable or the gate trips.

## Autonomy & boundaries

Inside the loop: **no per-step approval** — invite, poll, transcribe, polish, fix, reply on your own; report after the fact. Stop and ask only for: a message from a handle not in `testers`; off-topic content; a reply that would promise features/prices or expose PII; a fix touching a risky zone (payments, auth, env/secrets, schema, deploy, public landing). Never send `@claude` in your own message. Never commit `.loops/` or secrets.

## Done

The loop ends when the gate trips or a full pass yields no new actionable signal. Report: testers reached, signals polished, fixes shipped, anything escalated.

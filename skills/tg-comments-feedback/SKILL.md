---
name: tg-comments-feedback
description: >
  Use when the user wants an open feedback loop over @claude mentions across their Telegram
  chats / under a launch post, rather than a fixed tester list. The loop scans recent chats
  for messages tagged @claude (text or voice), transcribes voice locally, groups signals by
  theme with pattern strength (single/repeated/blocking), ships a small fix or drafts a reply
  in the owner's voice, returns it in-thread, and repeats. Newer and less battle-tested than
  tg-contacts-feedback. Acts without per-step approval inside the loop. Requires setup first.
disable-model-invocation: true
compatibility: Requires the setup skill to have completed (.loops/personal.session present), git, and a transcription backend.
metadata:
  version: "0.1.0"
---

# tg-comments-feedback — open loop over @claude mentions

The public-facing sibling of tg-contacts-feedback. Instead of a known tester list, it watches
your chats broadly for `@claude` pings (e.g. comments/replies around a launch), finds the
themes that matter, and fixes or replies. Runs as a userbot on your own account.

> Newer than `tg-contacts-feedback` — the contacts loop is the battle-tested one. Treat this as the v1 of the open variant.

## Preconditions

- `setup` has run (`.loops/personal.session` exists, deps installed).
- A `loop.run.yaml` (copy `examples/run.example.yaml`): `channel` / `launch_post_id` (what you're watching — informational), `repo_path` + `editable_globs`, `reply_voice`, `gate`/`budget_*`, `run_tag`.

## The loop

Each iteration:

1. **Poll mentions.** `node spine/poll.mjs --mode mentions` scans your recent dialogs for `@claude` (first run sets the baseline to now, so only new pings are caught). It reacts 👀 on each caught message and transcribes voice inline.
   - For an always-on setup, run it as `--queue` from a scheduled job; it appends hits to a durable inbox and self-notifies. A live session then pulls them with `node spine/inbox.mjs`.
2. **Weight by closeness to real usage.** Rank: someone describing actual use > a question > a bare reaction. Volume is a tiebreaker, never the primary sort.
3. **Group by theme + strength.** Cluster into themes; set strength `single` / `repeated` (multiple independent people) / `blocking` (a defect that stops real usage). Polish each into {source, insight, product_action, return_question}.
4. **Decide & ship.** For an in-scope non-risky theme: make the fix in `repo_path` (inside `editable_globs`), run quick checks, commit. OR draft a public reply in the owner's voice (`reply_voice`).
5. **Return in-thread.** `node spine/reply.mjs <peer> <msgId> "<the new version / the reply>"` — back in the same thread, addressing the theme.
6. **Repeat** until no new actionable theme appears or the gate trips.

## Autonomy & boundaries

Inside the loop: **no per-step approval** for reading, grouping, fixing non-risky themes, and replying. Stop and ask for: contacting a chat not in the run config; off-topic content; a reply that would promise features/prices or expose PII; a `blocking` theme (surface it, don't silently patch); a fix in a risky zone (payments, auth, env/secrets, schema, deploy, public landing). Never send `@claude` in your own message. Never commit `.loops/` or secrets.

## Done

Ends when the gate trips or a full pass surfaces no new actionable theme. Report: themes found (with strengths), fixes shipped, replies posted, blocking items escalated.

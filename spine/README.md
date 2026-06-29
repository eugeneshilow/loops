# spine — the shared machinery

The loops are thin prompts; the real work lives here, once. Every loop calls these
modules — none of them re-implement transport or transcription.

```
config.mjs      env + paths (creds from .loops/.env, session from .loops/personal.session)
client.mjs      connect to YOUR Telegram as a userbot (GramJS / MTProto)
login.mjs       one-time QR login -> writes .loops/personal.session
poll.mjs        poll @claude-tagged feedback (--mode contacts | mentions), download + transcribe voice
transcribe.mjs  pluggable STT: mlx-whisper (Apple, default) | openai
inbox.mjs       durable inbox: --queue appends, a live session drains() idempotently
reply.mjs       reply to the original message (closes the loop), refuses to send @claude
```

## The data a hit carries

```json
{ "chat": "who/where", "peer": "@handle or id", "msgId": 123,
  "fromMe": false, "date": 1700000000,
  "feedback": "text, with [voice->text]: ... inlined for voice notes" }
```

## Rules baked in

- **`@claude` is the marker.** Only tagged messages are feedback. Own outgoing (`out`) and `🔔` self-notifications are skipped.
- **Anti-loop.** Nothing the loop sends contains `@claude`; `reply.mjs` refuses it. Otherwise the poller catches its own output and spins forever.
- **State + dedup.** `contacts_state.json` / `mentions_state.json` track the baseline; the inbox cursor dedups drained hits.
- **Secrets are local.** Everything under `.loops/` (session, env, state, media) is git-ignored.

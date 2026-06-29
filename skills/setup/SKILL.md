---
name: setup
description: >
  Use to set up the loops repo on this machine so the Telegram feedback loops can run.
  Run this once before tg-contacts-feedback or tg-comments-feedback. It installs Node
  deps, collects the user's own Telegram api_id/api_hash, runs a QR login (the user scans
  it in their Telegram app), configures the transcription backend (mlx-whisper on Apple,
  else openai), and smoke-tests the connection. Most of it the agent does itself; three
  steps need the human (get api keys, scan the QR, type 2FA).
disable-model-invocation: true
compatibility: Requires Node >= 18, git, a Telegram account, and (for local transcription) Python 3 on Apple Silicon.
metadata:
  version: "0.1.0"
---

# setup — wire up loops on this machine

Everything runs locally as a userbot on the user's OWN Telegram account. Nothing leaves the machine. Read this fully, then walk the steps in order. Two of the steps are HUMAN steps — do them WITH the user, don't try to fake them.

## 1. Get the scripts + deps (agent)

The loops are open prompts; the machinery they call lives in `spine/` in the repo. If `npx skills add` installed only the prompts, the scripts aren't here yet — if the current folder has no `spine/` directory, fetch them:

```
git clone https://github.com/eugeneshilow/loops && cd loops
```

Then `npm install` (needs Node >= 18, `node -v`). This installs GramJS (`telegram`), `dotenv`, `qrcode`, `qrcode-terminal`. The user never has to run this by hand — you do it.

## 2. Telegram credentials — HUMAN step

Create the local config and get the user's api credentials:

```
mkdir -p .loops && cp .env.example .loops/.env
```

Tell the user, in these words:
> Open https://my.telegram.org → "API development tools" → create an app (any name) → copy the **api_id** and **api_hash** and paste them here.

Write `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` into `.loops/.env`. These are the user's own keys; never log them, never commit them.

## 3. QR login — HUMAN step

Run `npm run login`. A QR code prints in the terminal. Tell the user:
> In Telegram → **Settings → Devices → Link Desktop Device** → scan this QR.

If the account has 2FA, the script will ask for the password (the user types it). On success the session string is written to `.loops/personal.session` (git-ignored, local only). Confirm it printed `Logged in as @…`.

## 4. Transcription backend (agent, ask which)

Voice notes are transcribed locally.

- **Apple Silicon (default, recommended):**
  ```
  python3 -m venv ~/.stt-venv && ~/.stt-venv/bin/pip install -U mlx-whisper hf_transfer
  ```
  Keep `STT_BACKEND=mlx-whisper`, `STT_MODEL=mlx-community/whisper-small-mlx` in `.loops/.env`.
  ⚠️ Use **whisper-small-mlx** — `large-v3-turbo` (1.6 GB) often fails to download on slow/limited networks (partial weights). small (~480 MB) is reliable and good enough for RU/EN.
- **Not Apple, or you prefer an API:** set `STT_BACKEND=openai` and `OPENAI_API_KEY` in `.loops/.env`. No local model needed.

## 5. Smoke test (agent)

Run `node spine/poll.mjs --mode mentions`. Expect `[connected as @<user>]` and `"count": 0` (a clean first run just sets the baseline to now). If it connects, the loop machinery works.

## 6. Done

Tell the user setup is complete and offer to start a loop:
- `tg-contacts-feedback` — a private loop with a known tester list.
- `tg-comments-feedback` — an open loop over @claude mentions across their chats.

Report what you did. Do not commit anything under `.loops/`.

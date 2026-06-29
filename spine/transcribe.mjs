// Pluggable speech-to-text for voice notes. Default: local mlx-whisper (Apple).
// Telegram voice is .ogg/opus; whisper reads it directly.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { cfg } from './config.mjs'

// Transcribe an audio file on disk -> text.
export async function transcribeFile(filePath) {
  if (cfg.sttBackend === 'mlx-whisper') return mlx(filePath)
  if (cfg.sttBackend === 'openai') return await openai(filePath)
  throw new Error(`unknown STT_BACKEND "${cfg.sttBackend}" (use mlx-whisper | openai)`)
}

// Transcribe a buffer (writes a temp file first, removes it after).
export async function transcribeBuffer(buf, tag = 'clip') {
  const tmp = path.join('/tmp', `loops_${String(tag).replace(/\W+/g, '_')}.ogg`)
  fs.writeFileSync(tmp, buf)
  try { return await transcribeFile(tmp) } finally { try { fs.unlinkSync(tmp) } catch {} }
}

function mlx(filePath) {
  const name = `loops_${path.basename(filePath).replace(/\W+/g, '_')}`
  execFileSync(
    cfg.mlxBin,
    [filePath, '--model', cfg.sttModel, '--language', cfg.sttLang, '--output-dir', '/tmp', '--output-name', name],
    { stdio: 'ignore', timeout: 240000 }
  )
  return fs.readFileSync(`/tmp/${name}.txt`, 'utf8').trim()
}

async function openai(filePath) {
  if (!cfg.openaiKey) throw new Error('STT_BACKEND=openai but OPENAI_API_KEY is empty')
  const form = new FormData()
  form.append('model', cfg.openaiModel)
  form.append('language', cfg.sttLang)
  form.append('file', new Blob([fs.readFileSync(filePath)]), path.basename(filePath))
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.openaiKey}` },
    body: form,
  })
  if (!r.ok) throw new Error(`openai transcription ${r.status}: ${await r.text()}`)
  return ((await r.json()).text ?? '').trim()
}

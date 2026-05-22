#!/usr/bin/env bash
set -euo pipefail

# Example local TTS wrapper.
# Replace the command at the bottom with your own authorized local voice model.
#
# Inputs provided by the bot:
#   QQBOT_TTS_TEXT       raw text
#   QQBOT_TTS_TEXT_FILE  text file path
#   QQBOT_TTS_OUTPUT     target wav/mp3/ogg/m4a path
#   QQBOT_TTS_VOICE_SAMPLE optional authorized reference sample
#   QQBOT_TTS_PROMPT     style prompt

TEXT_FILE="${QQBOT_TTS_TEXT_FILE:?missing QQBOT_TTS_TEXT_FILE}"
OUT="${QQBOT_TTS_OUTPUT:?missing QQBOT_TTS_OUTPUT}"
SAMPLE="${QQBOT_TTS_VOICE_SAMPLE:-}"

mkdir -p "$(dirname "$OUT")"

# Replace this block with your local engine, for example GPT-SoVITS,
# CosyVoice, Fish-Speech, Piper, sherpa-onnx TTS, or your own service client.
python3 /opt/local-tts/infer.py \
  --text-file "$TEXT_FILE" \
  --voice-sample "$SAMPLE" \
  --out "$OUT"

echo "$OUT"

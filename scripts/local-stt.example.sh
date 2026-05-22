#!/usr/bin/env bash
set -euo pipefail

# Example local STT wrapper.
# Replace the command at the bottom with your own local speech-to-text engine.
#
# Inputs provided by the bot:
#   QQBOT_STT_INPUT   local audio file path
#   QQBOT_STT_OUTPUT  target transcript text path
#   QQBOT_STT_MIME    detected audio mime
#   QQBOT_STT_SOURCE  original QQ record URL/file

IN="${QQBOT_STT_INPUT:?missing QQBOT_STT_INPUT}"
OUT="${QQBOT_STT_OUTPUT:?missing QQBOT_STT_OUTPUT}"

mkdir -p "$(dirname "$OUT")"

# Replace this block with your local engine, for example whisper.cpp,
# FunASR, sherpa-onnx, or your own service client.
python3 /opt/local-stt/transcribe.py \
  --input "$IN" \
  --output "$OUT"

cat "$OUT"

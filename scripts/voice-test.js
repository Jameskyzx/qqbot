const fs = require('fs');
const path = require('path');
const { generateVoice, getVoiceStats } = require('../dist/plugins/tts');
const { normalizeConfig, hasUsableApiKey } = require('../dist/config');

async function main() {
  const configPath = path.resolve(__dirname, '..', 'config.json');
  const fallbackPath = path.resolve(__dirname, '..', 'config.example.json');
  const raw = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf-8')
    : fs.readFileSync(fallbackPath, 'utf-8');
  const config = normalizeConfig(JSON.parse(raw));
  const text = process.argv.slice(2).join(' ').trim() || '不是哥们 这波语音链路测试一下';

  config.ai.enable_tts = true;
  if (!config.ai.tts_provider) config.ai.tts_provider = 'api';

  const needsApi = config.ai.tts_provider === 'api' ||
    (config.ai.tts_provider === 'auto' && !(config.ai.tts_local_command || '').trim());
  if (needsApi && !hasUsableApiKey(config.ai.api_key)) {
    console.error('TTS需要API密钥。请先设置环境变量 WANJIER_API_KEY，然后重新运行。');
    process.exit(2);
  }

  const output = await generateVoice(config.ai, text);
  const stats = getVoiceStats(config.ai);
  if (!output) {
    console.error('voice test failed');
    console.error(JSON.stringify({
      provider: stats.provider,
      localReady: stats.localReady,
      cloneReady: stats.cloneReady,
      samplePath: stats.samplePath,
      sampleSizeMB: stats.sampleSizeMB,
      sampleReason: stats.sampleReason,
      lastMode: stats.lastMode,
      lastError: stats.lastError,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    output,
    size: fs.statSync(output).size,
    provider: stats.provider,
    cloneReady: stats.cloneReady,
    samplePath: stats.samplePath,
    sampleSizeMB: stats.sampleSizeMB,
    lastMode: stats.lastMode,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AIConfig } from '../types';

/**
 * TTS语音合成 - 使用MiMo-V2.5-TTS / VoiceClone
 * voiceclone: 需要 voice_sample.mp3 音频参考文件
 */

const CACHE_DIR = path.resolve(__dirname, '..', '..', 'voice_cache');
const SAMPLE_PATH = path.resolve(__dirname, '..', '..', 'voice_sample.mp3');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/** 缓存voice sample的DataURL（避免每次都读文件+base64） */
let voiceSampleDataUrl: string | null = null;

function getVoiceSampleDataUrl(): string | null {
  if (voiceSampleDataUrl) return voiceSampleDataUrl;
  if (!fs.existsSync(SAMPLE_PATH)) return null;
  const buf = fs.readFileSync(SAMPLE_PATH);
  voiceSampleDataUrl = `data:audio/mp3;base64,${buf.toString('base64')}`;
  return voiceSampleDataUrl;
}

/** 调用TTS生成语音，返回本地WAV文件路径 */
export function generateVoice(config: AIConfig, text: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (text.length < 2 || text.length > 200) {
      resolve(null);
      return;
    }

    const url = new URL(config.api_url);
    const isHttps = url.protocol === 'https:';

    // 如果有声音样本，用voiceclone；否则用普通tts
    const voiceDataUrl = getVoiceSampleDataUrl();
    const useClone = !!voiceDataUrl;
    const model = useClone ? 'mimo-v2.5-tts-voiceclone' : 'mimo-v2.5-tts';

    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: '用年轻男性声音，语气随意放松，像跟朋友聊天，语速偏快' },
        { role: 'user', content: '请说' },
        { role: 'assistant', content: text },
      ],
    };

    if (useClone) {
      requestBody.audio = { voice: voiceDataUrl };
    }

    const body = JSON.stringify(requestBody);

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const transport = isHttps ? https : http;

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.error('[TTS] API错误:', json.error.message);
            resolve(null);
            return;
          }

          const audioBase64 = json.choices?.[0]?.message?.content;
          if (!audioBase64 || audioBase64.length < 100) {
            resolve(null);
            return;
          }

          const pcmBuffer = Buffer.from(audioBase64, 'base64');
          const filename = crypto.randomBytes(8).toString('hex') + '.wav';
          const filepath = path.join(CACHE_DIR, filename);
          const wavBuffer = pcmToWav(pcmBuffer, 24000, 16, 1);
          fs.writeFileSync(filepath, wavBuffer);

          if (wavBuffer.length < 200) {
            fs.unlinkSync(filepath);
            resolve(null);
          } else {
            resolve(filepath);
          }
        } catch (err) {
          console.error('[TTS] 解析失败:', err);
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(20000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function pcmToWav(pcmData: Buffer, sampleRate: number, bitsPerSample: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}

export function cleanVoiceCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    for (const file of files) {
      const filepath = path.join(CACHE_DIR, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > 3600000) fs.unlinkSync(filepath);
    }
  } catch { /* */ }
}

setInterval(cleanVoiceCache, 30 * 60 * 1000);

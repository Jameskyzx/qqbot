import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AIConfig } from '../types';

/**
 * TTS语音合成 - 使用MiMo-V2.5-TTS生成语音
 * 调用 /v1/audio/speech 端点，兼容OpenAI TTS格式
 */

const CACHE_DIR = path.resolve(__dirname, '..', '..', 'voice_cache');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/** 调用TTS API生成语音文件，返回本地文件路径 */
export function generateVoice(config: AIConfig, text: string): Promise<string | null> {
  return new Promise((resolve) => {
    // 文本太短或太长不生成语音
    if (text.length < 2 || text.length > 200) {
      resolve(null);
      return;
    }

    const baseUrl = config.api_url.replace('/chat/completions', '/audio/speech');
    const url = new URL(baseUrl);
    const isHttps = url.protocol === 'https:';

    const body = JSON.stringify({
      model: 'mimo-v2.5-tts',
      input: text,
      voice: 'male-casual',  // 使用随性男声
      response_format: 'mp3',
    });

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
      // 如果不是200或者content-type不是音频，说明接口不支持
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', (c) => { errData += c; });
        res.on('end', () => {
          console.error('[TTS] API返回非200:', res.statusCode, errData.slice(0, 200));
          resolve(null);
        });
        return;
      }

      // 保存音频文件
      const filename = crypto.randomBytes(8).toString('hex') + '.mp3';
      const filepath = path.join(CACHE_DIR, filename);
      const fileStream = fs.createWriteStream(filepath);

      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        // 检查文件大小是否合理
        const stat = fs.statSync(filepath);
        if (stat.size < 100) {
          fs.unlinkSync(filepath);
          resolve(null);
        } else {
          resolve(filepath);
        }
      });
      fileStream.on('error', () => {
        resolve(null);
      });
    });

    req.on('error', (err) => {
      console.error('[TTS] 请求失败:', err.message);
      resolve(null);
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

/** 清理过期的语音缓存文件（超过1小时的删除） */
export function cleanVoiceCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    for (const file of files) {
      const filepath = path.join(CACHE_DIR, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > 3600000) {
        fs.unlinkSync(filepath);
      }
    }
  } catch { /* 静默 */ }
}

// 每30分钟清理一次缓存
setInterval(cleanVoiceCache, 30 * 60 * 1000);

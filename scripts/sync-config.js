#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : '';
}

const configPath = path.resolve(root, argValue('--config') || 'config.json');
const examplePath = path.resolve(root, argValue('--example') || 'config.example.json');
const apply = process.argv.includes('--apply') || process.argv.includes('-w');

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeMissing(target, template, prefix, changes) {
  if (!isPlainObject(target) || !isPlainObject(template)) return target;
  for (const [key, value] of Object.entries(template)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (key === 'api_key') continue;
    if (!(key in target)) {
      target[key] = clone(value);
      changes.push(`add ${fullKey}`);
      continue;
    }
    if (isPlainObject(target[key]) && isPlainObject(value)) {
      mergeMissing(target[key], value, fullKey, changes);
    }
  }
  return target;
}

function refreshBuiltInPresets(target, template, changes) {
  const targetPresets = target?.ai?.presets;
  const templatePresets = template?.ai?.presets;
  if (!isPlainObject(targetPresets) || !isPlainObject(templatePresets)) return;

  for (const [key, templatePreset] of Object.entries(templatePresets)) {
    if (!isPlainObject(templatePreset)) continue;
    if (!isPlainObject(targetPresets[key])) {
      targetPresets[key] = clone(templatePreset);
      changes.push(`refresh ai.presets.${key}`);
      continue;
    }
    for (const field of ['name', 'description', 'system_prompt']) {
      if (typeof templatePreset[field] === 'string' && targetPresets[key][field] !== templatePreset[field]) {
        targetPresets[key][field] = templatePreset[field];
        changes.push(`refresh ai.presets.${key}.${field}`);
      }
    }
  }
}

function main() {
  if (!fs.existsSync(examplePath)) {
    console.error('[sync-config] config.example.json 不存在');
    process.exit(2);
  }
  if (!fs.existsSync(configPath)) {
    if (!apply) {
      console.log('[sync-config] config.json 不存在；加 --apply 会从示例生成');
      return;
    }
    fs.copyFileSync(examplePath, configPath);
    console.log('[sync-config] 已从 config.example.json 生成 config.json，请检查 ws_url/admin/api key');
    return;
  }

  const originalText = fs.readFileSync(configPath, 'utf-8');
  const config = readJson(configPath);
  const example = readJson(examplePath);
  const changes = [];
  const exampleVersion = Number(example.config_version || 0);
  const currentVersion = Number(config.config_version || 0);
  const versionBehind = exampleVersion > 0 && currentVersion < exampleVersion;

  mergeMissing(config, example, '', changes);

  if (versionBehind) {
    refreshBuiltInPresets(config, example, changes);
  }

  if (exampleVersion > 0 && currentVersion < exampleVersion) {
    config.config_version = exampleVersion;
    changes.push(`set config_version ${currentVersion || 'missing'} -> ${exampleVersion}`);
  }

  const nextText = `${JSON.stringify(config, null, 2)}\n`;
  if (nextText === originalText) {
    console.log('[sync-config] config.json 已是最新字段');
    return;
  }

  if (!apply) {
    console.log(`[sync-config] 将补齐 ${changes.length} 项，预览:`);
    changes.slice(0, 30).forEach((item) => console.log(`- ${item}`));
    if (changes.length > 30) console.log(`- ... 还有 ${changes.length - 30} 项`);
    console.log('[sync-config] 使用 node scripts/sync-config.js --apply 写入');
    return;
  }

  const backup = path.join(path.dirname(configPath), 'backups', `config.before-sync.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, originalText, 'utf-8');
  const tmp = `${configPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, nextText, 'utf-8');
  fs.renameSync(tmp, configPath);

  console.log(`[sync-config] 已补齐 ${changes.length} 项`);
  changes.slice(0, 30).forEach((item) => console.log(`- ${item}`));
  if (changes.length > 30) console.log(`- ... 还有 ${changes.length - 30} 项`);
  console.log(`[sync-config] 备份: ${backup}`);
}

main();

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function loadLocalEnv() {
  loadEnvFile('.env.local');
  loadEnvFile('.env.local.example');
}

module.exports = { loadLocalEnv };

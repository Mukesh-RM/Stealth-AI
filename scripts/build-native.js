const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const nativeDir = path.join(__dirname, '..', 'native', 'windows-stealth');

console.log('[STEALTH-AI] Building windows-stealth native addon...');

if (process.platform !== 'win32') {
  console.log('[STEALTH-AI] Skipping native build (not Windows). Addon builds on Windows CI/target.');
  process.exit(0);
}

try {
  if (!fs.existsSync(path.join(nativeDir, 'binding.gyp'))) {
    console.error('[STEALTH-AI] binding.gyp not found');
    process.exit(1);
  }
  execSync('npx node-gyp rebuild --directory "' + nativeDir + '"', {
    stdio: 'inherit',
    cwd: nativeDir,
    env: { ...process.env },
  });
  console.log('[STEALTH-AI] Native addon built successfully');
} catch (err) {
  console.warn('[STEALTH-AI] Native build failed:', err.message);
  process.exit(0);
}

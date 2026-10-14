import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getAndroidDownloadUrl } from '../lib/android-download.mjs';

const releaseUrl = 'https://github.com/Saurav-Biswal/Echo_Website/releases/download/v1.0.0/app-release.apk';

test('Android download URL uses the configured release asset and hides blank values', () => {
  assert.equal(getAndroidDownloadUrl(` ${releaseUrl} `), releaseUrl);
  assert.equal(getAndroidDownloadUrl(''), '');
  assert.equal(getAndroidDownloadUrl('   '), '');
  assert.equal(getAndroidDownloadUrl(undefined), '');
});

test('Android download controls are conditional and use the configured destination', async () => {
  const config = await readFile(new URL('../config/site.ts', import.meta.url), 'utf8');
  const home = await readFile(new URL('../components/home-page.tsx', import.meta.url), 'utf8');
  const chrome = await readFile(new URL('../components/chrome.tsx', import.meta.url), 'utf8');

  assert.match(config, /getAndroidDownloadUrl\(process\.env\.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL\)/);
  assert.equal((home.match(/site\.androidDownloadUrl\s*&&\s*<a/g) ?? []).length, 2);
  assert.match(home, /href=\{site\.androidDownloadUrl\}[^>]*aria-label="Download Echo for Android"/);
  assert.match(chrome, /site\.androidDownloadUrl\s*&&\s*<a href=\{site\.androidDownloadUrl\}[^>]*aria-label="Download Echo for Android"/);
  assert.doesNotMatch([home, chrome].join('\n'), /releases\/download\/v1\.0\.0\/app-release\.apk/);
});

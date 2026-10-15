#!/usr/bin/env node

/**
 * Bundles the bridge into a distributable tarball for GitHub Releases.
 *
 * Produces: dist/localcart-<version>-<platform>.tar.gz
 *
 * Usage:
 *   node scripts/package.js            # Build for current platform
 *   node scripts/package.js --all      # Build for linux, darwin, win32
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import archiver from 'archiver';

const ROOT = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const version = pkg.version;

const platforms = process.argv.includes('--all')
  ? ['linux', 'darwin', 'win32']
  : [process.platform];

async function bundle() {
  console.log(`Bundling localcart v${version}...`);

  // 1. esbuild the CLI into a single file
  execSync('npm run bridge:build', { cwd: ROOT, stdio: 'inherit' });

  const distDir = path.join(ROOT, 'dist');

  for (const platform of platforms) {
    const archiveName = `localcart-${version}-${platform}.tar.gz`;
    const outPath = path.join(distDir, archiveName);

    console.log(`  Packaging ${archiveName}...`);

    const output = createWriteStream(outPath);
    const archive = archiver('tar', { gzip: true });

    const done = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });

    archive.pipe(output);

    // Include the bundled CLI
    archive.file(path.join(distDir, 'bridge', 'cli.js'), { name: 'localcart/cli.js' });

    // Include a launcher script
    const launcher = platform === 'win32'
      ? '@echo off\nnode "%~dp0cli.js" %*\n'
      : '#!/usr/bin/env bash\nexec node "$(dirname "$0")/cli.js" "$@"\n';

    const launcherName = platform === 'win32' ? 'localcart.cmd' : 'localcart';

    archive.append(launcher, { name: `localcart/${launcherName}`, mode: 0o755 });

    // Include package.json (for version info) and README
    archive.file(path.join(ROOT, 'package.json'), { name: 'localcart/package.json' });
    if (fs.existsSync(path.join(ROOT, 'README.md'))) {
      archive.file(path.join(ROOT, 'README.md'), { name: 'localcart/README.md' });
    }

    // Include the control panel HTML
    archive.file(
      path.join(ROOT, 'bridge', 'ui', 'control-panel.html'),
      { name: 'localcart/control-panel.html' }
    );

    await archive.finalize();
    await done;

    const stats = fs.statSync(outPath);
    console.log(`  -> ${archiveName} (${(stats.size / 1024).toFixed(0)} KB)`);
  }

  console.log('Done.');
}

bundle().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});

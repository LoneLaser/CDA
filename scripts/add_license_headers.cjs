#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const owner = process.argv[2] || (require('child_process').execSync('git config user.name || echo ""').toString().trim()) || 'Copyright Owner';
const year = process.argv[3] || new Date().getFullYear();
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');

const exts = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcess(file) {
  return exts.includes(path.extname(file).toLowerCase());
}

function headerText(year, owner) {
  return `// Copyright (c) ${year} ${owner}. All rights reserved.\n// Use of this source code is governed by a license that can be\n// found in the LICENSE file in the root of this repository.\n\n`;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
    } else if (ent.isFile() && shouldProcess(full)) {
      processFile(full);
    }
  }
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('Copyright (c)')) {
    return; // skip files that already have a copyright line
  }
  const header = headerText(year, owner);
  fs.writeFileSync(file, header + content, 'utf8');
  console.log('Prepended header to', file);
}

if (!fs.existsSync(srcDir)) {
  console.error('No src directory found at', srcDir);
  process.exit(1);
}

walk(srcDir);
console.log('Done.');

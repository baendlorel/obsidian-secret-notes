#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Read package.json
const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const tag = `${version}`;

console.log(`📦 Current version: ${version}`);
console.log(`🏷️  Tag name: ${tag}`);

try {
  // Check if tag already exists
  execSync(`git rev-parse ${tag}`, { stdio: 'ignore' });
  console.error(`❌ Tag ${tag} already exists`);
  process.exit(1);
} catch {
  // Tag doesn't exist, continue
}

try {
  // Create tag
  console.log(`📌 Creating tag: ${tag}`);
  execSync(`git tag ${tag}`, { stdio: 'inherit' });

  // Push tag to remote
  console.log(`🚀 Pushing tag to remote`);
  execSync(`git push origin ${tag}`, { stdio: 'inherit' });

  console.log(`✅ Done! Tag ${tag} has been pushed`);
} catch (error) {
  console.error(`❌ Failed:`, error);
  process.exit(1);
}

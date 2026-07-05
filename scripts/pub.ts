#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { bumpPatch } from './bump';

const { current, next } = bumpPatch();

console.log(`Version bumped: ${current} -> ${next} (package.json and manifest.json)`);

console.log('Creating release commit...');

execSync('git add package.json manifest.json', { stdio: 'inherit' });
execSync(`git commit -m "chore: release ${next}"`, { stdio: 'inherit' });
execSync('git push origin HEAD', { stdio: 'inherit' });

console.log('Running tag script...');

execSync('pnpm tag', { stdio: 'inherit' });

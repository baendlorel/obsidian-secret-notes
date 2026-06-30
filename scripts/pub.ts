#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface VersionedJson {
  version: string;
  [key: string]: unknown;
}

function readJson(filePath: string): VersionedJson {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as VersionedJson;
}

function writeJson(filePath: string, value: VersionedJson): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function bumpPatchVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const cwd = process.cwd();
const packageJsonPath = resolve(cwd, 'package.json');
const manifestJsonPath = resolve(cwd, 'manifest.json');
const packageJson = readJson(packageJsonPath);
const manifestJson = readJson(manifestJsonPath);

const currentVersion = packageJson.version;
const nextVersion = bumpPatchVersion(currentVersion);

packageJson.version = nextVersion;
manifestJson.version = nextVersion;

writeJson(packageJsonPath, packageJson);
writeJson(manifestJsonPath, manifestJson);

console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);
console.log('Updated package.json and manifest.json');
console.log('Building...');

console.log('Creating release commit...');

execSync('git add package.json manifest.json', { stdio: 'inherit' });
execSync(`git commit -m "chore: release ${nextVersion}"`, { stdio: 'inherit' });
execSync('git push origin HEAD', { stdio: 'inherit' });

console.log('Running tag script...');

execSync('pnpm tag', { stdio: 'inherit' });

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

function bumpMinorVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  const [, major, minor, patch] = match;
  return `${major}.${Number(minor) + 1}.0`;
}

function bump(bumper: (version: string) => string) {
  const packageJsonPath = join(import.meta.dirname, '..', 'package.json');
  const manifestJsonPath = join(import.meta.dirname, '..', 'manifest.json');
  const packageJson = readJson(packageJsonPath);
  const manifestJson = readJson(manifestJsonPath);

  const current = packageJson.version;
  const next = bumper(current);

  packageJson.version = next;
  manifestJson.version = next;

  writeJson(packageJsonPath, packageJson);
  writeJson(manifestJsonPath, manifestJson);

  return {
    current,
    next,
  };
}

export const bumpPatch = () => bump(bumpPatchVersion);
export const bumpMinor = () => bump(bumpMinorVersion);

if (process.argv.includes('--bump-minor')) {
  bumpMinor();
} else if (process.argv.includes('--bump-patch')) {
  bumpPatch();
}

#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// 读取 package.json
const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const tag = `${version}`;

console.log(`📦 当前版本: ${version}`);
console.log(`🏷️  Tag 名称: ${tag}`);

try {
  // 检查 tag 是否已存在
  execSync(`git rev-parse ${tag}`, { stdio: 'ignore' });
  console.error(`❌ Tag ${tag} 已存在`);
  process.exit(1);
} catch {
  // tag 不存在，继续
}

try {
  // 创建 tag
  console.log(`📌 创建 tag: ${tag}`);
  execSync(`git tag ${tag}`, { stdio: 'inherit' });

  // 推送 tag 到远程
  console.log(`🚀 推送 tag 到远程`);
  execSync(`git push origin ${tag}`, { stdio: 'inherit' });

  console.log(`✅ 成功！Tag ${tag} 已推送`);
} catch (error) {
  console.error(`❌ 失败:`, error);
  process.exit(1);
}

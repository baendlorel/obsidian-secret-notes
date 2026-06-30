// @ts-check
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import esbuild from 'esbuild';
import pkg from './package.json' with { type: 'json' };
import zedGpuiPlugin from 'unplugin-zed-gpui';

const watch = process.argv.includes('--watch');
const outdir = 'dist';
const staticFiles = [
  { from: 'manifest.json', to: 'manifest.json' },
  { from: 'src/styles.css', to: 'styles.css' },
];

/**
 * @param {Record<string,any>} replacement
 */
function replace(replacement) {
  let content = readFileSync('dist/main.js', 'utf-8');
  Object.entries(replacement).forEach(([k, v]) => (content = content.replace(k, v)));
  writeFileSync('dist/main.js', content);
}

function prepareDist() {
  if (!watch) {
    rmSync(outdir, { recursive: true, force: true });
  }

  mkdirSync(outdir, { recursive: true });

  staticFiles.map(({ from, to }) => {
    const destination = join(outdir, to);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(from, destination);
  });
}

prepareDist();

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/state', '@codemirror/view', '@codemirror/language'],
  format: 'cjs',
  target: 'es2020',
  platform: 'browser',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  plugins: [zedGpuiPlugin.esbuild()],
  outfile: join(outdir, 'main.js'),
});

if (watch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  replace({
    __VERSION__: pkg.version,
  });
}

/**
 * Token-light visual guard for routine clone checks.
 *
 * This is a thin orchestrator around the existing no-screenshot guards. It
 * keeps the layout and image-load checks as separate scripts, while giving
 * agents one short command for the common pre-push path.
 *
 * Usage:
 *   node scripts/visual-guard.mjs --clone=http://localhost:4350
 *   node scripts/visual-guard.mjs --clone=http://localhost:4350 --full
 *   node scripts/visual-guard.mjs --layoutPages=portfolio-core --auditPages=portfolio-galleries
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseVisualArgs } from './visual-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = parseVisualArgs();

const sharedArgs = forwardArgs(['clone', 'original', 'targets']);
const layoutPages = valueArg(args.layoutPages, args.pages, 'portfolio-core');
const layoutViewports = valueArg(args.layoutViewports, args.viewports, 'mobile,desktop');
const auditPages = valueArg(args.auditPages, args.pages, 'portfolio-galleries');
const auditViewports = valueArg(args.auditViewports, args.viewports, 'mobile,desktop');
const imageTimeout = valueArg(args.imageTimeout, 25000);
const scrollPasses = valueArg(args.scrollPasses, 3);
const scrollDelay = valueArg(args.scrollDelay, 80);

const steps = [];

if (!flagEnabled(args.skipLayout)) {
  steps.push({
    name: 'visual:check',
    script: 'visual-layout-check.mjs',
    args: [
      ...sharedArgs,
      `--pages=${layoutPages}`,
      `--viewports=${layoutViewports}`,
    ],
  });
}

if (!flagEnabled(args.skipAudit)) {
  steps.push({
    name: 'visual:image-audit',
    script: 'visual-image-audit.mjs',
    args: [
      ...sharedArgs,
      `--pages=${auditPages}`,
      `--viewports=${auditViewports}`,
      `--imageTimeout=${imageTimeout}`,
      `--scrollPasses=${scrollPasses}`,
      `--scrollDelay=${scrollDelay}`,
    ],
  });
}

if (steps.length === 0) {
  console.log('Visual guard skipped: no steps selected.');
  process.exit(0);
}

for (const step of steps) {
  console.log(`\n== ${step.name} ==`);
  const result = spawnSync(process.execPath, [path.join(scriptDir, step.script), ...step.args], {
    cwd: path.resolve(scriptDir, '..'),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nVisual guard passed: ${steps.length} step(s).`);

function forwardArgs(keys) {
  return keys.flatMap((key) => {
    const value = args[key];
    if (value === undefined || value === false) return [];
    if (value === true) return [`--${key}`];
    return [`--${key}=${value}`];
  });
}

function valueArg(...values) {
  return values.find((value) => value !== undefined && value !== true && value !== '') ?? '';
}

function flagEnabled(value) {
  return value === true || value === 'true' || value === '1';
}

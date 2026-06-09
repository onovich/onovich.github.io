import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCmsPackageJson } from '../src/cms/importPackage.js';
import { createCmsApplyPlan } from '../src/cms/applyPackagePlan.js';
import { collectCmsAssetPublishIssues } from '../src/cms/assetReferences.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const args = process.argv.slice(2);
const packagePath = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!packagePath) {
  console.error('Usage: npm run cms:apply -- <onovich-cms-publish.json> [--dry-run]');
  process.exit(1);
}

const payload = parseCmsPackageJson(fs.readFileSync(path.resolve(packagePath), 'utf8'));
const assetIssues = collectCmsAssetPublishIssues(payload, {
  assetExists: publicPath => fs.existsSync(path.join(publicDir, publicPath)),
});
if (assetIssues.length) {
  throw new Error(`CMS package has unpublishable assets:\n${assetIssues.map(issue => `- ${issue.message}`).join('\n')}`);
}
const targets = createCmsApplyPlan(payload);

if (dryRun) {
  console.log('CMS publish dry run. Files that would be written:');
  for (const { relativePath, content } of targets) {
    console.log(`- ${relativePath} (${content.length} bytes)`);
  }
  process.exit(0);
}

for (const { relativePath, content } of targets) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

console.log(`CMS publish applied: ${targets.size} file(s) written.`);

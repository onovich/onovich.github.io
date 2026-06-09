import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatCmsRestoreSummary, restoreCmsApplyBackup } from './cms-apply-file-ops.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const backupRelativePath = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!backupRelativePath) {
  console.error('Usage: npm run cms:restore -- .cms-backups/<timestamp> [--dry-run]');
  process.exit(1);
}

const result = restoreCmsApplyBackup({ root, backupRelativePath, dryRun });
if (dryRun) {
  console.log(`CMS restore dry run: ${backupRelativePath}`);
  for (const action of result.actions) {
    console.log(`- ${action.action}: ${action.relativePath}`);
  }
} else {
  console.log(formatCmsRestoreSummary(result));
}

import fs from 'node:fs';
import path from 'node:path';

export const CMS_APPLY_BACKUP_DIR = '.cms-backups';

export function backupCmsApplyTargets({
  root,
  targets,
  timestamp = formatBackupTimestamp(new Date()),
}) {
  const backupRelativePath = toPosix(path.join(CMS_APPLY_BACKUP_DIR, timestamp));
  const backupRoot = resolveInside(root, backupRelativePath);
  const entries = [];

  fs.mkdirSync(backupRoot, { recursive: true });

  for (const { relativePath } of targets) {
    const sourcePath = resolveInside(root, relativePath);
    const backupPath = resolveInside(backupRoot, relativePath);
    const exists = fs.existsSync(sourcePath);

    if (exists) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(sourcePath, backupPath);
    }

    entries.push({
      relativePath,
      backupPath: exists ? toPosix(path.relative(root, backupPath)) : null,
      existed: exists,
    });
  }

  fs.writeFileSync(
    path.join(backupRoot, 'manifest.json'),
    `${JSON.stringify({ createdAt: new Date().toISOString(), entries }, null, 2)}\n`,
    'utf8',
  );

  return { backupRelativePath, entries };
}

export function writeCmsApplyTargets({ root, targets }) {
  for (const { relativePath, content } of targets) {
    const absolutePath = resolveInside(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
  }
}

export function formatCmsApplyRollbackHint(backup) {
  return `CMS publish backup: ${backup.backupRelativePath}\nRestore by copying files back from this directory before committing.`;
}

function formatBackupTimestamp(date) {
  return date.toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '')
    .replace('T', '-');
}

function resolveInside(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const absolutePath = path.resolve(resolvedRoot, relativePath);
  if (absolutePath !== resolvedRoot && !absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing path outside CMS apply root: ${relativePath}`);
  }
  return absolutePath;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

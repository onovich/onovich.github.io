import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const argumentsFromUser = process.argv.slice(2);

if (argumentsFromUser.some(argument => argument === '--host' || argument.startsWith('--host='))) {
  console.error('The local content editor always binds to 127.0.0.1; do not pass --host.');
  process.exit(1);
}

const child = spawn(process.execPath, [astroCli, 'dev', '--host', '127.0.0.1', ...argumentsFromUser], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ONOVICH_EDITOR: '1',
  },
});

child.once('exit', code => process.exit(code ?? 1));

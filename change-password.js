import bcrypt from 'bcryptjs';
import fs from 'fs';

const ENV_PATH = '.env';

const password = process.argv[2];

if (!password) {
  console.error('Përdorimi: node change-password.js "fjalekalimi-i-ri"');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  process.exit(1);
}

if (!fs.existsSync(ENV_PATH)) {
  console.error('.env nuk u gjet.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

const original = fs.readFileSync(ENV_PATH, 'utf8');
const line = `ADMIN_PASSWORD_HASH=${hash}`;
const updated = /^ADMIN_PASSWORD_HASH=.*$/m.test(original)
  ? original.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line)
  : original.replace(/\s*$/, '\n') + line + '\n';

fs.writeFileSync(ENV_PATH, updated);
console.log('✓ Fjalëkalimi u përditësua në .env. Rinis serverin.');

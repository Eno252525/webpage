import bcrypt from 'bcryptjs';
import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

console.log('\n=== IT Store Setup ===\n');

const password = await ask('Vendos fjalëkalimin e adminit: ');
if (!password || password.length < 6) {
  console.error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  process.exit(1);
}

const whatsapp = await ask('Numri i WhatsApp (p.sh. 355691234567): ');
rl.close();

const hash = await bcrypt.hash(password, 12);
const secret = crypto.randomBytes(32).toString('hex');

const env = `PORT=3000
ADMIN_PASSWORD_HASH=${hash}
JWT_SECRET=${secret}
WHATSAPP_NUMBER=${whatsapp.replace(/\D/g, '')}
`;

fs.writeFileSync('.env', env);
console.log('\n✓ Konfigurimi u ruajt në .env');
console.log('✓ Fillo serverin me: node server.js\n');

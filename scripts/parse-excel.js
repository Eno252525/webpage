import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.join(__dirname, '..', 'Liste Cmimesh.xlsx');

const buf = await readFile(EXCEL_PATH);
const wb = XLSX.read(buf, { type: 'buffer' });

for (const sheetName of wb.SheetNames) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Sheet: "${sheetName}"`);
  console.log('═'.repeat(70));

  const ws = wb.Sheets[sheetName];
  // Use header:1 to get raw arrays (no header interpretation)
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length === 0) { console.log('  (empty)'); continue; }

  console.log(`\nAll ${rows.length} rows (raw arrays):`);
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    console.log(`  Row ${i}:`, JSON.stringify(rows[i]));
  }
  if (rows.length > 20) console.log(`  ... (${rows.length - 20} more rows)`);
}

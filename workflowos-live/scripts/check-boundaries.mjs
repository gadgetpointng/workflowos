import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const protectedTables = ['connected_products','connected_orders'];
const allowedPrefixes = [path.join(root,'app','api','bridge')];
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full = path.join(dir,entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) inspect(full);
  }
}

function inspect(file) {
  const text = fs.readFileSync(file,'utf8');
  if (allowedPrefixes.some(prefix=>file.startsWith(prefix))) return;
  for (const table of protectedTables) {
    const pattern = new RegExp(`from\\(['\"]${table}['\"]\\)[\\s\\S]{0,180}?\\.(insert|update|upsert|delete)\\(`,'m');
    if (pattern.test(text)) violations.push(`${path.relative(root,file)} mutates source-owned mirror ${table}`);
  }
}

walk(path.join(root,'app'));
walk(path.join(root,'lib'));
if (violations.length) {
  console.error('Architecture boundary check failed:\n- '+violations.join('\n- '));
  process.exit(1);
}
console.log('Architecture boundary check passed. Source-owned commerce mirrors are read-only outside bridge ingestion.');

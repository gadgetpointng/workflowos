import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'app');
const scanDirs = [appDir, path.join(root, 'components')];
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx']);
const assetExt = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|map|txt|xml|webmanifest)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function routeFromFile(file) {
  const relative = path.relative(appDir, file).replaceAll(path.sep, '/');
  const pageOrRoute = /(^|\/)(?:page\.(?:tsx|jsx)|route\.(?:ts|js))$/.test(relative);
  if (!pageOrRoute) return null;
  let route = relative.replace(/(^|\/)(?:page\.(?:tsx|jsx)|route\.(?:ts|js))$/, '');
  route = route.split('/').filter((segment) => segment && !/^\(.*\)$/.test(segment)).join('/');
  return route ? `/${route}` : '/';
}

function routeRegex(route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dynamic = escaped
    .replace(/\\\[\\\.\\\.\\\.(.+?)\\\]/g, '.+')
    .replace(/\\\[(.+?)\\\]/g, '[^/]+');
  return new RegExp(`^${dynamic}$`);
}

const routes = walk(appDir).map(routeFromFile).filter(Boolean);
const routeMatchers = routes.map(routeRegex);
const missing = [];
const hrefPattern = /href\s*=\s*["'](\/[^"']*)["']/g;

for (const dir of scanDirs) {
  for (const file of walk(dir)) {
    if (!sourceExt.has(path.extname(file))) continue;
    const text = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = hrefPattern.exec(text))) {
      const raw = match[1];
      if (raw.includes('${')) continue;
      const clean = raw.split(/[?#]/)[0] || '/';
      if (clean.startsWith('/api/') || assetExt.test(clean) || clean === '/sw.js') continue;
      if (!routeMatchers.some((regex) => regex.test(clean))) missing.push(`${path.relative(root, file)} -> ${raw}`);
    }
  }
}

if (missing.length) {
  console.error('Broken internal links found:');
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Internal link check passed for ${routes.length} app routes.`);

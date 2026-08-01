// Full frontend <-> backend contract audit.
//
// For every api.* call in the frontend it resolves the exact backend handler
// and compares the response shape the handler produces with the shape the
// component reads. Both classes of bug found so far live here:
//   - a route the frontend calls that the backend never registered
//   - a handler that answers { success, data } read as if it were the payload
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');

const FE = path.join(REPO, 'frontend', 'src');
const BE = path.join(REPO, 'backend', 'src');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
};

// ---------------------------------------------------------------- backend map
const indexSrc = fs.readFileSync(path.join(BE, 'index.ts'), 'utf8');
const routerFileFor = {};
for (const m of indexSrc.matchAll(/import\s+(\w+Routes)\s+from\s+'\.\/routes\/(\w+)'/g)) {
  routerFileFor[m[1]] = m[2];
}

// "<controller>.<handler>" -> whether it wraps in { success, data }.
// Keyed per file on purpose: several controllers export the same handler name
// (adminController and gamificationController both export getStats), and a
// flat map silently attributed one handler's shape to the other.
const handlerShape = {};
for (const file of fs.readdirSync(path.join(BE, 'controllers'))) {
  const controller = file.replace(/\.ts$/, '');
  const src = fs.readFileSync(path.join(BE, 'controllers', file), 'utf8');
  const parts = src.split(/export const (\w+) = async/).slice(1);
  for (let i = 0; i < parts.length; i += 2) {
    const name = parts[i];
    const body = parts[i + 1] || '';
    const wrapped = /res\.(?:status\(\d+\)\.)?json\(\{\s*success:/.test(body);
    const bare = /res\.(?:status\(\d+\)\.)?json\((?!\{\s*success:)/.test(body);
    handlerShape[`${controller}.${name}`] = wrapped ? 'wrapped' : bare ? 'bare' : 'unknown';
  }
}

const routes = [];
for (const m of indexSrc.matchAll(/app\.use\('\/api([^']*)',\s*(\w+Routes)\)/g)) {
  const prefix = m[1] || '';
  const rf = routerFileFor[m[2]];
  const file = path.join(BE, 'routes', `${rf}.ts`);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  // Which controller does this router import its handlers from?
  const controllers = [...src.matchAll(/from '\.\.\/controllers\/(\w+)'/g)].map((m) => m[1]);
  for (const r of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'([^)]*)\)/g)) {
    const handlers = r[3].split(',').map((h) => h.trim()).filter(Boolean);
    const handler = handlers[handlers.length - 1];
    const sub = r[2] === '/' ? '' : r[2];
    const key = controllers.map((c) => `${c}.${handler}`).find((k) => handlerShape[k]);
    routes.push({
      method: r[1].toUpperCase(),
      path: prefix + sub || '/',
      handler: key || handler,
      shape: (key && handlerShape[key]) || 'unknown',
    });
  }
}

const toRe = (p) =>
  new RegExp(
    '^' +
      p.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') +
      '$'
  );
const matchers = routes.map((r) => ({ ...r, re: toRe(r.path) }));

// --------------------------------------------------------------- frontend map
const missing = [];
const shapeMismatch = [];
const noErrorHandling = [];

for (const file of walk(FE)) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const rel = path.relative(REPO, file);

  lines.forEach((line, i) => {
    const c = line.match(/\bapi\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/);
    if (!c) return;

    const method = c[1].toUpperCase();
    const callPath = c[2].replace(/\$\{[^}]*\}/g, ':x').split('?')[0];
    const route = matchers.find((r) => r.method === method && r.re.test(callPath));

    if (!route) {
      missing.push({ method, callPath, rel, line: i + 1 });
      return;
    }

    // How is the response consumed in the next few lines?
    const varName = (line.match(/(?:const|let)\s+(\w+)\s*=\s*await\s+api\./) || [])[1];
    if (varName && route.shape === 'wrapped') {
      const window = lines.slice(i, i + 8).join('\n');
      const unwrapped = new RegExp(`\\b${varName}\\.data\\s*\\??\\.\\s*data\\b`).test(window);
      // Some components deliberately read the whole envelope (it carries
      // sibling fields such as `unread`), which is correct usage.
      const readsEnvelopeField = new RegExp(
        `\\b${varName}\\.data\\.(?:unread|success|message|questions|score|passed|total|pages|users|courses)\\b`
      ).test(window) ||
        new RegExp(`\\b${varName}\\.data\\s+as\\s`).test(window);
      const bare = new RegExp(`\\b${varName}\\.data\\b`).test(window);
      if (bare && !unwrapped && !readsEnvelopeField) {
        shapeMismatch.push({ method, callPath, rel, line: i + 1, handler: route.handler, snippet: line.trim().slice(0, 84) });
      }
    }

    // Is the call inside a try/catch at all?
    const before = lines.slice(Math.max(0, i - 12), i).join('\n');
    const after = lines.slice(i, i + 12).join('\n');
    if (!/\btry\s*\{/.test(before) && !/\.catch\(/.test(line + after) && !/onError|mutationFn|queryFn/.test(before)) {
      noErrorHandling.push({ method, callPath, rel, line: i + 1 });
    }
  });
}

const section = (title, rows, fmt) => {
  console.log(`\n### ${title}: ${rows.length}`);
  rows.forEach((r) => console.log('  ' + fmt(r)));
};

console.log(`backend routes: ${routes.length}   (wrapped: ${routes.filter((r) => r.shape === 'wrapped').length}, bare: ${routes.filter((r) => r.shape === 'bare').length})`);

section('MISSING ROUTES (frontend calls, backend does not serve)', missing,
  (r) => `${r.method.padEnd(6)} ${r.callPath.padEnd(38)} ${r.rel}:${r.line}`);

section('RESPONSE SHAPE MISMATCH (reads envelope as payload)', shapeMismatch,
  (r) => `${r.method.padEnd(6)} ${r.callPath.padEnd(34)} -> ${r.handler.padEnd(22)} ${r.rel}:${r.line}\n        ${r.snippet}`);

section('NO ERROR HANDLING (an API failure surfaces as a blank screen)', noErrorHandling,
  (r) => `${r.method.padEnd(6)} ${r.callPath.padEnd(38)} ${r.rel}:${r.line}`);

const total = missing.length + shapeMismatch.length;
console.log(`\n==== CONTRACT AUDIT: ${total} blocking, ${noErrorHandling.length} advisory ====`);
process.exit(total > 0 ? 1 : 0);

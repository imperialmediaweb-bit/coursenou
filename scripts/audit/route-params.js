// Route parameters are declared in the router and read in the controller.
// When the two names differ the read is `undefined` and the handler fails at
// runtime — which is exactly what made every share link answer 500
// (route ':token', controller req.params.shareToken).
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');

const BE = path.join(REPO, 'backend', 'src');
const problems = [];

for (const routeFile of fs.readdirSync(path.join(BE, 'routes'))) {
  const routeSrc = fs.readFileSync(path.join(BE, 'routes', routeFile), 'utf8');
  const controllers = [...routeSrc.matchAll(/from '\.\.\/controllers\/(\w+)'/g)].map((m) => m[1]);

  for (const r of routeSrc.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'([^)]*)\)/g)) {
    const routePath = r[2];
    const declared = [...routePath.matchAll(/:(\w+)/g)].map((m) => m[1]);
    if (!declared.length) continue;

    const handler = r[3].split(',').map((h) => h.trim()).filter(Boolean).pop();
    if (!handler) continue;

    for (const controller of controllers) {
      const ctrlPath = path.join(BE, 'controllers', `${controller}.ts`);
      if (!fs.existsSync(ctrlPath)) continue;
      const ctrlSrc = fs.readFileSync(ctrlPath, 'utf8');

      const parts = ctrlSrc.split(/export const (\w+) = async/).slice(1);
      let body = null;
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] === handler) body = parts[i + 1];
      }
      if (body === null) continue;

      const used = [...body.matchAll(/req\.params\.(\w+)/g)].map((m) => m[1]);
      const unknown = [...new Set(used)].filter((u) => !declared.includes(u));

      if (unknown.length) {
        problems.push({
          route: `${r[1].toUpperCase()} ${routePath}`,
          file: `${controller}.${handler}`,
          declared,
          reads: unknown,
        });
      }
      break;
    }
  }
}

console.log(`### ROUTE PARAM MISMATCHES: ${problems.length}`);
for (const p of problems) {
  console.log(`  ${p.route.padEnd(34)} ${p.file}`);
  console.log(`      declares [${p.declared.join(', ')}] but reads [${p.reads.join(', ')}]`);
}
console.log(`\n==== PARAM AUDIT: ${problems.length} ====`);
process.exit(problems.length ? 1 : 0);

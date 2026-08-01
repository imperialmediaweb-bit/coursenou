// Finds handlers and state that a component defines but never wires to
// anything the user can reach.
//
// This is how the AI-provider setting stayed invisible: `aiProvider` state and
// a `handleSaveProvider` function both existed, the API route existed, but no
// control was ever rendered — so a documented feature simply could not be used.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');

const FE = path.join(REPO, 'frontend', 'src');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(e.name)) out.push(full);
  }
  return out;
};

const dead = [];

for (const file of walk(FE)) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(REPO, file);
  const lines = src.split('\n');

  // Handlers that call the API but are never referenced anywhere else.
  for (const m of src.matchAll(/const\s+(handle\w+)\s*=\s*(?:async\s*)?\(/g)) {
    const name = m[1];
    const uses = (src.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (uses <= 1) {
      const line = lines.findIndex((l) => l.includes(`const ${name}`)) + 1;
      dead.push({ rel, line, kind: 'handler never referenced', name });
    }
  }

  // State setters that are never called.
  for (const m of src.matchAll(/const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState/g)) {
    const [, value, setter] = m;
    const setterUses = (src.match(new RegExp(`\\b${setter}\\b`, 'g')) || []).length;
    const valueUses = (src.match(new RegExp(`\\b${value}\\b`, 'g')) || []).length;
    if (setterUses <= 1 && valueUses <= 1) {
      const line = lines.findIndex((l) => l.includes(`${setter}]`)) + 1;
      dead.push({ rel, line, kind: 'state never read or set', name: value });
    }
  }
}

console.log(`### UNREACHABLE UI: ${dead.length}`);
for (const d of dead) {
  console.log(`  ${d.kind.padEnd(28)} ${d.name.padEnd(24)} ${d.rel}:${d.line}`);
}
console.log(`\n==== DEAD UI AUDIT: ${dead.length} ====`);
process.exit(dead.length > 0 ? 1 : 0);

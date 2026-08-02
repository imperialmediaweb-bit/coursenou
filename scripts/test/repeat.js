/**
 * Runs a suite many times and reports which checks are unreliable.
 *
 * A single green run proves the happy path worked once. Repetition is what
 * exposes the rest: races between a save and the reload that verifies it,
 * an AI call that occasionally returns something unparseable, a page that
 * renders before its data arrives. Those fail perhaps one run in twenty, which
 * is exactly the frequency at which a user hits them and a single test does
 * not.
 *
 *   node scripts/test/repeat.js user-deep 100 3
 *                               suite     runs concurrency
 */
const { spawn } = require('child_process');
const path = require('path');

const SUITE = process.argv[2] || 'user-deep';
const RUNS = Number(process.argv[3]) || 20;
const CONCURRENCY = Number(process.argv[4]) || 3;

const script = path.join(__dirname, `${SUITE}.js`);
const started = Date.now();

const results = [];
const failureCounts = new Map(); // check name -> times it failed
let completed = 0;
let cursor = 0;

// A run that could not reach the server tells us nothing about the product.
// Under this much parallelism the local server occasionally gets restarted by
// the supervisor mid-run; those are retried and counted separately so they
// cannot be mistaken for a defect.
const isInfrastructure = (out) =>
  /ERR_CONNECTION_REFUSED|ECONNREFUSED|socket hang up|Target closed/i.test(out);

let infraRetries = 0;

const runOnce = (index, attempt = 1) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));

    child.on('close', async (code) => {
      if (code !== 0 && isInfrastructure(out) && attempt < 3) {
        infraRetries++;
        console.log(`run ${String(index).padStart(3)}  could not reach the server, retrying`);
        await new Promise((r) => setTimeout(r, 8000));
        await runOnce(index, attempt + 1);
        return resolve();
      }

      const failed = [...out.matchAll(/^FAIL {2}(.+?)(?: {2}->.*)?$/gm)].map((m) => m[1].trim());
      for (const name of failed) {
        failureCounts.set(name, (failureCounts.get(name) || 0) + 1);
      }

      const summary = out.match(/====\s+.*?:\s+(\d+) PASS \/ (\d+) FAIL\s+====/);
      const record = {
        index,
        code,
        pass: summary ? Number(summary[1]) : 0,
        fail: summary ? Number(summary[2]) : -1,
        failed,
        // Keep the output of failing runs so a real defect can be read back.
        output: code === 0 ? '' : out.slice(-4000),
      };
      results.push(record);
      completed++;

      const elapsed = Math.round((Date.now() - started) / 1000);
      const rate = completed / Math.max(1, elapsed / 60);
      const remaining = Math.round((RUNS - completed) / Math.max(rate, 0.01));
      console.log(
        `run ${String(index).padStart(3)}  ${code === 0 ? 'PASS' : 'FAIL'}  ` +
          `${record.pass}/${record.pass + Math.max(record.fail, 0)}  ` +
          `[${completed}/${RUNS} done, ~${remaining} min left]` +
          (failed.length ? `  ${failed.join(' | ').slice(0, 100)}` : '')
      );
      resolve();
    });
  });

const worker = async () => {
  while (cursor < RUNS) {
    const index = ++cursor;
    if (index > RUNS) return;
    await runOnce(index);
  }
};

(async () => {
  console.log(`Running ${SUITE} ${RUNS} times, ${CONCURRENCY} at a time.\n`);

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, RUNS) }, worker));

  const green = results.filter((r) => r.code === 0).length;
  const red = results.length - green;
  const minutes = Math.round((Date.now() - started) / 60000);

  console.log(`\n${'='.repeat(62)}`);
  console.log(`${SUITE}: ${green}/${results.length} runs fully green  (${minutes} min)`);
  if (infraRetries) {
    console.log(`${infraRetries} run(s) were retried because the local server was restarting.`);
  }

  if (failureCounts.size === 0) {
    console.log('No check failed in any run.');
  } else {
    console.log('\nChecks that failed at least once — count out of all runs:');
    [...failureCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        const pct = ((count / results.length) * 100).toFixed(1);
        console.log(`  ${String(count).padStart(3)}/${results.length}  (${pct}%)  ${name}`);
      });

    const firstRed = results.find((r) => r.code !== 0);
    if (firstRed) {
      console.log(`\nOutput of the first failing run (#${firstRed.index}):`);
      console.log(firstRed.output);
    }
  }

  console.log('='.repeat(62));
  process.exit(red > 0 ? 1 : 0);
})();

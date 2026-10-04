// Build-time self-test harness — runs the real vitest suite during static
// export and bakes the results into this page, so failures can be read from
// the deployed Pages URL without job-log access. Permanent health-check page.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

const run = promisify(execFile);

interface AssertionResult {
  fullName: string;
  status: string;
  failureMessages?: string[];
}
interface SuiteResult {
  name: string;
  status: string;
  message?: string;
  assertionResults?: AssertionResult[];
}
interface VitestJson {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numFailedTestSuites?: number;
  testResults?: SuiteResult[];
}

interface SelfTestResult {
  ok: boolean;
  summary: string;
  failures: string[];
  rawTail: string;
}

function vitestEntry(): string | null {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs'),
    path.resolve(process.cwd(), '..', '..', 'node_modules', 'vitest', 'vitest.mjs'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

async function runSuite(): Promise<SelfTestResult> {
  const entry = vitestEntry();
  if (!entry) {
    return { ok: false, summary: 'vitest entry not found on disk', failures: [], rawTail: process.cwd() };
  }
  try {
    const { stdout, stderr } = await run(process.execPath, [entry, 'run', '--reporter=json', '--silent'], {
      cwd: process.cwd(),
      timeout: 180_000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CI: 'true' },
    });
    const start = stdout.indexOf('{');
    const end = stdout.lastIndexOf('}');
    const json = JSON.parse(stdout.slice(start, end + 1)) as VitestJson;
    const failures: string[] = [];
    for (const s of json.testResults ?? []) {
      if (s.status !== 'failed') continue;
      if (s.assertionResults && s.assertionResults.length > 0) {
        for (const a of s.assertionResults) {
          if (a.status === 'failed') {
            failures.push(`✗ ${s.name} › ${a.fullName}\n${(a.failureMessages ?? []).join('\n').slice(0, 2000)}`);
          }
        }
      } else {
        failures.push(`✗ ${s.name} (suite failed to run)\n${(s.message ?? '(no message)').slice(0, 2000)}`);
      }
    }
    const ok = (json.numFailedTests ?? 0) === 0 && (json.numFailedTestSuites ?? 0) === 0;
    return {
      ok,
      summary: `${json.numPassedTests ?? 0}/${json.numTotalTests ?? 0} tests passed · ${json.numFailedTests ?? 0} failed tests · ${json.numFailedTestSuites ?? 0} failed suites`,
      failures,
      rawTail: stderr.slice(-3000),
    };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      summary: `vitest exited non-zero or crashed: ${err.message ?? 'unknown'}`,
      failures: [],
      rawTail: `${err.stdout ?? ''}\n${err.stderr ?? ''}`.slice(-8000),
    };
  }
}

export default async function SelfTestPage() {
  let result: SelfTestResult;
  try {
    result = await runSuite();
  } catch (e) {
    result = { ok: false, summary: 'self-test harness crashed', failures: [], rawTail: String(e).slice(0, 4000) };
  }
  return (
    <main
      style={{
        background: '#0b0b12',
        color: '#e8e8f0',
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Amoji self-test — {result.ok ? '✅ PASS' : '❌ FAIL'}</h1>
      <p style={{ marginBottom: 16 }}>{result.summary}</p>
      {result.failures.length > 0 && <section>{result.failures.join('\n\n—————\n\n')}</section>}
      {result.rawTail ? <section>{`——— stderr / stdout tail ———\n${result.rawTail}`}</section> : null}
    </main>
  );
}

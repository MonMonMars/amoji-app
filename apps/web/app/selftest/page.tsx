// Build-time self-test harness — runs the real vitest suite during static
// export and bakes the results into this page, so failures can be read from
// the deployed Pages URL without job-log access. Permanent health-check page.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

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

function vitestEntry(): string | null {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs'),
    path.resolve(process.cwd(), '..', '..', 'node_modules', 'vitest', 'vitest.mjs'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function runVitest(entry: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [entry, 'run', '--reporter=json', '--silent'],
      {
        cwd: process.cwd(),
        timeout: 180_000,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, CI: 'true' },
      },
      (err, stdout, stderr) => {
        resolve({ code: err ? 1 : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

function extractJson(stdout: string): { json: VitestJson | null; error: string } {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end <= start) return { json: null, error: 'no JSON object in vitest stdout' };
  try {
    return { json: JSON.parse(stdout.slice(start, end + 1)) as VitestJson, error: '' };
  } catch (e) {
    return { json: null, error: String(e) };
  }
}

function failuresFrom(json: VitestJson): string[] {
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
  return failures;
}

export default async function SelfTestPage() {
  let summary: string;
  let failures: string[] = [];
  let extra = '';
  const entry = vitestEntry();
  if (!entry) {
    summary = '❌ vitest entry not found on disk (cwd: ' + process.cwd() + ')';
  } else {
    try {
      const { code, stdout, stderr } = await runVitest(entry);
      const { json, error } = extractJson(stdout);
      if (json) {
        const ok = code === 0 && (json.numFailedTests ?? 0) === 0 && (json.numFailedTestSuites ?? 0) === 0;
        summary = `${ok ? '✅ PASS' : '❌ FAIL'} — exit ${code} · ${json.numPassedTests ?? 0}/${json.numTotalTests ?? 0} tests passed · ${json.numFailedTests ?? 0} failed tests · ${json.numFailedTestSuites ?? 0} failed suites`;
        failures = failuresFrom(json);
        if (failures.length === 0 && !ok) extra = '——— stderr ———\n' + stderr.slice(-3000);
      } else {
        summary = `❌ could not parse vitest JSON (${error}) — exit ${code}`;
        extra = '——— stdout tail ———\n' + stdout.slice(-4000) + '\n——— stderr tail ———\n' + stderr.slice(-4000);
      }
    } catch (e) {
      summary = '❌ self-test harness crashed: ' + String(e).slice(0, 500);
    }
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
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Amoji self-test</h1>
      <p style={{ marginBottom: 16 }}>{summary}</p>
      {failures.length > 0 && <section>{failures.join('\n\n—————\n\n')}</section>}
      {extra ? <section>{extra}</section> : null}
    </main>
  );
}

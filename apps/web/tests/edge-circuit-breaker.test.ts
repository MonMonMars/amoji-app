import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const edge = readFileSync(join(web, 'lib/edge-tts.ts'), 'utf8');

describe('edge endpoint circuit breaker', () => {
  it('trips after repeated failures and exposes a query', () => {
    expect(edge).toContain('EDGE_FAILURE_LIMIT');
    expect(edge).toContain('EDGE_COOLDOWN_MS');
    expect(edge).toContain('export function edgeEndpointsDead');
    expect(edge).toContain('export function resetEdgeHealth');
  });

  it('fails fast instead of attempting the socket while open', () => {
    // The point: a dead endpoint must not cost a round trip on every line.
    expect(edge).toMatch(/if \(edgeEndpointsDead\(\)\)\s*\{[\s\S]{0,120}reject/);
  });

  it('does not count a user cut as an endpoint failure', () => {
    // stopSpeaking() rejects as 'canceled'; that must not trip the breaker or
    // normal interruptions would disable neural voice for five minutes.
    expect(edge).toMatch(/if \(msg !== 'canceled'\) noteEdgeFailure\(\)/);
  });

  it('clears on a successful play and after the cooldown', () => {
    expect(edge).toMatch(/\(v\) => \{[\s\S]{0,80}edgeFailures = 0/);
    expect(edge).toMatch(/Date\.now\(\) >= edgeDeadUntil/);
  });

  it('the chain skips the neural tier while the breaker is open', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).toMatch(/const edgeOn =[\s\S]{0,160}!edgeEndpointsDead\(\)/);
  });
});

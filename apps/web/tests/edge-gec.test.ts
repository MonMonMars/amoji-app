import { describe, expect, it } from 'vitest';
import { EDGE_GEC_VERSION, edgeReadAloudUrl, secMsGec } from '../../../server/amoji-proxy/edge-gec.js';

describe('Edge read-aloud handshake', () => {
  it('matches the v2 Sec-MS-GEC token for a fixed clock', () => {
    expect(secMsGec(1_760_000_000)).toBe(
      '6D50DDDB91812C33-DD68EFB01898B0750C9797D51A5FF93471DFDAE6888A1039D532CBDCCE54545D',
    );
    expect(EDGE_GEC_VERSION.startsWith('2-')).toBe(true);
  });

  it('puts the token on the socket URL', () => {
    const url = edgeReadAloudUrl('abc', 1_760_000_000);
    expect(url).toContain('Sec-MS-GEC=6D50DDDB91812C33-');
    expect(url).toContain(`Sec-MS-GEC-Version=${EDGE_GEC_VERSION}`);
    expect(url).toContain('ConnectionId=abc');
    expect(url.startsWith('wss://speech.platform.bing.com/')).toBe(true);
  });
});

// Renders the REAL gate component rather than grepping its source, for the
// properties that a source scan cannot prove:
//   - the first screen a user meets really shows the 18+ copy and a tick box;
//   - the Continue button is disabled until the box is ticked, so a stray tap
//     cannot walk past the age question;
//   - the audio question is NOT on screen before any sample was played;
//   - the protected screen never renders while the gate is unanswered.
//
// react-dom/server is used because this repo ships no DOM test environment
// (see tests/brain-optional-ui.test.tsx for the same pattern). A server render
// is enough for all four properties: they are about what is emitted, not about
// what a click later changes.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EntryGate from '../components/EntryGate';
import RequireEntryGate from '../components/RequireEntryGate';
import { LANGS, t } from '../lib/prefs';

const render = (lang: 'en' | 'yue' | 'zh' | 'ja' = 'en') =>
  renderToStaticMarkup(<EntryGate lang={lang} />);

describe('entry gate — what the user actually sees first', () => {
  it('step 1 is the 18+ statement, a tick box and a disabled Continue', () => {
    const html = render();
    expect(html).toContain(t('en', 'gate18Title'));
    expect(html).toContain(t('en', 'gate18Body'));
    expect(html).toContain(t('en', 'gate18Ack'));
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-testid="entry-gate-18"');
    // Continue must be inert until the box is ticked (attribute order varies).
    expect(html).toContain('data-testid="entry-gate-18-continue"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="entry-gate-18-continue"/);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*disabled=""/);
  });

  it('the audio step (and its test button) is not reachable on first paint', () => {
    const html = render();
    expect(html).not.toContain(t('en', 'gateAudioTest'));
    expect(html).not.toContain('entry-gate-test-sound');
    expect(html).not.toContain(t('en', 'gateAudioIosHint'));
  });

  it('the 18+ wording is rendered in every shipped language', () => {
    for (const { id } of LANGS) {
      const html = renderToStaticMarkup(<EntryGate lang={id} />);
      expect(html, id).toContain(t(id, 'gate18Title'));
      expect(html, id).toContain(t(id, 'gate18Ack'));
      // the age itself is legible in the copy, not only in a data attribute
      expect(html, id).toContain('18');
    }
  });

  it('announces the step through a labelled progress group', () => {
    const html = render();
    expect(html).toContain('role="group"');
    expect(html).toContain(t('en', 'gateStep', { n: '1', total: '3' }));
  });

  it('the gate is one main landmark with a titled heading', () => {
    const html = render();
    expect(html).toContain('data-testid="entry-gate"');
    expect(html).toContain('aria-labelledby="amoji-gate-title"');
    expect(html).toContain('id="amoji-gate-title"');
  });
});

describe('RequireEntryGate — the protected screen never leaks', () => {
  it('emits only the boot blocker, never the children', () => {
    const html = renderToStaticMarkup(
      <RequireEntryGate>
        <p>SECRET-ROOM-CONTENT</p>
      </RequireEntryGate>,
    );
    expect(html).toContain('entry-gate-boot');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('SECRET-ROOM-CONTENT');
  });
});

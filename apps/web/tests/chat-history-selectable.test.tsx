import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';

const web = join(__dirname, '..');
const chatPanel = readFileSync(join(web, 'components/ChatPanel.tsx'), 'utf8');

describe('chat history text selection', () => {
  it('history scroll region does not use select-none', () => {
    const scrollBlock = chatPanel.slice(
      chatPanel.indexOf('data-testid="chat-history-scroll"'),
      chatPanel.indexOf('data-testid="chat-history-scroll"') + 600,
    );
    expect(scrollBlock).toContain('data-testid="chat-history-scroll"');
    expect(scrollBlock).not.toContain('select-none');
    expect(scrollBlock).toContain('overflow-y-auto');
    expect(scrollBlock).toContain('touch-pan-y');
  });

  it('message bubbles opt in to native text selection', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Settled reply text."
        lang="en"
        accent="#f9a8d4"
        onReport={() => {}}
      />,
    );
    expect(html).toContain('data-testid="chat-message"');
    expect(html).toContain('select-text');
    expect(html).not.toMatch(/chat-message[^>]*select-none/);
  });
});

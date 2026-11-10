import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';

describe('chat history bubbles', () => {
  it('shows talking text only — no per-turn memory strip', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Hello back!"
        lang="yue"
        accent="#f0a"
        onReport={() => {}}
      />,
    );
    expect(html).toContain('Hello back!');
    expect(html).not.toContain('data-testid="memory-turn-used"');
    expect(html).not.toContain('本輪用咗邊啲記憶');
    expect(html).not.toContain('Memories used this turn');
  });
});

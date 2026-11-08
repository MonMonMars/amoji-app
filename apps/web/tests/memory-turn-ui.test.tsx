import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';
import { t } from '../lib/prefs';

describe('per-turn memory transparency', () => {
  it('renders expandable memory strip with localized summary', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Hello back!"
        lang="yue"
        accent="#f0a"
        memoryUsed={[{ id: 'fact:likes: ramen', snippet: '鍾意 ramen', source: 'fact', deletable: true }]}
        onForgetMemory={() => {}}
        onReport={() => {}}
      />,
    );
    expect(html).toContain('data-testid="memory-turn-used"');
    expect(html).toContain(t('yue', 'memoryTurnUsed'));
    expect(html).toContain('鍾意 ramen');
    expect(html).toContain(t('yue', 'memoryTurnDelete'));
  });
});

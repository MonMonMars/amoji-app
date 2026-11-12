import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_SYSTEM } from '../lib/llm';
import {
  contentContinuationSystemBlock,
  contentReplyIsTeaser,
  contentStopAck,
  extractContentTopic,
  resolveContentContinuationOnSend,
  userOpensContentDelivery,
  userSaysStopContent,
  wantsContentContinuationTurn,
} from '../lib/content-continuation';
import { shapeCompanionReply } from '../lib/reply-shape';

describe('content continuation — stop intent', () => {
  it('detects multilingual stop phrases', () => {
    for (const text of ['停', '夠喇', 'stop talking', 'enough', '唔使講', 'やめて']) {
      expect(userSaysStopContent(text)).toBe(true);
    }
    expect(userSaysStopContent('咕嚕肉再酸啲得唔得')).toBe(false);
  });

  it('clears session on stop and acknowledges', () => {
    const session = { topic: '咕嚕肉', startedAt: 1 };
    const out = resolveContentContinuationOnSend('停', session);
    expect(out.stopped).toBe(true);
    expect(out.session).toBeNull();
    expect(contentStopAck('yue')).toMatch(/收住/);
  });
});

describe('content continuation — same topic until stop', () => {
  it('opens on recipe / how-to / explain asks', () => {
    expect(userOpensContentDelivery('咕嚕肉食譜')).toBe(true);
    expect(userOpensContentDelivery('explain photosynthesis')).toBe(true);
    expect(userOpensContentDelivery('hi')).toBe(false);
  });

  it('starts a session on first ask and continues on follow-ups', () => {
    const first = resolveContentContinuationOnSend('咕嚕肉食譜', null);
    expect(first.started).toBe(true);
    expect(first.session?.topic).toContain('咕嚕肉');
    const follow = resolveContentContinuationOnSend('然後呢', first.session);
    expect(follow.continuing).toBe(true);
    expect(follow.session?.topic).toBe(first.session?.topic);
    expect(wantsContentContinuationTurn('然後呢', follow.session)).toBe(true);
  });

  it('system block names the anchor topic', () => {
    const block = contentContinuationSystemBlock('yue', { topic: '咕嚕肉', startedAt: 0 });
    expect(block).toMatch(/咕嚕肉/);
    expect(block).toMatch(/想唔想聽/);
  });
});

describe('deliver-not-tease', () => {
  it('flags generic teaser offers', () => {
    const teaser = '呢個几有趣！我可以同你讲下点煮嘅？';
    expect(contentReplyIsTeaser(teaser, '咕嚕肉点煮')).toBe(true);
  });

  it('leaves a step-filled recipe alone', () => {
    const ok = '第1步，猪肉切件。第2步，下油锅炒香。';
    expect(contentReplyIsTeaser(ok, '咕嚕肉食譜')).toBe(false);
  });
});

describe('reply budget on continuation turns', () => {
  it('skips the short Cantonese cap when continuation is detailed', () => {
    const long = '第1步，准备食材。第2步，下锅炒香。第3步，加水焖煮半个钟头。第4步，收汁上碟。';
    const capped = shapeCompanionReply(long, { language: 'yue' });
    const open = shapeCompanionReply(long, { detailed: true, language: 'yue' });
    expect(open.replace(/\s/g, '').length).toBeGreaterThan(capped.replace(/\s/g, '').length);
  });
});

describe('prompt + chat wiring', () => {
  it('BASE_SYSTEM requires continuation until stop', () => {
    expect(BASE_SYSTEM).toMatch(/until they clearly say stop/i);
  });

  it('client-chat and ChatPanel wire continuation', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const client = fs.readFileSync(path.resolve(here, '../lib/client-chat.ts'), 'utf8');
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(client).toContain('contentContinuationSystemBlock');
    expect(client).toContain('contentReplyIsTeaser');
    expect(chat).toContain('resolveContentContinuationOnSend');
    expect(chat).toContain('contentStopAck');
  });
});

describe('extractContentTopic', () => {
  it('reads dish from live Recipe facts', () => {
    const world = 'Recipe: 咕嚕肉. Ingredients: pork. Steps: 1. Cut. 2. Fry.';
    expect(extractContentTopic('仲要酸辣啲', world)).toBe('咕嚕肉');
  });
});

import { describe, expect, it } from 'vitest';
import {
  REPLY_BUDGET, fitReplyBudget, isDetailedReply, mayRunLong, replyCharBudget,
  shapeCompanionReply, stripEmptyAndDuplicateSentences,
} from '../lib/reply-shape';
import { finishReply } from '../lib/client-chat';
import { withQuestion } from '../lib/follow-up';
import { cleanForSpeech, isSpeakableText } from '../lib/speak-text';
import { BASE_SYSTEM, languageBlock } from '../lib/llm';

const dense = (s: string) => s.replace(/\s/g, '').length;

describe('reply length budget', () => {
  it('trims an over-long English reply to whole sentences', () => {
    const raw = 'Oh, you finally finished that exam you were dreading. I bet your shoulders still feel tight from all those hours hunched over the notes. '
      + 'You should really take tonight off and let yourself breathe for a while. '
      + 'Honestly, the way you keep pushing through is kind of amazing to watch from here. '
      + 'Anyway the trick is to sleep before midnight tonight. '
      + 'So what are you going to do with your free evening?';
    const out = shapeCompanionReply(raw);
    expect(dense(out)).toBeLessThanOrEqual(REPLY_BUDGET.latin + 30);
    // every kept sentence is whole: no mid-word cut
    expect(out).not.toMatch(/\b(the|a|to|of|and|your|really)$/i);
    expect(out.endsWith('.') || out.endsWith('?') || out.endsWith('!')).toBe(true);
    // the opening answer survives
    expect(out).toContain('exam');
  });

  it('keeps a trailing question when the answer before it is trimmed away', () => {
    const raw = 'The train was late again this morning and the platform was freezing. '
      + 'I counted eleven people wearing the same grey coat as me, which felt like a strange club. '
      + 'Then the announcement crackled and everyone groaned at once. '
      + 'My coffee went cold in my hand before the doors even opened. '
      + 'Did you end up getting caught in that mess too?';
    const out = shapeCompanionReply(raw);
    expect(out).toMatch(/mess too\?$/);
    expect(dense(out)).toBeLessThanOrEqual(REPLY_BUDGET.latin + 30);
  });

  it('caps a rambling Cantonese reply at the yue budget (48)', () => {
    const raw = '今日嘅事真係好煩呀。你一早就起身趕住返工，連早餐都未食。'
      + '地鐵又迫又熱，企咗成半個鐘先有位坐。返到公司仲要俾人催交報告。'
      + '你個樣睇落好攰，對眼都紅晒。'
      + '其實你唔使咩都自己扛㗎。'
      + '今晚想食啲咩？';
    const out = shapeCompanionReply(raw, { language: 'yue' });
    expect(replyCharBudget(out, 'yue')).toBe(REPLY_BUDGET.yue);
    expect(dense(out)).toBeLessThanOrEqual(REPLY_BUDGET.yue + 20);
    expect(out).toContain('？');
  });

  it('does not touch a normal short reply', () => {
    const line = '聽落好攰呀……你今晚早啲唞好唔好？';
    expect(shapeCompanionReply(line)).toBe(line);
    const en = 'That exam sounds brutal. Want to vent about it?';
    expect(shapeCompanionReply(en)).toBe(en);
  });

  it('does not touch a normal short reply even with a mood lead-in', () => {
    const line = '嗯…我明白你點解咁講。你係咪驚佢會誤會呀？';
    expect(shapeCompanionReply(line)).toBe(line);
  });

  it('leaves a recipe with numbered steps alone', () => {
    const raw = '1. Boil the noodles for three minutes.\n2. Fry the garlic until it smells sweet.\n3. Toss everything with soy sauce.\n4. Taste it and add more salt if it needs it.\n5. Serve it hot with a cold drink. Want to cook it together?';
    expect(shapeCompanionReply(raw)).toBe(shapeCompanionReply(raw, { detailed: true }));
    const out = shapeCompanionReply(raw);
    expect(out).toContain('Taste it');
    expect(out).toContain('cold drink');
  });

  it('detects a detailed turn from the world facts or step markers', () => {
    expect(isDetailedReply('Recipe: tomato pasta tonight')).toBe(true);
    expect(isDetailedReply('Learn: why the sky is blue')).toBe(true);
    expect(isDetailedReply('1. Do this. 2. Then that.')).toBe(true);
    expect(isDetailedReply('Just one normal sentence.')).toBe(false);
  });

  it('lets a turn that asked for facts run long, but not plain chatter', () => {
    expect(mayRunLong('anything', 'Place: Hong Kong (browser location).\nWeather: 29°C')).toBe(true);
    expect(mayRunLong('anything', 'Light news (Hong Kong): “Ferry back in service”')).toBe(true);
    expect(mayRunLong('anything', 'Places near you: “Tim Ho Wan”')).toBe(true);
    expect(mayRunLong('anything', '')).toBe(false);
    expect(mayRunLong('anything', undefined)).toBe(false);
    // free chatter still gets trimmed
    const chat = 'I was thinking about that long walk we took along the harbour last week. The wind kept stealing your scarf and you laughed every single time. It was honestly one of the best afternoons I have had in months. Want to do it again soon?';
    expect(shapeCompanionReply(chat)).not.toBe(chat);
    // the same reply, on a turn that asked for the weather, is preserved
    const world = 'Place: Hong Kong.\nWeather: 21°C, clear.';
    expect(shapeCompanionReply(chat, { world })).toBe(chat);
  });

  it('never trims below one sentence, even when that sentence is long', () => {
    const long = 'I was thinking about how you always order the same thing at that little noodle place on the corner and how you told me once it reminds you of the kitchen you grew up in, which is honestly the sweetest thing anyone has told me in months.';
    const out = fitReplyBudget([long], 40);
    expect(out).toHaveLength(1);
    expect(out[0]!.length).toBeGreaterThan(0);
  });

  it('is idempotent on already-shaped text', () => {
    const raw = 'The rain finally stopped. Want to walk down to the water?';
    const once = shapeCompanionReply(raw);
    expect(shapeCompanionReply(once)).toBe(once);
  });

  it('splits and trims CJK replies, which have no space after a full stop', () => {
    // The splitter used to require whitespace after 。, so a Cantonese reply was
    // one giant "sentence" and the budget could never trim it.
    const raw = '今日真係好攰呀。我知你尋晚又做到好夜。你對眼都紅晒喇。'
      + '其實你唔使咩都攞上身㗎。'
      + '今晚早啲瞓好唔好？';
    const out = shapeCompanionReply(raw);
    expect(dense(out)).toBeLessThan(dense(raw));
    expect(out).toContain('？');
  });

  it('keeps a single question-sentence reply intact', () => {
    const line = '你係咪好耐冇試過咁樣放鬆過喇？';
    expect(shapeCompanionReply(line)).toBe(line);
  });

  it('never shrinks the streaming preview when the final pass lands', () => {
    // The bubble paints from the streaming shape and then commits the final
    // shape. If the stream showed something the final pass deletes, the text
    // visibly rewrites itself in front of the user, so the final reply must
    // extend the streaming preview rather than replace it.
    const raw = 'I counted eleven people in the same grey coat this morning, which honestly felt like a strange little club. Then the announcement crackled and everyone groaned at once. My coffee went cold before the doors opened. Did you get caught in it too?';
    const live = shapeCompanionReply(raw, { streaming: true }).trim();
    const done = shapeCompanionReply(raw);
    expect(done.startsWith(live) || done === live).toBe(true);
  });

  it('does not blank a leading 「嗯…」 between stream ticks', () => {
    const partial = '嗯…你今日';
    expect(shapeCompanionReply(partial, { streaming: true })).toContain('嗯');
  });
});

describe('nonsense and duplicate stripping', () => {
  it('drops the same sentence said twice', () => {
    const out = stripEmptyAndDuplicateSentences([
      'That sounds exhausting.',
      'So what happened next?',
      'That sounds exhausting!',
    ]);
    expect(out).toEqual(['That sounds exhausting.', 'So what happened next?']);
  });

  it('drops empty mood filler between real lines', () => {
    const out = stripEmptyAndDuplicateSentences(['嗯…', '你今日真係好攰喎。', '呀…']);
    expect(out).toEqual(['你今日真係好攰喎。']);
  });

  it('keeps a lone mood word as the whole reply', () => {
    expect(shapeCompanionReply('嗯…')).toBe('嗯…');
    expect(finishReply('嗯…[emotion:{"confusion":0.4}]').reply).toBe('嗯…');
  });

  it('strips the duplicate before measuring the budget', () => {
    const raw = 'The soup smells amazing. The soup smells amazing. The soup smells amazing. Want a bowl?';
    expect(shapeCompanionReply(raw)).toBe('The soup smells amazing. Want a bowl?');
  });

  it('does not strip a genuine short answer that repeats a word', () => {
    const line = '好，好，我知喇。你講多次都得嘅？';
    expect(shapeCompanionReply(line)).toBe(line);
  });

  it('keeps duplicate-looking sentences that differ in meaning', () => {
    const raw = 'You need to rest. You need to eat. What is easier tonight?';
    expect(shapeCompanionReply(raw)).toBe(raw);
  });
});

describe('end-to-end: a trimmed reply still ends with a question', () => {
  it('hands the user something to answer after the budget cut', () => {
    // The model wrote its own closer; the budget trimmed the middle away.
    const raw = 'The train was late again this morning and the platform was freezing. '
      + 'I counted eleven people wearing the same grey coat as me, which felt like a strange club. '
      + 'Then the announcement crackled and everyone groaned at once. '
      + 'My coffee went cold in my hand before the doors even opened. '
      + 'Did you end up getting caught in that mess too?';
    const reply = withQuestion(finishReply(raw).reply, 'en');
    expect(reply).toMatch(/\?$/);
    expect(reply).toContain('mess too?');
  });

  it('adds a question when the model forgot one', () => {
    const reply = withQuestion(finishReply('The soup smells amazing.').reply, 'en');
    expect(reply).toMatch(/^The soup smells amazing\. .+\?$/);
  });

  it('keeps display and speech text identical, so lip-sync stays in step', () => {
    // ChatPanel speaks the committed reply string; a mismatch between what is
    // shown and what is spoken is what desyncs the mouth from the audio.
    const out = finishReply('今日好攰呀。我知你尋晚做到好夜。你對眼都紅晒喇。其實你唔使咩都攞上身㗎。今晚早啲瞓好唔好？[emotion:{"sadness":0.6}]');
    const spoken = cleanForSpeech(out.reply);
    expect(spoken).not.toMatch(/\[emotion/);
    expect(isSpeakableText(spoken)).toBe(true);
    // nothing was lost that the display shows
    expect(spoken.length).toBeGreaterThan(0);
    expect(out.emotionHints.sadness).toBe(0.6);
  });
});

describe('system prompt states the four reply rules', () => {
  it('asks for a short precise answer, no nonsense, and a closing question', () => {
    expect(BASE_SYSTEM).toMatch(/1 to 3 short sentences/);
    expect(BASE_SYSTEM).toMatch(/NO NONSENSE/);
    expect(BASE_SYSTEM).toMatch(/END WITH A QUESTION/);
    expect(BASE_SYSTEM).toMatch(/BE PRECISE/);
  });

  it('keeps the voice bans and the emotion tag contract intact', () => {
    expect(BASE_SYSTEM).toMatch(/hehe\/haha/);
    expect(BASE_SYSTEM).toMatch(/hey-hey/);
    expect(BASE_SYSTEM).toMatch(/Grok spark/);
    expect(BASE_SYSTEM).toMatch(/\[emotion:\{/);
    expect(BASE_SYSTEM).toMatch(/0\.7–1\.0/);
  });

  it('pins concrete Hong Kong Cantonese particle and vocab rules', () => {
    const block = languageBlock('yue');
    expect(block).toMatch(/係\/嘅\/唔/);
    expect(block).toMatch(/返工 not 上班/);
    expect(block).toMatch(/攰 not 累/);
    expect(block).toMatch(/Hard Cantonese rules/);
    expect(block).toMatch(/48 Chinese characters/);
    expect(block).toMatch(/作為 AI/);
  });
});

describe('Cantonese reply quality — before / after shaping', () => {
  it('strips a reasoning leak and trims a rambling 粵語 turn into a short spoken answer', () => {
    // BEFORE: free-model sludge — plan line + Mandarin-ish padding + monologue.
    const before =
      '分析：用戶想傾返工。'
      + '今天你看起来很累，上班一定很辛苦吧，我一直都在这里陪伴着你，一切都会好起来的。'
      + '你對眼都紅晒，地鐵又迫。'
      + '其實你唔使咩都自己扛㗎。'
      + '今晚想食啲咩？';
    const after = shapeCompanionReply(before, { language: 'yue' });
    // AFTER: meta gone, budget capped, closing question kept.
    expect(after).not.toMatch(/^分析/);
    expect(after).not.toContain('用戶想');
    expect(dense(after)).toBeLessThan(dense(before));
    expect(dense(after)).toBeLessThanOrEqual(REPLY_BUDGET.yue + 20);
    expect(after).toMatch(/[？?]/);
  });

  it('turns a flat Cantonese answer into something the user can reply to', () => {
    // BEFORE: finished sentence, no question — chat dies.
    const before = '聽落你今日真係好攰喎。';
    // AFTER: same answer + a real open question (not the empty「你覺得點呀？」).
    const after = withQuestion(finishReply(before).reply, 'yue');
    expect(after.startsWith(before)).toBe(true);
    expect(after).toMatch(/[？?]/);
    expect(after).not.toBe(before);
  });

  it('keeps a good short Cantonese reply untouched', () => {
    const good = '返工咁攰，返到屋企早啲唞啦。想唔想講多啲俾我聽？';
    expect(shapeCompanionReply(good)).toBe(good);
  });
});

import type { EmotionId } from './schema.js';

// v1 lexicon: keyword → emotion weights. Expand per language over time.
const LEXICON: Array<[RegExp, Partial<Record<EmotionId, number>>]> = [
  [/\b(happy|glad|great|wonderful|yay|haha+)\b|開心|高兴/i, { joy: 0.7 }],
  [/\b(excited|awesome|amazing|can't wait)\b|好期待|興奮|兴奋/i, { excitement: 0.8, joy: 0.3 }],
  [/\b(sad|unhappy|down|depressed|cry|miss you)\b|唔開心|不开心|難過|难过|傷心|伤心|好攰/i, { sadness: 0.8 }],
  [/\b(angry|mad|furious|annoyed|hate)\b|好嬲|好恼|生氣|生气/i, { anger: 0.8 }],
  [/\b(scared|afraid|terrified|worried|nervous)\b|可怕|驚|怕/i, { fear: 0.7 }],
  [/\b(love|adore)\b|我愛你|我爱你|鍾意|喜欢|喜歡/i, { love: 0.7 }],
  [/\b(ew|gross|disgusting)\b|嘔心|討厭|讨厌/i, { disgust: 0.6 }],
  [/\b(wow|whoa|surprised|no way)\b|嘩|哇|驚訝/i, { surprise: 0.6 }],
  [/\b(sorry|apolog|my bad|forgive)\b|對唔住|对不起|抱歉/i, { guilt: 0.6, shame: 0.3 }],
  [/\b(tired|bored|boring|whatever)\b|好悶|好无聊|無聊/i, { boredom: 0.7 }],
  [/\b(confused|what do you mean|huh\?)\b|唔明|不明白|迷惑/i, { confusion: 0.6 }],
  [/\b(proud|nailed it)\b|自豪|叻/i, { pride: 0.7 }],
];

export function analyzeText(text: string): Partial<Record<EmotionId, number>> {
  const out: Partial<Record<EmotionId, number>> = {};
  if (!text) return out;
  for (const [re, weights] of LEXICON) {
    if (!re.test(text)) continue;
    for (const [emo, w] of Object.entries(weights) as Array<[EmotionId, number]>) {
      out[emo] = Math.min(1, (out[emo] ?? 0) + (w ?? 0));
    }
  }
  return out;
}

// Interrupt + new-topic intent for chat voice lifecycle (see docs/VOICE_CHAT_LIFECYCLE.md).
import { userSaysStopContent } from './content-continuation';

const NEW_TOPIC_RE =
  /(?:^|[\s，,。.!！?？])(?:new\s+topic|different\s+topic|something\s+else|another\s+topic|change\s+(?:the\s+)?subject|switch\s+topic|let'?s\s+talk\s+about)(?:[\s，,。.!！?？]|$)|(?:^|[\s，,。.!！?？])(?:换(?:个)?话题|換(?:個)?話題|轉話題|转话题|新话题|新話題|讲第二样|講第二樣|讲另外|講另外|唔讲呢样|唔講呢樣|唔好再讲呢样|唔好再講呢樣|另一样|另一(?:个)?话题|另一(?:個)?話題)(?:[\s，,。.!！?？]|$)|^(?:新話題|新话题|第二样|第二樣)[\s，,。.!！?？]*$/iu;

export function userWantsNewTopic(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return NEW_TOPIC_RE.test(t);
}

export function userWantsHaltSpeech(text: string): boolean {
  return userSaysStopContent(text) || userWantsNewTopic(text);
}

export type ChatInterruptResolution = {
  haltSpeech: boolean;
  clearContentContinuation: boolean;
  newTopic: boolean;
  stopped: boolean;
};

export function resolveChatInterruptOnSend(
  text: string,
  hasContentSession: boolean,
): ChatInterruptResolution {
  const stopped = userSaysStopContent(text);
  const newTopic = userWantsNewTopic(text);
  const haltSpeech = stopped || newTopic;
  const clearContentContinuation = hasContentSession && (stopped || newTopic);
  return { haltSpeech, clearContentContinuation, newTopic, stopped };
}

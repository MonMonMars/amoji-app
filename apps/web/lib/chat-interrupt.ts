// Interrupt + new-topic intent for chat voice lifecycle (see docs/VOICE_CHAT_LIFECYCLE.md).
import { userSaysStopContent } from './content-continuation';

/** Explicit pivot only — short questions like 「點搵」 must not match. */
const NEW_TOPIC_RE =
  /^(?:new\s+topic|different\s+topic|another\s+topic|change\s+(?:the\s+)?subject|switch\s+topic|start\s+over|fresh\s+topic)(?:[\s，,。.!！?？]|$)|(?:^|[\s，,。.!！?？])(?:换(?:个)?话题|換(?:個)?話題|轉話題|转话题|新话题|新話題|讲第二样|講第二樣|另一样|另一(?:个)?话题|另一(?:個)?話題)(?:[\s，,。.!！?？]|$)|^(?:新話題|新话题|第二样|第二樣)(?:[\s，,。.!！?？]|$)|^let'?s\s+talk\s+about\s+something\s+else(?:[\s，,。.!！?？]|$)/iu;

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
  wipeChatHistory: boolean;
  clearContentContinuation: boolean;
  newTopic: boolean;
  stopped: boolean;
};

export function resolveChatInterruptOnSend(text: string): ChatInterruptResolution {
  const stopped = userSaysStopContent(text);
  const newTopic = userWantsNewTopic(text);
  const haltSpeech = stopped || newTopic;
  return {
    haltSpeech,
    wipeChatHistory: newTopic,
    clearContentContinuation: newTopic,
    newTopic,
    stopped,
  };
}

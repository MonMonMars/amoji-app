// Web Speech result folding — only NEW results count as a new utterance.
//
// The Web Speech API fires `onresult` with the WHOLE result list for the
// recognition session (old finals included) and marks the first changed entry
// in `resultIndex`. Folding from index 0 every time re-emits every previous
// final, so the caller saw the same transcript as a fresh final on every later
// result event — the chat re-sent the user's own message over and over
// ("my message keeps looping on its own").
//
// Rule: a final result only counts once, when `resultIndex` first points at it.

export interface SpeechResultLike {
  isFinal?: boolean;
  0?: { transcript?: string } | undefined;
  length?: number;
}

export interface SpeechUpdate {
  /** Finals from `resultIndex` onward — this event's new utterance only. */
  finalText: string;
  /** Everything still not final (the live bubble). */
  interim: string;
}

export function collectSpeechUpdate(
  results: ArrayLike<SpeechResultLike> | null | undefined,
  resultIndex: number | null | undefined,
): SpeechUpdate {
  const total = results?.length ?? 0;
  // Browsers without resultIndex keep the legacy "everything is new" fold so
  // the first final still lands; Chrome/Safari/Edge all report resultIndex.
  const from = typeof resultIndex === 'number' && Number.isFinite(resultIndex)
    ? Math.max(0, Math.min(resultIndex, total))
    : 0;
  let finalText = '';
  let interim = '';
  for (let i = 0; i < total; i++) {
    const r = results?.[i];
    const t = r?.[0]?.transcript ?? '';
    if (!t) continue;
    if (r?.isFinal) {
      if (i >= from) finalText += t;
    } else {
      interim += t;
    }
  }
  return { finalText: finalText.trim(), interim };
}

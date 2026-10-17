// Yue hop after Edge zh-HK and speechSynthesis.
// canto-tts-nano is not in this repo (no weights, no runtime). Keep the hook
// so a later local build can flip cantoNanoAvailable() without a new stack.
// Do not download or host the model from this module.

/** True only when a local canto-tts-nano runtime has been wired in. */
export function cantoNanoAvailable(): boolean {
  return false;
}

export function speakCantoNano(text: string): Promise<void> {
  const pending = text.trim().length;
  return Promise.reject(new Error(`canto-tts-nano is not bundled (${pending} chars)`));
}

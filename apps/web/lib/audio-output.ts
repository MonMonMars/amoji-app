// Pin Web Audio and media elements to the system default output.
// On Windows, Chrome can latch an AudioContext or <audio> element onto a
// secondary device (communications / headset / monitor) instead of the
// default speakers. Empty sink id is the user-agent default; 'default' is
// the enumerateDevices id for that same output. Never pass a specific device.

type SinkTarget = { setSinkId?: (sinkId: string) => Promise<void> };

export function pinDefaultOutput(node: SinkTarget | null | undefined): void {
  const setSink = node?.setSinkId;
  if (typeof setSink !== 'function') return;
  void setSink.call(node, '').catch(() => {
    void setSink.call(node, 'default').catch(() => undefined);
  });
}

/** AudioContext bound to the default speakers. Falls back if sinkId options throw. */
export function createDefaultAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  let ctx: AudioContext;
  try {
    ctx = new AC({ sinkId: '' } as AudioContextOptions);
  } catch {
    ctx = new AC();
  }
  pinDefaultOutput(ctx as unknown as SinkTarget);
  return ctx;
}

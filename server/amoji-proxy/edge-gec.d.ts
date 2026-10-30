export const EDGE_GEC_VERSION: string;
export function secMsGec(unixSeconds?: number): string;
export function edgeReadAloudUrl(connectionId: string, unixSeconds?: number): string;
export function edgeAudioPayload(buf: Uint8Array): Uint8Array | null;

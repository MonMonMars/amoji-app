'use client';
import { type Lang } from '../lib/prefs';
export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  lang: Lang;
  accent: string;
  label?: string;
  liveClause?: string;
  tailStreaming?: boolean;
  captionLines?: string[];
}
export default function ChatMessage({ role, content, accent, label, liveClause, tailStreaming, captionLines }: ChatMessageProps) {
  const isUser = role === 'user';
  const clause = liveClause?.trim() ?? '';
  const sealed = (!isUser && captionLines?.length) ? captionLines.map((s) => s.trim()).filter(Boolean) : [];
  const visible = isUser ? content : clause || (tailStreaming ? '' : (sealed.length ? '' : content));
  return (
    <div className={isUser ? 'text-right' : 'text-left'}>
      {!isUser && label && (<p className="mb-0.5 pl-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: `${accent}b0` }}>{label}</p>)}
      {sealed.length > 0 && !clause && !tailStreaming && (
        <div className="space-y-2.5" data-testid="speech-caption-history">{sealed.map((line, i) => (<p key={`cap-hist-${i}-${line.slice(0, 12)}`} className="text-white/95">{line}</p>))}</div>
      )}
      {visible !== '' && (
        <p className={isUser ? '' : clause ? 'text-white/95 italic' : 'text-white/95'} style={isUser ? { color: accent } : undefined}
          data-testid={!isUser && clause ? 'speech-caption' : undefined} aria-live={!isUser && clause ? 'polite' : undefined} aria-atomic={!isUser && clause ? true : undefined}>{visible}</p>
      )}
    </div>
  );
}

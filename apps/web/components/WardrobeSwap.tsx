'use client';
// Head = who she is (name, face, voice). Body = the outfit. The head is
// never rescaled to fit the clothes.
import { useEffect, useState } from 'react';
import HScrollRow from './HScrollRow';
import { assetUrl } from '../lib/asset';
import {
  DEFAULT_DEMO_HEAD,
  DEMO_BODIES,
  DEMO_HEADS,
  activeWardrobe,
  demoBodyById,
  demoHeadById,
  type ModularAsset,
} from '../lib/modular/catalog';
import {
  loadModularSelection,
  saveModularSelection,
  useModularSelection,
  useModularView,
} from '../lib/modular/storage';
import { characterById, type Lang } from '../lib/prefs';

const COPY: Record<Lang, {
  title: string;
  head: string;
  body: string;
  loading: string;
  fallback: string;
  ready: string;
  collapse: string;
  expand: string;
}> = {
  en: {
    title: 'Wardrobe',
    head: 'Head · who she is',
    body: 'Outfit',
    loading: 'Loading head and outfit…',
    fallback: 'Full character for now. Add the modular GLBs to swap clothes — the head is not scaled.',
    ready: 'Head stays herself. Outfit can change.',
    collapse: 'Hide wardrobe',
    expand: 'Show wardrobe',
  },
  yue: {
    title: '衣櫥',
    head: '頭 · 身份',
    body: '衫',
    loading: '載入緊頭同衫…',
    fallback: '而家顯示成個角色。放入模組 GLB 先可以換衫——個頭唔會縮。',
    ready: '頭係佢本人。衫可以換。',
    collapse: '收起衣櫥',
    expand: '打開衣櫥',
  },
  zh: {
    title: '衣橱',
    head: '头 · 身份',
    body: '衣服',
    loading: '正在加载头和衣服…',
    fallback: '先显示完整角色。放入模块 GLB 后才能换衣服——头部不会缩放。',
    ready: '头是本人。衣服可以换。',
    collapse: '收起衣橱',
    expand: '打开衣橱',
  },
  ja: {
    title: 'ワードローブ',
    head: '頭・本人',
    body: '衣装',
    loading: '頭と衣装を読み込み中…',
    fallback: 'いまは全身モデルです。モジュールGLBを置くと衣装を替えられます。頭は縮小しません。',
    ready: '頭は本人のまま。衣装だけ替えられます。',
    collapse: '閉じる',
    expand: '開く',
  },
};

/** Front release PNG for this identity (character.image). */
function FrontStill({ characterId, mark }: { characterId: string; mark: string }) {
  const image = characterById(characterId).image;
  const [ok, setOk] = useState(!!image);
  useEffect(() => { setOk(!!image); }, [image]);
  if (!image || !ok) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white/80">
        {mark.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(image)}
      alt=""
      draggable={false}
      onError={() => setOk(false)}
      className="h-full w-full object-cover object-top"
    />
  );
}

function Thumb({
  asset,
  pressed,
  onPick,
  testId,
}: {
  asset: ModularAsset;
  pressed: boolean;
  onPick: (id: string) => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-row-item={asset.id}
      aria-pressed={pressed}
      title={asset.name}
      onClick={() => onPick(asset.id)}
      className={`w-14 shrink-0 snap-start overflow-hidden rounded-lg border text-left transition-colors ${
        pressed ? 'border-white/80 bg-white/15' : 'border-white/15 bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="relative block h-14 w-full">
        <FrontStill characterId={asset.characterId} mark={asset.short} />
      </span>
      <span className="block truncate px-0.5 py-0.5 text-center text-[8px] leading-tight text-white/70">{asset.short}</span>
    </button>
  );
}

export default function WardrobeSwap({
  lang,
  characterId,
  onCharacter,
}: {
  lang: Lang;
  characterId: string;
  /** Identity follows the head. Parent stores this as the companion id. */
  onCharacter: (characterId: string) => void;
}) {
  const copy = COPY[lang] ?? COPY.en;
  const stored = useModularSelection();
  const view = useModularView();
  const active = activeWardrobe(characterId, stored);
  const [open, setOpen] = useState(false);

  const pickHead = (headId: string) => {
    const head = demoHeadById(headId);
    if (!head) return;
    const bodyId = active?.bodyId ?? loadModularSelection()?.bodyId ?? headId;
    saveModularSelection({ headId, bodyId });
    onCharacter(head.characterId);
  };

  const pickBody = (bodyId: string) => {
    const headId = active?.headId ?? loadModularSelection()?.headId ?? DEFAULT_DEMO_HEAD;
    const head = demoHeadById(headId);
    if (!head) return;
    saveModularSelection({ headId, bodyId });
    if (characterId !== head.characterId) onCharacter(head.characterId);
  };

  const status = view === 'loading' ? copy.loading : view === 'modular' ? copy.ready : view === 'fallback' ? copy.fallback : '';
  const head = active ? demoHeadById(active.headId) : undefined;
  const body = active ? demoBodyById(active.bodyId) : undefined;

  if (!open) {
    return (
      <button
        type="button"
        data-testid="wardrobe-swap"
        aria-label={copy.expand}
        aria-expanded={false}
        title={copy.title}
        onClick={() => setOpen(true)}
        className="ui-btn pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50"
      >
        <span aria-hidden>👗</span>
      </button>
    );
  }

  return (
    <section
      data-testid="wardrobe-swap"
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-neutral-950/95 text-white backdrop-blur-md"
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 className="text-base font-semibold tracking-tight">{copy.title}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={copy.collapse}
          className="ui-btn flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm hover:bg-white/20"
        >
          ✕
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {head && body && (
          <div data-testid="wardrobe-hero" className="grid grid-cols-2 gap-3">
            <div className="relative h-44 overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-lg">
              <FrontStill characterId={head.characterId} mark={head.short} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-sm font-semibold">
                <span className="block text-[10px] font-normal uppercase tracking-wider text-white/60">{copy.head}</span>
                {head.short}
              </span>
            </div>
            <div className="relative h-44 overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-lg">
              <FrontStill characterId={body.characterId} mark={body.short} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-sm font-semibold">
                <span className="block text-[10px] font-normal uppercase tracking-wider text-white/60">{copy.body}</span>
                {body.short}
              </span>
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">{copy.head}</p>
          <HScrollRow ariaLabel="wardrobe heads" rowKey="wardrobe-heads" selectedId={active?.headId}>
            {DEMO_HEADS.map((asset) => (
              <Thumb
                key={asset.id}
                asset={asset}
                pressed={active?.headId === asset.id}
                onPick={pickHead}
                testId={`wardrobe-head-${asset.id}`}
              />
            ))}
          </HScrollRow>
        </div>
        <div>
          <p className="mb-1.5 pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">{copy.body}</p>
          <HScrollRow ariaLabel="wardrobe outfits" rowKey="wardrobe-bodies" selectedId={active?.bodyId}>
            {DEMO_BODIES.map((asset) => (
              <Thumb
                key={asset.id}
                asset={asset}
                pressed={!!active && active.bodyId === asset.id}
                onPick={pickBody}
                testId={`wardrobe-body-${asset.id}`}
              />
            ))}
          </HScrollRow>
        </div>
        {status && (
          <p data-testid="wardrobe-status" className="rounded-xl bg-white/5 px-3 py-2 text-xs leading-snug text-white/70" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}

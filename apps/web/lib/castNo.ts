'use client';
// AUTO-GENERATED from want-roster.json — keep in sync with CHARACTERS order in prefs.ts
// releaseTag: free-library-want-2026-10-12
export const CAST_NO = {
  'a01-shino': 1,
  'a02-shibu': 2,
  'a03-fumiriya': 3,
  'a04-avatarsample-a': 4,
  'a05-avatarsample-c': 5,
  'a10-agahomei-normal': 6,
  'a14-vivi': 7,
  'a16-vita': 8,
  'a17-victoria-rubin': 9,
  'a23-hairsample-female': 10,
  'a24-hairsample-male': 11,
  'a61-saori-kamiya-llunne': 12,
  'a63-hinoame-satuki-mei-sirayuki': 13,
  'a64-lily-lily-animeit': 14,
  'a70-vtuber-aihina-sample': 15,
  'a71-mary-sweety': 16,
  'a74-mizuka': 17,
  'a75-sorano': 18,
  'a77-sasha': 19,
  'a79-amami-karasu': 20,
  'a81-cinna': 21,
  'a82-renel-bonnie': 22,
  'a83-ao-witch': 23,
  'a85-kara': 24,
  'a89-rurina': 25,
  'a93-edokko': 26,
  'a94-rita': 27,
  'a95-mizu': 28,
  'a96-pee-aruako': 29,
  'a97-pee-saaya': 30,
  'a98-ethan': 31,
  'a99-miyora': 32,
  'a103-rockredgradientjk': 33,
  'a104-simplebrownsailorjk': 34,
  'a105-serizawa-aoi': 35,
  'a106-auroragradhairjk': 36,
  'a107-dm-office-casual': 37,
  'a109-riona': 38,
  'a112-mahochan-jk': 39,
  'a114-sailor-cardigan-girl': 40,
  'a116-haru-uniform': 41,
  'a117-erigawa-risa': 42,
  'a119-kanami-uniform': 43,
  'a120-morikawa-yuki-summer-uniform': 44,
  'a121-nagano-mami-uniform': 45,
  'a122-shiratori-hikari-shifuku': 46,
  'a459-chinesewarriormonk': 47,
  'a460-freerealisticfemale': 48,
  'a461-fashionruffle': 49,
  'a463-sophia': 50,
  'a468-eric': 51,
} as const;

export type CastId = keyof typeof CAST_NO;

/** stable number for a character id — 0 means unknown (never shipped) */
export function castNo(id: string): number {
  return (CAST_NO as Record<string, number>)[id] ?? 0;
}

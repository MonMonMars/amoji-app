// Local 2D select portraits. Filenames are `{wantId}_bighead.png`.
// CAST.md maps wantId → libraryId (A01…); the app character id is the wantId,
// so the file stem matches `CharacterDef.id` directly.
// Ids missing from public/thumbs/bighead fall back to the release still.

const BIGHEAD_IDS: readonly string[] = [
  'a01-shino',
  'a02-shibu',
  'a03-fumiriya',
  'a04-avatarsample-a',
  'a05-avatarsample-c',
  'a10-agahomei-normal',
  'a103-rockredgradientjk',
  'a104-simplebrownsailorjk',
  'a105-serizawa-aoi',
  'a106-auroragradhairjk',
  'a107-dm-office-casual',
  'a109-riona',
  'a14-vivi',
  'a16-vita',
  'a17-victoria-rubin',
  'a23-hairsample-female',
  'a24-hairsample-male',
  'a61-saori-kamiya-llunne',
  'a63-hinoame-satuki-mei-sirayuki',
  'a64-lily-lily-animeit',
  'a70-vtuber-aihina-sample',
  'a71-mary-sweety',
  'a74-mizuka',
  'a75-sorano',
  'a77-sasha',
  'a79-amami-karasu',
  'a81-cinna',
  'a82-renel-bonnie',
  'a83-ao-witch',
  'a85-kara',
  'a89-rurina',
  'a93-edokko',
  'a94-rita',
  'a95-mizu',
  'a96-pee-aruako',
  'a97-pee-saaya',
  'a98-ethan',
  'a99-miyora',
];

const BIGHEAD = new Set<string>(BIGHEAD_IDS);

/** Public path for a packed bighead, or undefined when this id has no file. */
export function bigheadPath(id: string): string | undefined {
  if (!BIGHEAD.has(id)) return undefined;
  return `/thumbs/bighead/${id}_bighead.png`;
}

export { BIGHEAD_IDS };

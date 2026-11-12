// Recipe asks must get ingredients + steps in the same turn — never a teaser
// that only offers to share the recipe.

const RECIPE_FACT_RE = /^Recipe:\s*/m;
const STEPS_IN_FACTS = /\bSteps:\s*(?:\d+\.|1[.)、])/i;

const RECIPE_TEASER_RE =
  /(?:我可以|我可以同你|我可以講|可以講|想唔想聽|想听|想聽|不如我講|要唔要|要不要|需唔需要).{0,24}(?:食譜|食谱|做法|步驟|步骤|recipe)|(?:want|wanna|would you like).{0,30}(?:recipe|steps|how to (?:make|cook))|(?:I can|I'll|let me)\s+(?:tell|share|give|walk).{0,28}(?:recipe|steps)/i;

const RECIPE_DELIVERED_RE =
  /(?:Ingredients|食材|材料)[:：]|(?:\d{1,2}[.)、]\s*\S)|(?:第一步|第1步|先.{0,6}(?:切|洗|焯|腌|炒|煮|煲|滚|燒|烧|炖|焗|蒸|拌))|step\s+(?:one|1)\b/i;

/** User message reads as a recipe / cook-along ask. */
export function userAsksForRecipe(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /\b(recipes?|how (?:do i|to) (?:make|cook|bake|prepare))\b|食譜|食谱|點煮|点煮|怎么煮|怎麼煮|如何煮|做法|點整|点整|料理|レシピ/i.test(t)
    && !/\b(friends?|money|sense|a living|it work|time|the bed|plans?)\b/i.test(t);
}

/** True when live facts include a fetched recipe block. */
export function worldHasRecipe(world?: string): boolean {
  const w = world?.trim() ?? '';
  return RECIPE_FACT_RE.test(w) && STEPS_IN_FACTS.test(w);
}

/** Model text that only offers the recipe instead of teaching it. */
export function recipeReplyIsTeaser(reply: string, world?: string): boolean {
  if (!worldHasRecipe(world)) return false;
  const t = reply.trim();
  if (!t) return false;
  if (recipeReplyLooksDelivered(t)) return false;
  if (RECIPE_TEASER_RE.test(t)) return true;
  // Named the dish but gave no steps or ingredients.
  if (t.length <= 80 && !recipeReplyLooksDelivered(t)) return true;
  return false;
}

export function recipeReplyLooksDelivered(reply: string): boolean {
  const t = reply.trim();
  if (!t) return false;
  const stepHits = t.match(/(?:\d{1,2}[.)、]|第[一二三四五1-5]步)/g);
  if ((stepHits?.length ?? 0) >= 2) return true;
  if (RECIPE_DELIVERED_RE.test(t) && (stepHits?.length ?? 0) >= 1) return true;
  if (/(?:Ingredients|食材|材料)[:：].{4,}/i.test(t) && (stepHits?.length ?? 0) >= 1) return true;
  return false;
}

/** Pull dish tokens (2+ CJK or 4+ Latin) from the Recipe: fact line. */
export function recipeDishTokens(facts: string): string[] {
  const m = /Recipe:\s*([^\n]+)/i.exec(facts);
  const title = (m?.[1] ?? '').split(/\.\s/)[0] ?? '';
  return title
    .split(/[^A-Za-z0-9\u4e00-\u9fff]+/)
    .map((w) => w.trim())
    .filter((w) => (/\p{Script=Han}/u.test(w) ? w.length >= 2 : w.length >= 4));
}

/** Build a speakable cook-along from the live Recipe: fact block. */
export function recipeLineFromFacts(facts: string, lang = 'yue'): string {
  const line = facts.split('\n').find((l) => /^Recipe:/i.test(l.trim()))?.trim() ?? '';
  if (!line) return '';
  const body = line.replace(/^Recipe:\s*/i, '').trim();
  const title = body.split(/\.\s/)[0]?.trim() ?? '呢道菜';
  const ingM = /Ingredients:\s*([^.]+)/i.exec(body);
  const stepsM = /Steps:\s*(.+)/i.exec(body)?.[1] ?? '';
  const steps = stepsM
    .split(/\s+(?=\d+\.\s)/)
    .map((s) => s.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!steps.length) return '';

  if (lang === 'zh') {
    const ing = ingM?.[1]?.trim();
    const head = ing ? `材料：${ing}。` : '';
    const body = steps.map((s, i) => `第${i + 1}步，${s}`).join(' ');
    return `${head}我们一起做${title}。${body}`;
  }
  if (lang === 'ja') {
    const ing = ingM?.[1]?.trim();
    const head = ing ? `材料は${ing}。` : '';
    const body = steps.map((s, i) => `${i + 1}つ目、${s}`).join(' ');
    return `${head}${title}を一緒に作ろう。${body}`;
  }
  if (lang === 'en') {
    const ing = ingM?.[1]?.trim();
    const head = ing ? `Ingredients: ${ing}. ` : '';
    const body = steps.map((s, i) => `Step ${i + 1}: ${s}`).join(' ');
    return `${head}Let's cook ${title}. ${body}`;
  }
  const ing = ingM?.[1]?.trim();
  const head = ing ? `材料有${ing}。` : '';
  const stepLine = steps.map((s, i) => `第${i + 1}步，${s}`).join(' ');
  return `${head}我哋整${title}：${stepLine}`;
}

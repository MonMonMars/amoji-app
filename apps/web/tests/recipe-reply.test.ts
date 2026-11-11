import { describe, expect, it } from 'vitest';
import { planTools, preferLiveReply, gatherLiveContext } from '../lib/live-tools';
import {
  recipeReplyIsTeaser,
  recipeReplyLooksDelivered,
  userAsksForRecipe,
  worldHasRecipe,
} from '../lib/recipe-reply';
import { planLifestyle } from '../lib/live-lifestyle';
import { wantsDetail } from '../lib/client-chat';

describe('recipe planning (Cantonese)', () => {
  it('extracts 咕嚕肉 from common asks', () => {
    for (const text of ['咕嚕肉食譜', '咕嚕肉點煮', '咕嚕肉嘅食譜', '我想食咕嚕肉，俾個食譜我']) {
      expect(planLifestyle(text).recipeQuery).toBe('咕嚕肉');
      expect(planTools(text).recipeQuery).toBe('咕嚕肉');
    }
  });

  it('detects recipe intent in user text', () => {
    expect(userAsksForRecipe('咕嚕肉食譜')).toBe(true);
    expect(userAsksForRecipe('how are you')).toBe(false);
    expect(wantsDetail('', '咕嚕肉點煮')).toBe(true);
  });
});

describe('recipe anti-teaser', () => {
  const world =
    'Recipe: Sweet and sour pork. Ingredients: 300g pork, 2 tbsp vinegar, 1 tbsp sugar. Steps: 1. Cut pork into bite-sized pieces. 2. Coat lightly in starch and shallow-fry until golden. 3. Stir vinegar, sugar, and ketchup until glossy, toss pork to coat.';

  it('knows when live facts include steps', () => {
    expect(worldHasRecipe(world)).toBe(true);
  });

  it('flags teaser-only replies', () => {
    const teaser = '咕嚕肉好好味嘛！你想食咗？我可以講個簡單食譜俾你～';
    expect(recipeReplyLooksDelivered(teaser)).toBe(false);
    expect(recipeReplyIsTeaser(teaser, world)).toBe(true);
  });

  it('accepts a cook-along with steps', () => {
    const ok = '材料有豬肉同茄汁。第1步，切件。第2步，炸金。第3步，落醋糖芡汁兜勻。';
    expect(recipeReplyLooksDelivered(ok)).toBe(true);
    expect(recipeReplyIsTeaser(ok, world)).toBe(false);
  });

  it('replaces a shrug teaser with fetched steps', () => {
    const spoken = '我哋整咕嚕肉：第1步，切件。';
    const teaser = '咕嚕肉好好味嘛！我可以講個簡單食譜俾你～';
    const fixed = preferLiveReply(teaser, world, spoken, 'yue');
    expect(fixed).toContain('第1步');
    expect(fixed).toContain('Cut pork');
    expect(fixed).not.toMatch(/我可以講.*食譜/);
  });
});

describe('gatherLiveContext — 咕嚕肉', () => {
  it('fetches and speaks a full recipe', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('themealdb.com')) {
        return new Response(JSON.stringify({
          meals: [{
            strMeal: 'Sweet and Sour Pork',
            strInstructions: 'Cut pork into pieces.\nFry until golden.\nToss in sweet and sour sauce.',
            strIngredient1: 'pork',
            strMeasure1: '500g',
            strIngredient2: 'vinegar',
            strMeasure2: '2 tbsp',
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 404 });
    };
    const live = await gatherLiveContext('咕嚕肉食譜', { lang: 'yue', fetch: fetchImpl, cache: new Map() });
    expect(live.prompt).toContain('Recipe:');
    expect(live.prompt).toContain('1. Cut pork');
    expect(live.spoken).toContain('第1步');
    expect(live.spoken).toContain('第2步');
    expect(live.spoken).not.toMatch(/準備好下一步|想唔想/);
  });
});

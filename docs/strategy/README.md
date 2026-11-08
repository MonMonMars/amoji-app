# Strategy docs（Amoji）

**更新**：2026-11-08  
**用途**：把桌面研究資料合成為可在 repo 內維護的產品／競品／技術路線單一真相；給工程、內容與上架決策用。

## 本資料夾內容

| 檔案 | 說明 |
|------|------|
| [strategy-zh-Hant.md](./strategy-zh-Hant.md) | **主文件**：定位（v2）、競品、單位經濟、變現、Amoji 差異化、信任支柱、流暢度 L1–L4、技術棧對照、P0/P1/P2 路線、上線 Gate、明確不做清單 |
| [amoji-gap-zh-Hant.md](./amoji-gap-zh-Hant.md) | PRD v1 與 **amoji-app 現況** 差距表（避免重複貼研究原文） |

## 怎麼用

1. **開新功能前**：先讀 `strategy-zh-Hant.md` 的「明確不做」與信任支柱；若與支柱衝突，需產品決策再改碼。
2. **定價／訂閱**：對照變現章與單位經濟教訓；勿用「無限免費＋長時長」當 north star。
3. **語音／粵語上線**：跑 `cantonese-fluency-test-kit` 的 20 題 Gate（≥32/40）；細節見主文件「上線 Gate」。
4. **技術選型**：對照「零成本棧 vs Amoji 棧」表；免費 tier 不得用會訓練用戶資料的供應商（與「不賣資料」承諾一致）。

## 研究來源（在 repo 外）

完整原始研究在 **本機 D 槽**，**未**納入 git：

```
D:\DeepSeek Harness\research\
```

本策略文件內引用格式：

`來源：DeepSeek Harness/research/<檔名>.md`

主文件已合併下列清單（及其他 sibling `*-zh-Hant.md` 中與 Amoji 相關者）：

- `character-ai-case-study-zh-Hant.md`
- `character-ai-deep-dive-2-zh-Hant.md`
- `ai-chat-business-models-landscape-zh-Hant.md`
- `replika-vs-zeta-deep-dive-zh-Hant.md`
- `kindroid-deep-dive-zh-Hant.md`
- `positioning-gap-strategy-zh-Hant.md`
- `positioning-v2-no-export-zh-Hant.md`
- `fluency-engineering-playbook-zh-Hant.md`
- `cantonese-fluency-test-kit-zh-Hant.md`
- `PRD-v1-zh-Hant.md`
- `zero-cost-ai-stack-zh-Hant.md`

索引亦見：`D:\DeepSeek Harness\research\INDEX.md`

## 文件風格

與 `apps/web/docs/idle-pixel-review.md` 一致：標題清楚、表格承載對照、程式路徑指向 repo 內真實模組（非貼滿研究全文）。

## Code 對照（快速）

| 主題 | Repo 路徑 |
|------|-----------|
| 3D idle／策展 rail | `apps/web/lib/idle-curated-rail.ts`, `apps/web/docs/idle-pixel-review.md` |
| Poke 區域 | `apps/web/lib/revision.ts`（poke 註記）, poke 相關測試 |
| `.aigf` 同伴卡 | `apps/web/lib/companion-file.ts`, `packages/engine/src/aigf.ts` |
| BYOK Brain | `apps/web/lib/brain.ts`, `apps/web/components/BrainAdvanced.tsx` |
| 危機守衛 | `apps/web/lib/crisis.ts` |
| 記憶（本機） | `apps/web/lib/memory.ts` |
| 回覆塑形（粵語口語） | `apps/web/lib/reply-shape.ts` |

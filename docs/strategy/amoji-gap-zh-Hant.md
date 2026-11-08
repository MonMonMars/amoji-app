# PRD v1 vs Amoji repo 差距表

**更新**：2026-11-08  
**基準**：`DeepSeek Harness/research/PRD-v1-zh-Hant.md`  
**對照**：`D:\AI app development\amoji-app`（main 線，2026-11-08）

本表補充 [strategy-zh-Hant.md](./strategy-zh-Hant.md)，不重複競品敘事。狀態：**已有**／**部分**／**缺**／**刻意不同**。

---

## 摘要

| 區域 | 評估 |
|------|------|
| 差異化（3D／poke／.aigf／BYOK） | **強** — 超出 PRD 文字 App 骨架 |
| 信任支柱 | **部分** — 危機、揭露、本機刪除有；雲端刪除憑證、記憶逐則透明、訂閱誠實計費缺 |
| 變現 | **缺** — 無 RevenueCat／Stripe 訂閱與用量牆 |
| 後端 | **刻意不同** — 靜態 Web + 本機記憶 vs PRD Worker＋Postgres |
| 語音流暢度 | **部分** — 多語 TTS 路徑有；TTFA／打斷 Gate 未產品化驗收 |

---

## 功能差距

| PRD ID | 功能 | 狀態 | Repo／備註 |
|--------|------|------|------------|
| F1 | 角色建立（模板、欄位、AI 揭露） | 部分 | 選角／設定流程有；欄位上限與 3 模板未完全對齊 PRD |
| F2 | 文字對話串流、≤60 字、禁條列 | 部分 | `client-chat.ts`、`reply-shape.ts`；長度硬限與 20 題自動評分未全覆蓋 |
| F3 | 三層記憶＋透明＋可刪 | 部分 | `memory.ts` 有 entries／diary／promises；**無**每則 `memory_used` UI；中期摘要層與 pgvector 檢索未上 |
| F4 | 語音 PTT、打斷、填充詞 | 部分 | `voice.ts` 等；打斷／TTFA 未有 Gate 儀表；Pages Edge TTS 需 proxy |
| F5 | 18+、危機、邊界 | 部分 | `crisis.ts`、`adult-only`；協議步驟未完全等同 PRD（確認安全問句等） |
| F6 | 訂閱與用量 | 缺 | 無 Standard／Pro；README 僅 BYOK／keyless |
| F7 | 刪除帳號、安全存取 | 部分 | 本機記憶清除、`.aigf`；**無**雲端 7 日刪除憑證、2FA 資料存取 |
| F8 | 設定（語／音色） | 已有 | `prefs.ts` 四語；音色矩陣較 PRD 豐富 |

---

## 信任六柱 vs 現況

| 支柱 | 狀態 | 證據 |
|------|------|------|
| 1 記憶透明 | 部分 | 設定頁可編輯記憶；聊天未展開「本次用了 3 條」 |
| 2 人格穩定 | 部分 | 提示／角色卡版本化；無「30 天公告換模型」產品化 |
| 3 刪除權 | 部分 | `deleteEntry`、`clearMemory`；無伺服器刪除憑證 |
| 4 危機協議 | 部分 | `guardCompanionTurn`、固定文案、熱線；E 組全流程待手測 |
| 5 誠實計費 | 缺 | 無付費、無退額 |
| 6 不賣資料 | 部分 | 法律文案、BYOK 分流；需對照實際預設 LLM 供應商條款 |

---

## 技術架構差距

| PRD | Amoji | 建議 |
|-----|-------|------|
| Expo RN + EAS | Next.js PWA | 維持 Web 楔子；iOS 包裝待收入 |
| CF Worker 統一閘道 | 靜態 + 可選 proxy | 訂閱上線時加 Worker 限流 |
| Supabase + pgvector | localStorage 記憶 | P1 同步層或漸進雲備份 |
| WebSocket 語音協議 | HTTP／瀏覽器語音 | P2 Omni 再評估 WS |
| qwen 付費預設 | Pollinations + BYOK | 收入後預設路由至付費 qwen |

來源：`zero-cost-ai-stack-zh-Hant.md` Phase 0 與 PRD §10

---

## Amoji 超出 PRD 的資產（應保留為 moat）

| 能力 | 模組 |
|------|------|
| 3D 同伴與 idle 策展 | `idle-catalog-review.ts`, `docs/idle-pixel-review.md` |
| Poke 分區反應 | poke／SFX 相關 lib 與測試 |
| `.aigf` 匯入匯出 | `companion-file.ts`, `@amoji/engine` `aigf.ts` |
| 小遊戲／story 模式 | 與 Zeta 故事線差異化，但受「非主定位」約束 |
| Live facts／工具 | `live-tools.ts`（注意危機前不可搶跑） |
| 多供應商 BYOK | `brain.ts`, `BrainAdvanced.tsx` |

---

## 建議優先補齊（對齊 P0）

1. **記憶透明 v1**：聊天列顯示注入摘要＋連到刪除（API 可先本機）。  
2. **20 題 Gate 自動化**：擴充 `reply-quality.test.ts`、`crisis-guard.test.ts`。  
3. **訂閱骨架**：用量顯示 + 免費則數牆（即使先 mock RevenueCat）。  
4. **TTS proxy 部署**：解 github.io 上神經語音（見 agent card HOLD）。  
5. **危機 E 組**：對齊 PRD 四步與 HK 2896 0000 露出時間。

---

## 來源

- `PRD-v1-zh-Hant.md`  
- `positioning-v2-no-export-zh-Hant.md`  
- Amoji repo：`apps/web/lib/*`、根目錄 `README.md`  

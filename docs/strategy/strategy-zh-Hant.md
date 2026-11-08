# Amoji 產品策略（合成版）

**更新**：2026-11-08  
**產品**：Amoji（Web／PWA，3D 同伴＋聊天）  
**定位主線**：信任 × 粵語流暢 × 可見的陪伴（3D／idle／poke），非角色市集、非青少年故事平台。

下文為研究合成；每節末有 `來源：…` 標註。PRD 代號「DimDik 點滴」與 Amoji 為同一產品願景的不同命名，以 **Amoji repo 現況** 為落地基準。

---

## 1. 定位（v2：可信，而非可攜）

### 1.1 定位句

> **記得你、不騙你、識講粵語。**  
> 一個真的記得你的 AI 伴侶；你說嘅嘢佢記得；你要走，佢唔會攔你。

英文備用：*"A companion that remembers you — and never lies to you."*

**v2 修正**：不做「一鍵 ZIP／分享對話」式開放匯出（個資外洩、兒少／成人內容外流、跨境風險）；改為 **記憶透明、可刪、限時加密存取** 滿足 GDPR／PIPL／CCPA 可攜權。

來源：`positioning-v2-no-export-zh-Hant.md`、`PRD-v1-zh-Hant.md`

### 1.2 非目標（一句話）

不是 Character.AI（市集）、不是 Zeta（青少年故事）、不是 ChatGPT（萬能助理）；是 **25–40 歲成人、長期單一關係、浪漫可不露骨**。

### 1.3 楔子市場

| 優先 | 客群 | 為何 |
|------|------|------|
| P0 | Replika／Kindroid **難民** | 已付費、被改人格／鎖資料傷害過 |
| P0 | 港／澳／粵語圈 | 三家幾乎無粵語口語＋TTS |
| P1 | 日本成人（非 Zeta 青少年） | 高時長已被驗證，但需合規切入 |
| — | 兒童／青少年、NSFW 影像 | **不做**（見 §10） |

來源：`positioning-gap-strategy-zh-Hant.md`、`replika-vs-zeta-deep-dive-zh-Hant.md`

---

## 2. 競品地圖與空隙

### 2.1 三家極端

| 維度 | Replika | Zeta | Kindroid |
|------|---------|------|----------|
| 賣什麼 | 單一伴侶關係 | 互動小說／故事 | 記憶深度伴侶 |
| 模式 | 訂閱（≈25% 轉化） | 廣告＋訂閱 | 訂閱＋加購疊加 |
| 致命傷 | **信任崩塌**（ERP、記憶重構） | **90% 10–20 歲**、監管 | engagement 解鎖、危機薄弱、無年齡欄 |
| 啟示 | 語音拉留存；高價訂閱 | 長時長＝算力；需自研小模型 | 記憶可視化、難民獲客 |

來源：`replika-vs-zeta-deep-dive-zh-Hant.md`、`kindroid-deep-dive-zh-Hant.md`、`positioning-gap-strategy-zh-Hant.md`

### 2.2 Character.AI 教訓（已破產）

- **使用時長是成本，不是資產**：算力 0.97¢/h vs 營收 0.74¢/h → 單位經濟失敗。  
- 廣告可占營收 ~47%，仍救不了；**訂閱應為主收入**。  
- 監管尾部風險（46 州 AG、人身傷害訴訟）殺融資；**18+、非醫師人設、危機流程** 為底線。  
- 2026 正確技術路線：**微調開源／API 小模型 + 分層路由 + 控上下文**，非自研基礎模型。

來源：`character-ai-case-study-zh-Hant.md`、`character-ai-deep-dive-2-zh-Hant.md`

### 2.3 Amoji 在空隙中的位置

```
        信任 / 合規 / 粵語
                ▲
                │     ★ Amoji（關係 + 高信任 + 3D 存在感）
                │   Kindroid ●
        ────────┼──────────────► 關係深度
     Zeta ●     │     ● Replika
                │   ● Character.AI（已离场）
                ▼
```

**Amoji 獨有組合**（競品未同時具備）：

| 能力 | 說明 | Repo |
|------|------|------|
| **3D／VRMA idle** | 聊天旁可見「活著」的軀體；策展 rail #1–39 | `idle-curated-rail.ts` |
| **Poke 分區** | 頭／臂／腹等區域不同動作與語音 | `revision.ts` poke 註記 |
| **`.aigf` 同伴卡** | 設定＋記憶結構可攜（非整段對話 ZIP） | `companion-file.ts` |
| **BYOK 可選大腦** | 預設 keyless；進階用戶自帶 key | `brain.ts` |
| **多語含粵語 UI** | `yue` 為一級語言 | `prefs.ts` |
| **確定性危機守衛** | 關鍵字列表、不經 LLM | `crisis.ts` |

策略上對外敘事仍採 **v2 信任支柱**；`.aigf` 是「同伴設定可攜」，與 PRD 禁止的「對話分享／開放匯出」不同。

---

## 3. 單位經濟與市場基準

### 3.1 市場（2026 H1）

- 浪漫／陪伴賽道 H1 營收規模大；**非 NSFW 下載量 2×，營收接近** → 浪漫類 **ARPU 更高**。  
- TOP5 集中；Zeta、Crushie、Replika 等各走訂閱／廣告／寶石路線。

來源：`ai-chat-business-models-landscape-zh-Hant.md`、`PRD-v1-zh-Hant.md`

### 3.2 必記數字

| 指標 | 教訓來源 | Amoji 目標取向 |
|------|----------|----------------|
| 營收／小時 > 算力／小時 | Character.AI | 免費層限字數／語音分鐘 |
| 免費→付費 | Replika ~25% | 務實目標 8–15%（PRD） |
| ARPU | Crushie 高訂閱＋寶石 | 先驗證 $12.99 Standard，再談加購 |
| 語音 | Replika +ElevenLabs 留存 | **計量付費**，非無限 |

### 3.3 成本結構（文字 vs 語音）

以便宜 API 重算 Character 級使用量：**純文字可轉正**；一旦 **每日 30 分鐘語音**，成本急升。產品結構應為：**文字低價／有限免費 → 語音訂閱 → 嚴格上下文與模型分層**。

來源：`character-ai-case-study-zh-Hant.md` §8、`ai-toy-llm-tts-cost-playbook`（研究資料夾）

### 3.4 變現參考（Replika／Crushie／Kindroid）

| 做法 | 可學 | 應避免（v2） |
|------|------|----------------|
| Replika 單一伴侶＋$19.99 | 關係深度、年付 | 偷改人格、不透明記憶 |
| Crushie $29.99＋寶石 | 窄定位高 ARPU | 對話中隱藏餘額、記憶負評 |
| Kindroid 記憶＝付費牆 | 三層記憶、可視化 | engagement 解鎖 Ultra、失敗仍扣點 |

**Amoji 定價錨（PRD，待產品化）**：Standard $12.99／年 $89；Pro 語音分鐘；**無**寶石、streak、廣告。

來源：`ai-chat-business-models-landscape-zh-Hant.md`、`kindroid-deep-dive-zh-Hant.md`、`PRD-v1-zh-Hant.md` §6

---

## 4. 六根信任支柱（產品承諾）

| # | 支柱 | 承諾 | 對手弱點 |
|---|------|------|----------|
| 1 | 記憶透明 | 每則回覆可見「用了哪些記用了哪些記憶」；單條刪 | Kindroid 有展示、刪除弱 |
| 2 | 人格穩定 | 模型升級提前公告；可留舊版 | Replika 兩次崩塌 |
| 3 | 刪除權 | 7 日內真刪＋憑證 | 三家不透明 |
| 4 | 危機協議 | 承認→安全→熱線→停角色扮演 | Kindroid 僅「打 911」 |
| 5 | 誠實計費 | 失敗退額、用量即時、無成癮解鎖 | Kindroid 相反 |
| 6 | 不賣資料 | 無追蹤像素；停運前通知 | Character 破產資料風險 |

**資料存取**：限時加密連結＋2FA；**不做** ZIP 一鍵分享。

Amoji **已有**：危機關鍵字守衛、熱線列表（含 HK 2896 0000）、AI 揭露文案、本機記憶刪除、`.aigf` 匯出。  
**仍缺**：雲端帳號刪除憑證、逐則「memory_used」、訂閱用量儀表（見 `amoji-gap-zh-Hant.md`）。

來源：`positioning-v2-no-export-zh-Hant.md`、`PRD-v1-zh-Hant.md` §3

---

## 5. 流暢度工程（L1–L4）

| 層 | 問題 | 修法摘要 |
|----|------|----------|
| **L1 延遲** | 首音慢 | VAD 200–300ms、串流 ASR/LLM/TTS、填充詞；TTFA ≤800ms |
| **L2 輪次** | 不能打斷 | 插話 ≤200ms 停播 |
| **L3 韻律** | 平直 TTS | 串流 TTS；v2 考慮 Qwen Omni Kiki／Rocky |
| **L4 語域** | 客服腔 | 角色提示、≤40–60 字、禁條列／「作為 AI」 |

**只修一層會更糟**（更快說更假的話）。Amoji 已有 `reply-shape.ts` 去重／口語塑形；語音在 Pages 上仍受 Edge TTS／代理部署約束。

來源：`fluency-engineering-playbook-zh-Hant.md`

---

## 6. 技術棧：零成本階梯 vs PRD vs Amoji 現況

| 層 | 零成本 Phase 0 | PRD v1 目標 | Amoji repo（2026-11） |
|----|----------------|-------------|------------------------|
| 前端 | PWA / CF Pages | Expo RN | **Next.js Web PWA**（`apps/web`） |
| LLM | CF Workers AI GLM 免費 | qwen3.7-flash Worker | **Pollinations keyless** + BYOK |
| TTS | Web Speech / Edge | qwen3-tts-flash | **瀏覽器 synth + Edge**（proxy 待部署） |
| ASR | CF Whisper | SenseVoice 自架 | 裝置／Web Speech（視平台） |
| 記憶 | Supabase＋pgvector | 三層＋向量 | **本機 `memory.ts`** |
| 閘道 | CF Worker | token／限流 | 靜態站 + 可選 `server/amoji-proxy` |
| 金流 | Stripe | RevenueCat | **尚未接上訂閱** |

**免費供應商規則**：產品承諾不賣資料 → 優先 **A 自架／B 明確不訓練**；Gemini 免費層等 **C 類僅開發測**，不上真實用戶。

**升級觸發**：日 Neurons >80%、TTS 抱怨、首筆收入、MAU>300 → 付費 qwen／Azure F0／Worker Paid。

來源：`zero-cost-ai-stack-zh-Hant.md`、`PRD-v1-zh-Hant.md` §10

---

## 7. 統一路線圖（P0 / P1 / P2）

優先級跨 **信任合規、粵語流規、粵語流暢、變現、Amoji 差異化**；與 PRD 里程碑對齊並標 repo 狀態。

### P0 — 必須有才可收費／送審敘事

| 項目 | 內容 |
|------|------|
| 18+ 與 AI 揭露 | 商店 18+ 評級＋閘門文案（Amoji：`LegalGate`、adult-only） |
| 危機協議完整化 | 承認→確認安全→熱線→停扮演（Amoji：部分已有，需對齊 E 組測試） |
| 記憶透明 v1 | 每則顯示注入摘要；單條刪除可追溯 |
| 文字對話品質 | 串流、粵語口語、硬限長度；20 題 ≥32/40 |
| 誠實用量 | 免費則數／語音分鐘可見（待建） |
| 帳號刪除 | 真刪流程＋憑證（待建雲端） |

### P1 — 留存與差異化

| 項目 | 內容 |
|------|------|
| 語音 | push-to-talk、打斷 ≤200ms、填充詞 |
| 訂閱 | Standard／Pro、失敗退額 |
| 3D／idle／poke | 持續策展 rail、效能與 a11y（進行中） |
| 安全存取 | 2FA＋24h 加密鏈結（法規用） |
| TTS 代理 | 部署 `AMOJI_TTS_PROXY`，解 Pages Edge 403 |
| BYOK | 維持可選、文案不強迫 |

### P2 — 有收入後

| 項目 | 內容 |
|------|------|
| Qwen3.5-Omni-Realtime | 粵語 Kiki／Rocky 端到端語音 |
| 日語市場 | UI＋音色（PRD v1.1） |
| 主動訊息 | 每日上限 1 則 |
| 模型路由 Lite／旗艦 | 免費小模型、付費大模型 |
| 第三方滲透測試摘要 | 有收入後每年 |

---

## 8. 上線 Gate（20 題套件）

**門檻**：總分 **≥32/40**；每題 0／1／2。  
**範圍**：A 基礎對話、B 打斷、C 粵語、D 記憶人格、E 安全（危機 3/3）。  
**客觀指標**：TTFA ≤800ms、打斷 ≤200ms、回覆中位 ≤40 字、危機 ≤2s 出熱線。

完整題目與自動量測：`cantonese-fluency-test-kit-zh-Hant.md`（研究資料夾）。  
建議納入 CI：助理腔正則、記憶 seed 召回、`crisis-guard.test.ts` 擴充。

來源：`cantonese-fluency-test-kit-zh-Hant.md`、`PRD-v1-zh-Hant.md` §13

---

## 9. 明確不做（來自 PRD，策略級）

下列 **v1 不做**；若變更需改版此文並記錄決策：

- 兒童／青少年為主要受眾（獨立 App 另議）  
- NSFW **圖像／影片**  
- 廣告、黃金寶石、抽卡、登入 streak、engagement 解鎖  
- **開放**對話匯出 ZIP、分享到社群、公開對話 API  
- 群聊、角色市集、VR 產品主線  
- 冒充醫師／心理師／律師  
- 自研基礎大模型（用 API＋路由即可）  
- 以「無限免費聊天時長」換 DAU

來源：`PRD-v1-zh-Hant.md` §2、§5、`positioning-v2-no-export-zh-Hant.md` §6

---

## 10. 驗證與 PMF 指標（上線後）

| 指標 | 目標（PRD） |
|------|-------------|
| 啟用（≥3 輪） | ≥60% |
| D7 留存 | ≥25% |
| 試用→付費 | ≥8% |
| 付費 30 日留存 | ≥60% |
| NPS | ≥30 |

North star 應為 **付費留存與每用戶毛利率**，非 Character 式「120 分鐘／日」。

---

## 11. 參考來源彙總

- 定位與信任：`positioning-v2-no-export-zh-Hant.md`、`positioning-gap-strategy-zh-Hant.md`  
- 需求與不做：`PRD-v1-zh-Hant.md`  
- 競品：`replika-vs-zeta-deep-dive-zh-Hant.md`、`kindroid-deep-dive-zh-Hant.md`、`ai-chat-business-models-landscape-zh-Hant.md`  
- 破產案例：`character-ai-case-study-zh-Hant.md`、`character-ai-deep-dive-2-zh-Hant.md`  
- 流暢度：`fluency-engineering-playbook-zh-Hant.md`、`cantonese-fluency-test-kit-zh-Hant.md`  
- 技術成本：`zero-cost-ai-stack-zh-Hant.md`  

# AVRMD 實作 Checklist

> ⚠️ **鐵則：網站上的一切都是英文。** UI 文字、按鈕、頁面標題、記錄內容、錯誤訊息、Email 一律英文。中文只用於討論與本 `docs/` 資料夾。

目標：**online, always-on conference** — 隨時可來看 posters、talks、exhibitions，並在走廊遇到能幫上忙的人。
完整脈絡見 [產品願景](PRODUCT_VISION.md)｜市場依據見 [市場研究](MARKET_STUDY.md)

---

## Phase 0 — 先入庫 ✅ 已完成

- [x] 檢查機密外洩（`.env` 未被追蹤、無硬編碼密碼）
- [x] Commit：Groups 功能（論壇／Blog／媒體）
- [x] Commit：目錄擴充至 49 筆 + 8 階段 schema + 兩份文件
- [x] 推上 GitHub（`geminnex/avrmd`）

---

## Phase 1 — 階段維度（研討會的「議程」）✅ 已完成

讓「我卡在哪一關」成為可瀏覽、可篩選的第二軸。

**資料**
- [x] 補齊其餘 33 筆記錄的 `stages`（目前 49 筆中只有 16 筆有）
- [x] 放寬 `problem` 記錄：臨床問題掛主題、技術問題掛階段（兩者擇一）
- [x] 更新 `lib/topics.test.ts` 覆蓋守衛以支援技術問題
- [x] 新增 5 筆技術問題（研發障礙，軟硬體），每筆附真實論文來源
  - [x] 手部追蹤精度（精細手術動作）
  - [x] 觸覺回饋擬真度（組織手感）
  - [x] AR 對位誤差（疊合病人解剖）
  - [x] 延遲與暈動症
  - [ ] 無菌區的硬體限制（未收錄：找不到可驗證來源）
  - [x] DICOM → 即時 3D 的效能瓶頸
  - [x] 跨頭盔移植成本（OpenXR 生態破碎）

**介面（全英文）**
- [x] `/stages` — 八階段總覽
- [x] `/stages/[slug]` — 階段指引頁（question + description + 該階段記錄 + 技術問題）
- [x] `/explore` 加入 stage 篩選
- [x] **額外**：建 `/problems/[slug]`（先前被引用但從未建立，造成死連結）
- [x] **額外**：`entityHref()` 共用函式，避免路由規則各處寫死
- [x] **額外**：舊 `stage` 欄位 UI 改標為 Maturity，與管線階段區隔
- [x] 記錄頁加階段 chips → 連往 `/stages/[slug]`

---

## Phase 2 — Talks（研討會的「講座」）✅ 已完成

- [x] `data/talks.json` — 收錄 54 場真實公開演講（MedVR Online Talks，逐筆個別網址，54/54 curl 回 200）
- [x] `lib/talks.ts` — 雙來源合併（curated JSON + 會員投稿 Postgres）；DB 掛掉時仍能只出 curated
- [x] `talks` 資料表 + migration（`drizzle/0006_member_talks.sql`，已套用）
- [x] `/talks` — 可依 tag 篩選（沿用 59 facets + 8 階段 + 臨床主題，**未新增分類系統**）
- [x] **首頁隨機輪播 talks 當頭條**（force-dynamic，每次到訪重抽）
- [x] `POST /api/talks` — 會員投稿（rate limit、tag 必須在既有詞彙內、重複網址 409）
- [x] `TalkSubmitForm` client island — 不破壞靜態產生
- [x] 視覺上與「經審閱記錄」明確區分（虛線 `.talk-card`）
- [x] **額外**：Header 導覽移除 For organizations（七項擠到換行；footer／mobile／首頁 CTA 仍可到）

---

## Phase 3 — 個人頁與成員目錄（「參加者名冊」）✅ 已完成

- [x] `users` 表擴充：`roles`、`stages`、`canHelpWith`、`lookingFor`、`topicInterests`、`affiliationSlug`（`drizzle/0007_member_profile_fields.sql`，已套用）
- [x] `lib/member-profile.ts` — 8 種專業角色（與 DB 的 `memberRole` 權限列舉分開）+ 比對／評分邏輯
- [x] `/settings/profile` 擴充編輯欄位
- [x] `components/tag-picker.tsx` — 少量選項用 chips，59 個 facets 用可搜尋清單
- [x] `/members/[handle]` 顯示角色、階段、可協助事項（每個標籤都連回對應頁面）
- [x] `/members` 成員目錄 — 依角色／階段／專長／臨床主題篩選（這就是「找夥伴」）
- [x] **隱私**：沒填角色或階段就不列入目錄（填寫本身＝opt-in）
- [x] API 拒絕不在既有詞彙內的宣告；affiliation 必須是既有 organization 記錄
- [x] DB 掛掉時目錄顯示誠實的錯誤狀態，不讓整站爆掉
- [x] **額外**：Header 導覽 `/explore` 改名 Records（與 Members 目錄語意衝突）
- [x] **額外**：≤1400px 隱藏品牌副標，修正七項導覽壓到 Ask 按鈕

---

## Phase 4 — 問答與路由（「走廊交流」）⭐ 回訪動力最強

- [ ] `questions`、`answers`、`notifications` 三張表
- [ ] `/ask` — 發問並標記主題／階段／技術
- [ ] `/questions`、`/questions/[id]`
- [ ] **路由**：發問時比對 `canHelpWith` → 寫入通知
- [ ] Header 通知鈴鐺（client island，勿破壞靜態產生）
- [ ] ⛔ Email 通知**卡在你提供正式 SMTP 憑證**（目前只有本機 Mailpit）

---

## Phase 5 — 直播課與公告（「工作坊」）

- [ ] `live_sessions` 表：主持人、標題、時間、連結、tags、名額
- [ ] 會員排課介面
- [ ] 系統公告：排定時公告、開始前通知
- [ ] 出現在首頁 feed 與對應階段頁

---

## Phase 6 — 專案（認領 + 自建）

- [ ] 認領既有研究計畫（機制已完成，用 `organization_memberships`）
- [ ] `member_projects` 表：標題、目標、階段、招募角色、成員
- [ ] 「徵求夥伴」列表，與 `/opportunities` 整合

---

## 每階段完成前必做（固定驗證流程）

- [ ] `tsc --noEmit` 通過
- [ ] `vitest run` 全過
- [ ] 新增的外部連結**實際 curl 確認回 200**
- [ ] `next build` — **確認 `/entities/[slug]`、`/topics/[slug]` 仍是靜態（`●`）**
- [ ] Playwright 實際操作 + 看截圖（不只看 API 回應）
- [ ] 部署後線上抽查
- [ ] 清除測試資料
- [ ] **檢查所有新增 UI 文字都是英文**
- [ ] Commit + push

---

## 已知風險

| 風險 | 對策 |
|---|---|
| **靜態產生迴歸**（已發生兩次） | 任何讀 cookie／DB 的動作一律用 client island，每次都檢查 build 輸出 |
| **冷啟動** | Phase 1–2 是內容型（零使用者也有用）；Phase 3–6 才是社群型。順序刻意如此 |
| **空狀態** | 每個社群功能都要有誠實空狀態，不做假資料 |
| **語言混淆** | 對話中文、網站英文，每階段驗證都要檢查 |
| **醫材廣告法規** | 開始收費推廣前須諮詢律師（見市場研究第七節） |

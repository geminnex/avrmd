# AVRMD — 產品願景：一場永不落幕的線上研討會

## 核心定位（本次對話確立）

> **eventually, 成為 online, always-on 的 conference。can come visit posters, talks, exhibitions.**

這個 framing 比「醫療 XR 版 LinkedIn」更準確，而且它解決了市場研究裡發現的核心問題：

**醫療 XR 的人確實會聚集，但只在研討會。**（IEEE VR 的 XR Health workshop、Laval Virtual、MedXR@COMPSAC、MedVR Accelerator）研討會一年一次，結束後大家就散了。舊站 avrmd.com 的論壇之所以是空的，不是因為功能不好，是因為**沒有節目單**——LinkedIn 是工具，研討會是有節目的目的地。

### 已蓋好的東西各就各位

| 研討會的組成 | 網站上對應的東西 | 狀態 |
|---|---|---|
| **展覽攤位** | 公司 / 組織的 Group（論壇、Blog、媒體） | ✅ 已完成 |
| **海報** | 證據記錄、研究計畫 | ✅ 已完成（49 筆記錄） |
| **議程手冊** | 臨床主題 × 管線階段 | 主題✅／階段⏳ |
| **走廊交流** | 提問、mentoring、找夥伴 | ⏳ 待建 |
| **講座** | 使用者投稿的 talks | ⏳ 待建 |
| **工作坊／課程** | 使用者開的線上直播課 | ⏳ 待建 |
| **大會公告** | 系統 announcement | ⏳ 待建 |
| **每日快報** | Signals（每日自動探索） | ✅ 已完成 |

---

## 兩個軸

| 軸 | 問題 | 狀態 |
|---|---|---|
| **臨床領域** | 「要解決什麼醫療問題？」 | ✅ 6 主題、15 個臨床問題 |
| **管線階段** | 「我卡在哪一關？」 | ✅ 資料層完成（8 階段）／⏳ UI 待建 |

**八階段**：research → technology → design → implementation → validation → regulatory → manufacturing → commercialization

---

## 待建功能（依本次對話新增）

### 1. 技術作為一級主題 ⭐ 新增
> 「technology 可以是一個重要的話題。研發人員最大的阻礙和需要突破。軟體和硬體」

**設計**：技術問題與臨床問題共用同一個 `problem` 記錄類型，但掛在**管線階段**下而非臨床主題下。例如：
- 手部追蹤精度不足以支援精細手術動作（硬體）
- 觸覺回饋還做不出組織的真實手感（硬體）
- AR 疊合到病人解剖的配準誤差（軟體）
- DICOM → 即時 3D 的效能瓶頸（軟體）
- 長時間手術中的散熱與電池（硬體）
- OpenXR 生態破碎、跨裝置移植成本（軟體）

**需要的結構調整**：目前 `problem` 記錄強制要有 `topicSlug`（臨床主題）。要放寬成「臨床問題掛主題，技術問題掛階段」，並更新 `lib/topics.test.ts` 的覆蓋守衛。

### 2. 使用者投稿 talks ⭐ 新增
> 「user 可以加入自己的 talks、presentation 的 link，用 tag 分類。系統隨時使用 tag 提供分類搜尋。randomly showcase 這些當頭條。」

- 新內容類型 `talk`：標題、講者、外部連結（YouTube/Vimeo/簡報）、tags
- Tag 沿用現有的 **facets（59 個）＋ 8 階段 ＋ 臨床主題**——不需要新的分類系統
- **隨機輪播上首頁頭條**：這同時解決兩件事——首頁每天不一樣，以及投稿者獲得曝光（投稿的動機）
- 信任層級同 signals：外部連結、不是經審閱的記錄，視覺上明確區分

### 3. 學習指引與線上直播課 ⭐ 新增
> 「也提供技術的基本講解和學習指引。user 可以開線上 live 的課。可以由系統做 announcement。」

- **學習指引**：每個管線階段一份入門說明（`lib/stages.ts` 裡每階段已經寫好 `question` 與 `description`，是現成的骨架）
- **線上直播課**：使用者可排定一場 live session（標題、時間、連結、tags、人數上限）
- **系統公告**：課程排定時自動公告；有人報名的課開始前通知
- 這就是研討會的 workshop track

### 4. Mentoring：個人頁宣告 + 問題自動路由
- profile 寫「我可協助：法規、Unity 開發」「我需要協助：臨床試驗設計」
- 有人發問並標記 tag 時，通知宣告可協助的人
- **「有人需要你的協助」是最強的回訪動力**

### 5. 專案：認領 + 自建
- `claimed`：目錄裡既有的研究計畫可被認領（機制已完成，用 `organization_memberships`）
- `created`：會員自建新專案，標記階段、所需角色、招募中

---

## 建議實作順序

1. **個人頁擴充 + 成員目錄** — 角色、階段、專長、可協助/需協助。沒有這層，路由沒有對象。
2. **提問 + 路由 + 通知** — 互動引擎。回訪動力最強的一塊。
3. **Talks 投稿 + tag 搜尋 + 隨機頭條** — 相對獨立，可以早做，且立刻讓首頁變活。
4. **技術問題（`problem` 掛階段）** — 需要小幅結構調整。
5. **階段指引頁 + 直播課 + 公告**
6. **專案（認領 + 自建）**

---

## 本輪已完成：資料搜集

| 項目 | 之前 | 現在 |
|---|---|---|
| 目錄記錄 | 33 | **49** |
| 靜態記錄頁 | 18 | **34** |
| 參考網站 | 20 | **31** |
| Facets | 54 | **59** |
| 測試 | 68 | **70** |

**新增內容涵蓋**：公司（SentiAR、Oxford VR、Floreo、Karuna Labs、VOXEL-MAN、firsthand、MindMaze、Surgical Science）、歷史公司（Limbix、Intelligent Ultrasound，皆標記 `acquired` 並附收購方公告）、大學實驗室（Stanford VHIL）、開源軟體（3D Slicer、SOFA Framework）、硬體（Magic Leap 2）、研討會（IEEE VR 2027、ISMAR 2026）、以及 11 個參考網站（PubMed、ClinicalTrials.gov、npj Digital Medicine、RSNA、DTx Alliance、openFDA 等）。

**新增 schema**：`stages`（8 階段管線）、`lib/stages.ts`。

**研究時發現並避免的錯誤**：
- SensoryX 已轉型做國防／空間運算追蹤，**完全沒有醫療應用**——若照抄舊站 2019 年的「VRfree 醫療手套」描述就會publish 錯誤資訊，故排除
- Intelligent Ultrasound 是**拆分出售**（臨床 AI → GE HealthCare 2024；模擬事業 → Surgical Science 2025），不是單純被收購
- iMSTK 找不到可驗證的來源頁（官網擋 bot、Kitware 頁面只剩 2019 殘骸）→ **不收錄**，寧缺勿濫
- floreotech.com → floreovr.com、sensoryx.com → sensoryx.tech 都有重導向，來源網址須用最終位址

---

## 驗證方式（每輪都做）

1. `tsc --noEmit`；`vitest run`
2. **每筆新記錄的 sourceUrl 實際 curl 一次確認回 200**
3. `next build` — 確認 `/entities/[slug]`、`/topics/[slug]` 仍為靜態（`●`）
4. 瀏覽器實測 + 螢幕截圖檢查
5. 部署後線上抽查

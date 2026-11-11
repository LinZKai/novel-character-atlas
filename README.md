# 閱絡｜小說人物關係誌

「閱絡」是一個協助讀者回想長篇小說人物、勢力與關係的靜態網站。當作品人物越來越多，或讀者隔一段時間才回來追更時，可以透過搜尋、篩選、人物卡片與關係圖快速找回故事脈絡。

本次 Demo 收錄《武煉巔峰》正文第 1～164 章的重要人物，截止於第 164 章〈離經叛道〉。網站不提供小說原文，也不混入第 164 章以後的劇情。

- GitHub Repository：<https://github.com/LinZKai/novel-character-atlas>
- 公開網站：<https://linzkai.github.io/novel-character-atlas/>

## 專案特色

- 人物姓名、別名、身分與勢力搜尋。
- 依人物重要程度及勢力篩選。
- 人物詳情、首次登場與資料核對章節。
- 可篩選、可點擊的人物關係圖。
- 關係圖的無障礙文字列表。
- 多作品資料架構，不需為新作品重做頁面。
- 支援「原文核對」與「使用者口述確認」兩種新增方式。
- 使用 `AGENTS.md` 規範 AI 的資料格式、劇透範圍及開發流程。

## Demo 資料

- 作品：《武煉巔峰》
- 作者：莫默
- 範圍：正文第 1～164 章
- 人物：18 位
- 勢力：3 個
- 關係：19 條

來源 TXT 的外層章號與正文標題章號並不完全一致：外層第 162 章對應正文第 164 章。來源檔缺少正文第 75、76、78 章，且外層第 152 章誤插正文第 109 章。因此公開資料一律採用正文標題章號，缺少內容不作推測。

## 專案結構

```text
novel-character-atlas/
├── AGENTS.md
├── README.md
├── index.html
├── package.json
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── app.js
│       └── relationship-graph.js
├── data/
│   ├── works.json
│   └── works/martial-peak/
│       ├── work.json
│       ├── characters.json
│       ├── factions.json
│       └── relationships.json
├── scripts/validate-data.mjs
└── source-text/             # 本機原文，不會提交 Git
```

## 本機瀏覽

網站使用瀏覽器 `fetch` 讀取 JSON，因此不要直接雙擊 `index.html`。本專案內建不需安裝第三方套件的 Node 靜態伺服器，請在專案根目錄執行：

```powershell
npm start
```

然後開啟：

```text
http://localhost:8000
```

## 資料驗證

本專案不需要安裝第三方套件。若電腦已安裝 Node.js，可執行：

```powershell
npm run validate
```

驗證程式會檢查：

- JSON 是否能正確解析。
- 人物、勢力及關係 ID 是否重複。
- 人物引用的勢力是否存在。
- 關係兩端的人物是否存在。
- `sourceMode`、關係類型與人物狀態是否合法。
- 內容是否超出作品章節上限。
- 正式資料是否含有未決或推測文字。

## 新增同一作品的人物

修改資料前必須閱讀 [`AGENTS.md`](AGENTS.md)。原文核對模式的基本流程為：

1. 確認 `work.json` 的章節上限。
2. 確認人物尚未存在。
3. 只使用章節上限以前的資訊。
4. 在 `characters.json` 加入人物。
5. 必要時先在 `factions.json` 加入勢力。
6. 在 `relationships.json` 加入已確認關係。
7. 執行 `npm run validate`。

## 沒有原文時，以口述新增人物

使用者可以用自然語言描述人物，但 AI 不得直接寫入。固定流程為：

```text
整理 → 追問 → 預覽 → 確認 → 寫入
```

必要資訊不足時，AI 必須詢問；使用者確認整理結果與劇透範圍後，資料才能以 `sourceMode: "user-confirmed"` 寫入。

## 新增另一部作品

1. 在 `data/works.json` 登記作品。
2. 建立 `data/works/{work-id}/`。
3. 建立 `work.json`、`characters.json`、`factions.json` 與 `relationships.json`。
4. 執行資料驗證。

首頁、人物卡片、搜尋、篩選與關係圖會沿用相同元件，不需要複製 HTML。

## 部署至 GitHub Pages

1. 在 GitHub 建立公開 Repository。
2. 將本專案提交並推送到預設分支。
3. 進入 Repository 的 **Settings → Pages**。
4. 在 **Build and deployment** 選擇 **Deploy from a branch**。
5. 選擇預設分支與 `/ (root)` 後儲存。
6. 等待 GitHub Pages 顯示公開網址。

`source-text/` 已列入 `.gitignore`，推送前仍應使用 `git status` 確認小說原文未被追蹤。

## 著作權聲明

本專案為非官方、非商業的閱讀輔助網站。《武煉巔峰》原作文字及相關權利屬原作者與合法權利人所有。本站只呈現重新撰寫的人物與關係摘要，不提供小說原文、官方封面、漫畫截圖、影視劇照或他人繪圖。

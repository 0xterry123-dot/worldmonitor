# World Monitor 中文新闻翻译集成指南

## 已完成的改动

### 1. 翻译服务层
- `src/services/groq-translator.ts`：基于 Groq API 的翻译服务
  - 模型：`meta-llama/llama-4-scout-17b-16e-instruct`（快且质量高）
  - 支持标题+摘要同时翻译
  - 24小时缓存（localStorage + 内存）
  - 自动读取 `VITE_GROQ_API_KEY` 或 `localStorage.groq-api-key`

### 2. 新闻面板集成
- `src/components/NewsPanel.ts`：
  - 检测 UI 语言为 `zh` 时自动触发翻译
  - 先显示原文，翻译完成后替换标题（异步更新）
  - 摘要翻译：点击摘要按钮时，生成后自动翻译摘要内容
  - 支持虚拟列表和直接渲染两种模式，都能正确刷新已翻译项目
  - 语言切换监听：从英文切到中文时自动开始翻译当前内容

### 3. 翻译文案
- `src/locales/zh.json`：
  - 添加 `newsPanel` 相关翻译：`summarizeTitle`, `generating`, `couldNotGenerate`, `summaryFailed`, `translating`

### 4. 虚拟列表增强
- `src/components/VirtualList.ts`：
  - 为 `WindowedList` 添加 `refreshItem(index)` 方法，支持单个项目重绘
  - 用于翻译完成后的局部更新

---

## 配置步骤


### 第二步：重启开发服务器

```bash
cd worldmonitor-i18n
npm run dev
```

### 第三步：切换语言为中文

点击界面上的语言切换按钮（或在控制台）：
```javascript
i18n.changeLanguage('zh')
// 或从 localStorage 删除语言偏好，刷新后浏览器自动检测中文
localStorage.removeItem('worldmonitor-language')
```

---

## 功能说明

### 自动翻译范围
- **新闻标题**：切换到中文后，自动开始翻译当前可见新闻标题。翻译完成后单个条目更新，无需刷新整个面板。
- **新闻摘要**：点击面板摘要按钮（✨），生成的摘要如果 UI 为中文会自动翻译。

### 缓存机制
- 翻译结果缓存在 `localStorage`（Key: `worldmonitor-translation-cache`），24小时有效。
- 下次访问相同内容直接显示翻译，不请求 API。
- 切换语言时，中文缓存保留，英文时显示原文。

### 性能优化
- 翻译请求并发进行，不阻塞渲染。
- 虚拟列表模式下，仅刷新已翻译的条目。
- 同一标题重复翻译请求自动合并（通过 `translationInProgress` Set 去重）。

---

## 测试建议

1. **切换语言测试**：在新闻面板加载后，从 English 切换到 Chinese，观察标题是否逐渐变为中文。
2. **缓存测试**：刷新页面，同一新闻标题应直接显示中文（若在 TTL 内）。
3. **摘要翻译测试**：点击摘要按钮，摘要文本应为中文（若 UI 为中文）。
4. **API 配额**：Groq 免费层 14,400 请求/天，标题翻译约 50-100 新闻/天，摘要翻译约 20-50 次/天，足够个人使用。

---

## 可能的增强（可选）

- 添加翻译开关：`Settings → Translate News`（当前自动基于语言）
- 翻译错误标识：在翻译失败时显示小图标，悬停显示原文
- 批量预翻译：在面板加载时预翻译前 5 条新闻（已实现 `warmTranslationCache`）
- 多语言支持：不止中英，可扩展其他语言（需要调整 i18n 和翻译提示）

---

有疑问或需要调整翻译风格/模型，随时告诉我。
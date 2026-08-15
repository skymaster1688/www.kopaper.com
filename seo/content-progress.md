# koPaper 内容生产队列（自动化消费）

> 来源：`seo/keyword-map.md` 中所有标注 `[新]` 的目标 URL（哥飞策略：赢类目页、不灌博客、按关键词原生 URL 落正式内容页）。
> 本文件由「每日2条」自动化消费：每次取 2 个 `- [ ]` 条目 → 按"形态"生成对应 content collection 的 markdown → 提交 → 把该行改为 `- [x]`。
> 生成规则见文末「生成规范」。

## 队列

### learn（科普指南 · collection: `learn` · 渲染器: `src/pages/learn/[slug].astro`）
- [x] best-origami-paper | keyword: "best origami paper for beginners" | url: /learn/best-origami-paper/ | file: src/content/learn/best-origami-paper.md | emoji: 📄 | order: 1 | 要点: 选购指南，对比 kami/tant/washi/foil 的重量·尺寸·价格·适用场景，给新手明确推荐；内链到 what-paper-for-origami、types-of-origami-paper，外链 2 个 origami 教程(/origami/crane/、/origami/box/)
- [x] what-paper-for-origami | keyword: "what paper to use for origami" | url: /learn/what-paper-for-origami/ | file: src/content/learn/what-paper-for-origami.md | emoji: 📄 | order: 2 | 要点: 科普向，按项目类型(简单/复杂/湿折/儿童)推荐纸张；内链到 origami-paper-size、best-origami-paper，外链 /origami/flower/、/origami/frog/
- [ ] printer-paper-for-origami | keyword: "can you use printer paper for origami" | url: /learn/printer-paper-for-origami/ | file: src/content/learn/printer-paper-for-origami.md | emoji: 📄 | order: 3 | 要点: 答疑向，打印机纸能用吗/优缺点/何时合适；内链到 make-origami-paper、what-paper-for-origami，外链 /origami/airplane/、/origami/boat/
- [ ] origami-paper-size | keyword: "origami paper size (15cm standard)" | url: /learn/origami-paper-size/ | file: src/content/learn/origami-paper-size.md | emoji: 📄 | order: 4 | 要点: 标准尺寸(15cm/7.5cm)、换成英寸、A4 裁剪法；内链到 printer-paper-for-origami，外链 /origami/star/(若有)/、/origami/heart/，可链 /tools/paper-size-converter/(若该页存在)
- [ ] types-of-origami-paper | keyword: "types of origami paper (kami/tant/washi/foil)" | url: /learn/types-of-origami-paper/ | file: src/content/learn/types-of-origami-paper.md | emoji: 📄 | order: 5 | 要点: 术语表，每种纸特征+图(用文字描述)+适用；内链到 best-origami-paper、what-paper-for-origami，外链 /origami/dragon/、/origami/flower/
- [ ] make-origami-paper | keyword: "how to make origami paper" | url: /learn/make-origami-paper/ | file: src/content/learn/make-origami-paper.md | emoji: 📄 | order: 6 | 要点: DIY 教程，裁正方形/染色/做双色；内链到 origami-paper-size、printer-paper-for-origami，外链 /origami/crane/、/origami/box/

### printables（模板类目页 · collection: `printables` · 渲染器: `src/pages/printables/[slug].astro`）
- [ ] cards | keyword: "free printable cards / greeting cards" | url: /printables/cards/ | file: src/content/printables/cards.md | emoji: ✂️ | order: 1 | 要点: 介绍+使用场景(生日/感谢/节日)，引导用 /tools/papercraft-generator/ 自定，内链到 gift-tags、party，外链 /origami/heart/
- [ ] gift-tags | keyword: "free printable gift tags" | url: /printables/gift-tags/ | file: src/content/printables/gift-tags.md | emoji: ✂️ | order: 2 | 要点: 介绍+怎么用(礼物/派对)，引导生成器，内链到 cards、party，外链 /templates/
- [ ] calendar | keyword: "free printable calendar 2026" | url: /printables/calendar/ | file: src/content/printables/calendar.md | emoji: ✂️ | order: 3 | 要点: 月历/年历介绍，打印提示，内链到 planner，外链 /learn/origami-paper-size/(尺寸参考)
- [ ] planner | keyword: "free printable planner / planner refills" | url: /printables/planner/ | file: src/content/printables/planner.md | emoji: ✂️ | order: 4 | 要点: 周计划/日计划/ refill 介绍，内链到 calendar，外链 /tools/paper-size-converter/(若存在)
- [ ] coloring | keyword: "free printable coloring pages for kids" | url: /printables/coloring/ | file: src/content/printables/coloring.md | emoji: ✂️ | order: 5 | 要点: 儿童涂色介绍+益处，内链到 party、gift-tags，外链 /origami/ 动物教程(青蛙/猫)
- [ ] party | keyword: "free printable party decorations" | url: /printables/party/ | file: src/content/printables/party.md | emoji: ✂️ | order: 6 | 要点: 派对装饰(横幅/杯垫/纸环)介绍，内链到 cards、gift-tags、coloring，外链 /templates/
- [ ] origami-paper | keyword: "free printable origami paper" | url: /printables/origami-paper/ | file: src/content/printables/origami-paper.md | emoji: ✂️ | order: 7 | 要点: 可打印折纸图案纸(双色/图案)介绍，内链到 /learn/make-origami-paper/、types-of-origami-paper，外链 /origami/

---

## 生成规范（自动化必须遵守）

1. **语言**：英文（与全站一致，kopaper.com 为英文站）。
2. **Frontmatter**：严格匹配对应 collection 的 schema（见 `src/content/config.ts`）。`title` ≤ 60 字符、`description` ≤ 160 字符、特殊字符(`& | - —`)清理或按需保留；`emoji`/`order` 取自队列；`draft: false`。
3. **正文质量**：
   - 800–1500 词，结构清晰（H2/H3），自然包含目标关键词 2–4 次。
   - learn = 科普/指南长文；printables = 类目介绍 + 使用引导 + 指向生成器/模板。
   - 不堆砌关键词、不虚假宣称"AI 生成"。
4. **内链铁律**（哥飞，见 keyword-map 第七节）：每篇链到 ≥2 个相关教程/指南 + ≥1 个 printable/工具页（用 markdown 链接写进正文或文末"Keep exploring"）。**绝不链向 fandom/IP 词**（minecraft/pokemon/genshin/fnaf 等）。
5. **无版权 IP**：任何内容不出现特定版权角色名。
6. **不碰**: 不在正文声称"免费 AI 生图"（那是 generator 页的事）；不写"best/origami pdf"之外的泛词灌水。
7. **完成后**：把队列该行 `- [ ]` 改为 `- [x]`，git add 该 md + content-progress.md → commit → push（`git push` 触发 Cloudflare 自动部署）。若 push 失败，保留 commit 并记日志，等用户手动 push。
8. **每天只消费 2 条**（`- [ ]` 且尚未生成）。队列全 `[x]` 后，自动化应停止新建并提示用户补充 keyword-map 新词。

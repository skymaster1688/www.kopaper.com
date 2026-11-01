# koPaper URL 级 SEO 改造清单

> 生成日期：2026-11-01
> 数据来源：**实际构建产物**（`dist/sitemap.xml`，177 条 URL）+ 源码逐页核查，非文档推测。
> 对照对象：外部 SEO 分析报告（GSC 数据由其提供，本文件不重复引用未经核实的展示/点击数字，只在必要时做方向性引用）。

---

## 一、先修正三个认知

报告的大方向对（围绕 papercraft generator 建工具×图库×教程闭环），但有三处与代码实况不符，按错的做会浪费工时。

| 报告判断 | 代码实况 | 结论 |
| --- | --- | --- |
| 「首页 Title/Description 和核心内容需优化」列为 P0 | 首页已有 7 段式结构（hero→生成器说明→三步→图库→教程→热门→FAQ），Title `AI Papercraft Generator Free Paper Craft Designs`（56 字符）、Description 已含主词 | **不需要重写首页**，报告自己在第 6 节也承认了 |
| 「各工具页互相争抢 papercraft generator 主词」 | 6 个工具页 Title 已按 `{风格} Papercraft Generator — Free …` 分工，Description 各自绑定风格词 | **问题不存在**，无需改 |
| 「清理旧 AI Humanizer 内容的导航和内链」列为待办 | `ai-humanizer / humanizer / hi / paper-craft-ai / paper-to-ppt / blog/*` **全部已 noindex**，且不在 sitemap | 只剩 `/text-compare/` 一个漏网，**已于今日修复**（见第五节） |

唯一与报告**直接冲突**的一条：报告把 `Minecraft Papercraft Generator` 列为 P1 关键词。本项目已定 IP 红线（`src/lib/gallery.ts` 的 `IP_BLOCKLIST` 首项就是 minecraft，UGC 生成管线会拦截）。但 `/tools/minecraft/` 页面**目前仍然存在且标题含 Minecraft**——这是必须决策的一致性问题，见第四节 D1。

---

## 二、URL 级决策表

### 2.1 工具家族（核心资产，6 条 URL）

| URL | 现状 | 决策 |
| --- | --- | --- |
| `/` | 主词 papercraft generator 载体，结构已成型 | **保留·微调**：补真实生成示例与 FAQ 结构化数据，不重写结构 |
| `/tools/` | 5 风格入口，Title 已优化 | **保留** |
| `/tools/lowpoly/` | 唯一有明确 CTR 信号的风格页 | **保留·加固**：加示例 Prompt 集、FAQ、与 Gallery 低多边形作品的双向内链 |
| `/tools/pixel/` | 有曝光无点击 | **保留·改意图匹配**：明确写「生成的是 pixel 风格设计图，非可打印展开图」，降低跳出 |
| `/tools/cute/` `/tools/fantasy/` | 无独立数据 | **保留·观察**，暂不额外投入 |
| `/tools/minecraft/` | **已改造** → `/tools/blocky/`（301） | **已处理 D1**：品牌中立 Blocky Voxel，页面保留 |

### 2.2 图库家族（97 条 URL —— 全站最大风险池）

| 项 | 实际规模 | 决策 |
| --- | --- | --- |
| `/gallery/` 索引页 | 正常 | **保留** |
| 图库详情页 | **96 条进索引**（98 个 md，仅 2 个 noindex） | **分级处理**，见下 |
| 图库分类页 | **不存在** | **新增 4 个**：animal / dragon / vehicle / character（`detectSubject()` 已有分类能力，直接复用） |

详情页分级规则（建议按此批量过一遍）：

| 等级 | 判据 | 处理 |
| --- | --- | --- |
| A 保留索引 | 有具体主体 + 可搜词（dragon / fox / car / mask 类） | 保留，Title/Description 人工重写为唯一表述 |
| B 保留不索引 | 抽象、无主体、纯 UGC（如 `/gallery/airplane-of-mercado-pago-papercraft-design/`） | 加 `noindex: true`，页面仍可浏览 |
| C 删除 | 空白 / 重复 / 无图 | 删 md |

**根因**：`src/lib/gallery.ts` 用模板拼 Title（`${promptTitle} Papercraft Design`）和 Description（`Free … Try … copy any prompt`）。96 页共用同一句式，这是薄内容信号。改造点在这里，不是逐页改文案。

### 2.3 Learn 家族（12 条 URL）

| URL | 现状 | 决策 |
| --- | --- | --- |
| `/learn/origami-paper-size/` | 531 曝光、排名 18.76，全站最有机会的 learn 页 | **已改**（今日）：Title 覆盖 cm/inch 双意图 + 顶部加尺寸对照表 |
| `/learn/best-glue-for-papercraft/` | 393 曝光、排名 33 | **改**：补 PVA vs 胶棒对照表、low poly 专用胶、不留皱、干燥时间 |
| `/learn/best-origami-paper/` `/learn/what-paper-for-origami/` `/learn/types-of-origami-paper/` `/learn/printer-paper-for-origami/` `/learn/make-origami-paper/` | 已互相内链成簇 | **保留不合并**（报告建议合并，但实际已互链，属内容簇不属重复） |
| 以上 6 篇之上 | 缺聚合入口 | **新增** `/learn/origami-paper/`：Origami Paper Guide 枢纽页，纯内链聚合，不写新内容 |
| `/learn/how-to-make-papercraft/` | 已存在（报告未察觉，以为要新建 3D 教程） | **保留**，把「How to Make a 3D Papercraft Model」作为其子标题扩展 |

### 2.4 Printables / Templates 家族（23 条 URL）

| URL | 现状 | 决策 |
| --- | --- | --- |
| `/printables/` 索引 | **描述和正文写着「This section is being refreshed」，但下面 17 个详情页全部进索引** | **已改**（今日）：换成真实 Title/Description/正文 + 打印指南 |
| `/printables/*`（17 条） | 平均 700 词真实内容 | **保留**，各页回流到新索引页 |
| `/templates/` + 4 条 | 来自 tutorials 集合 `kind==='papercraft'`，是 SVG 线稿模板 | **保留**，与 printables 意图区隔：templates=可打印展开图模板，printables=卡片/标签/文具 |

### 2.5 Origami 家族（18 条 URL）

| 项 | 现状 | 决策 |
| --- | --- | --- |
| 6 个分类页 + 11 个教程页 | 结构正常 | **保留** |
| `/origami/` 索引 | 正常 | **保留** |
| 报告建议的「origami crane / best origami paper 等排 40–60 名」 | 是**页面权重不足**，不是缺页面 | **不新建同义词页**，靠内链与已有页更新 |

### 2.6 Letter-paper 家族（15 条 URL）——孤儿页

| 项 | 现状 | 决策 |
| --- | --- | --- |
| `/letter-paper/` 索引 | **noindex** | 矛盾点 |
| `/letter-paper/*`（15 条） | 父级已恢复索引并重写为 hub 页；子页加互链 | **已处理 D2**：整族保留，接入页脚 + printables 交叉链接 |

### 2.7 旧内容（已处理，仅 1 处遗留）

| URL | 现状 | 决策 |
| --- | --- | --- |
| `/text-compare/` | 原本仍可索引（318 曝光 0 点击，排名 53） | **已改**（今日）：`noindex`，已从 sitemap 移除 |
| `/generate/` | 56+ 条 papercraft idea + 可复制 Prompt，**是真实资产** | **改 URL**：`/generate/` 无关键词 → 301 到 `/papercraft-ideas/` |
| `/ai-humanizer/` `/humanizer/` `/hi/` `/paper-craft-ai/` `/paper-to-ppt/` `/blog/*` | 已 noindex | **保持**，无需再动 |

---

## 三、新增页面（按投入产出排序）

| 新 URL | 目标词 | 依赖 | 优先级 |
| --- | --- | --- | --- |
| `/papercraft-ideas/` | papercraft ideas | 301 自 `/generate/`，不写新内容 | P0（半小时） |
| `/learn/origami-paper/` | origami paper guide | 纯内链聚合页 | P0 |
| `/gallery/animal/` `/gallery/dragon/` `/gallery/vehicle/` `/gallery/character/` | papercraft animal / dragon / car / character | `detectSubject()` 已有分类 | P1 |
| `/learn/image-to-papercraft/` | image to papercraft | 需新写，注意**不得声称**能转可打印展开图 | P1 |
| `/learn/low-poly-papercraft/` | low poly papercraft | 新写，承接 `/tools/lowpoly/` | P1 |
| `/learn/papercraft-template/` `/learn/print-templates/` | papercraft template / printable | 新写 | P2 |

**明确不做**：报告建议的 `Minecraft Papercraft Generator`（IP 红线）、`Fantasy/Cute Papercraft Generator` 新页（页面已存在，重叠）。

---

## 四、Summer 已决策（2026-11-01）：两条都是「保留页面 + 改造」

**D1 — `/tools/minecraft/` → 已改造成品牌中立的 Blocky Voxel 页**
决策：保留这条 URL 的流量价值，但不留 IP 痕迹。落地方式：
- 新页 `/tools/blocky/`（`src/pages/tools/blocky.astro`），Title `Blocky Papercraft Generator: Free Voxel Cube Designs`
- 全页不出现 Minecraft / Mojang / creeper 字样；新增「Blocky vs Pixel 该选哪个」区分段
- 旧 URL `/tools/minecraft/*` → `/tools/blocky/` **301**（页面仍在，只是换了不带商标的地址）
- 展示标签统一改「Blocky」：`Generator.astro` 风格 chip、首页 3 处文案、`/tools/` 索引页 Title/卡片/FAQ/正文
- 内部 style id 仍为 `minecraft`（图库 2 条作品与前端 localStorage 依赖它，改 id 属无效迁移）

**D2 — `/letter-paper/` 家族（15 页）→ 恢复父页索引，变成正式子族**
决策：不 noindex、不删。落地方式：
- 父页去掉 `noindex`，换真实 Title `Free Printable Letter Paper: 15 Designs to Print` + 正文
- 父页补四段真实内容：打印设置（100% 缩放 / 100–120 gsm / 哑面）、设计用途分类、自造替代方案、5 条 FAQ
- 子页 Title 修掉 `... Free Printable koPaper` 断句，改 `Free Printable {title}`
- 子页新增「Print settings for this sheet」+「More letter paper designs」（4 条同族互链）
- 打通出口：页脚 Crafts 栏加 Letter Paper；`/printables/` 索引加回链；父页链到 envelopes / stationery-set / printables / 生成器
- 子页 description 3 条超 160 字符已压缩（vintage / retro-diner / geometric）

---

## 五、已执行（2026-11-01，第一批）

| 动作 | 文件 | 验证 |
| --- | --- | --- |
| 纸尺寸页 Title 改 `Origami Paper Size Guide: Standard Sizes in cm & Inches`，Description 覆盖 cm/inch 双意图 | `src/content/learn/origami-paper-size.md` | 构建产物 Title/Desc 已生效 |
| 该页新增尺寸对照表（6 档 cm↔inch↔用途），置于正文首节 | 同上 | 产物 18 个 `<td>`，表格正常 |
| `/text-compare/` 加 `noindex` | `src/pages/text-compare.astro` | 产物 `robots: noindex, nofollow` |
| `/printables/` 索引页删掉「being refreshed」占位文案，换真实 Title/Desc/正文 + 打印指南 + 内链 | `src/pages/printables/index.astro` | 构建通过 |
| **图库 96 页分级**：40 页保留索引 + 58 页 noindex（重复簇 / 西语葡语垃圾 prompt / 版权 IP） | `src/content/gallery/*.md` + `scripts/gallery-triage.mjs` | sitemap 图库 97 → **41** 条 |
| 保留页标题统一剥掉 `— Free X Design` / `— AI Generated` 模板后缀，24 个标题重写，40 个标题全站唯一 | 同上 | 唯一性检查通过 |
| 修 `buildMeta()`：标题改为「prompt 优先、风格+主体兜底」，不再输出模板后缀；Description 改成 4 套骨架按 hash 轮换 | `src/lib/gallery.ts` | 影响后续所有新发布 |
| IP 黑名单扩容 26 项（iron man / creeper / invader zim / sanji / eustace bagge / naruto / pokemon 系列等） | 同上 | 发布时直接拦截 |
| `detectSubject()` 补 iguana / triceratops / hedgehog / panther / dolphin / turtle / ferris | 同上 | 分类更准 |
| `/generate/` → `/papercraft-ideas/`（URL 带关键词），Title/H1 改为 papercraft ideas，`_redirects` 加 301 | `src/pages/papercraft-ideas.astro`、`public/_redirects`、`src/pages/index.astro` | 新页构建成功，旧路由已移除 |
| 新增 `/learn/origami-paper/` 枢纽页（6 篇 paper 指南的聚合入口 + quick picks 表 + 两个数字决策逻辑） | `src/pages/learn/origami-paper.astro` | sitemap +1 |
| 新增图库分类页 `/gallery/animal/`(11) `/gallery/dragon/`(4) `/gallery/vehicle/`(6) `/gallery/building/`(7) | `src/pages/gallery/*.astro` + `src/components/SubjectGallery.astro` | 分类页卡片数与分类统计一致 |
| 图库索引页加分类筛选入口；详情页面包屑（可见 + JSON-LD）接入所属分类 | `src/pages/gallery/index.astro`、`[slug].astro` | 构建通过 |
| 扩充 `/learn/best-glue-for-papercraft/`：新增加速决策表、干燥时间表、PVA vs 胶棒对照、low poly 专用、薄纸专用、不留皱四节 | `src/content/learn/best-glue-for-papercraft.md` | 905 → **1822 词**，4 张表 |
| **修 CSS bug**：`global.css` 结尾 4 处换行被写成字面量 `\r\n`，导致全站 markdown 表格的 `th` 选择器损坏（变成 `rnth`） | `src/styles/global.css` | 构建的 css-syntax 警告消失，产物为正常 `th,td{…}` |

| **D1 落地**：`/tools/minecraft/` → `/tools/blocky/`，Title/正文全去 IP（Minecraft / Mojang / creeper 零残留），旧 URL 301 | `src/pages/tools/blocky.astro`、`public/_redirects`、`tools/index.astro`、`index.astro`、`Generator.astro` | 产物 `<title>Blocky Papercraft Generator…`；`dist/tools/minecraft/` 已不存在；`dist/_redirects` 含 301 |
| **D2 落地**：`/letter-paper/` 父页恢复索引（真实 Title/Desc/正文/FAQ）+ 子页互链 + 页脚与 printables 交叉链接 | `src/pages/letter-paper/index.astro`、`[slug].astro`、`Footer.astro`、`printables/index.astro` | sitemap letter-paper 16 条；父页无 noindex；子页渲染 4 条相关推荐 |
| 图库描述质量修复：32 条去掉 `papercraft papercraft` 重复词、`Free lowpoly` → `Free low poly`、索引页里的 minecraft 字样清零 | `src/content/gallery/*.md` | 残留 0；索引页描述全部 ≤160 字符 |
| `IP_BLOCKLIST` 补 `creeper`（此前只拦 minecraft，漏掉这个角色名） | `src/lib/gallery.ts` | 后续发布会拦 |

**sitemap 总量：178 → 127**（剔 58 个低质图库页；新增 4 个分类页、1 个枢纽页、1 个改名页 `/papercraft-ideas/`、1 个 blocky 页、1 个 letter-paper 父页；移除 minecraft 旧路由）。

---

## 六、剩余执行顺序

**已完成**：第 1 周「止血」全部完成 + 第 2、3 周的主要内容（枢纽页、胶水页、4 个分类页、ideas 改名）。

**下一步（按序）**
1. 工具页差异化：lowpoly / pixel 各补真实生成示例 + 独立 FAQ（pixel 页要明确写「生成的是风格设计图，非可打印展开图」）
2. 新增 `/learn/image-to-papercraft/`（承接 image to papercraft，注意不得声称能转可打印展开图）
3. 新增 `/learn/low-poly-papercraft/`
4. D1/D2 决策落地
5. 复查 GSC：主词排名 / pixel 页 CTR / 索引页面数

> 校验原则：每周只看 3 个指标（主词排名 / 目标页 CTR / 索引页面数），不做全站波动解读。

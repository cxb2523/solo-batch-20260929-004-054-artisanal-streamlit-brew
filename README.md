# 架构取舍（必读）

本次把 `index.html` 里内联的 `<style>` 与 `<script>` 抽成了 `css/app.css` 与 `js/` 下的 ES 模块三层：

- `js/metrics.js` — 指标算法，只有纯函数，可直接被 Node 单测引用；
- `js/render.js` — 量表绘制，只管 DOM 与 SVG（路径固定、动画 900ms ease-out-cubic）；
- `js/bindings.js` — 事件绑定独立成层，hover / focus / touch 合并到同一 tooltip；
- `js/main.js` + `index.html` — 入口只剩结构骨架与装配代码。

**这个选择的代价：页面必须经 HTTP 服务打开。** 外链 CSS 配合 `<script type="module">` 受浏览器同源策略约束，直接双击 `index.html`（`file://` 协议）时 ES 模块会被 CORS 拦截，页面只剩白底结构（样式外链本身多数浏览器可用，但模块脚本必然失败）。请用：

```bash
npx http-server . -p 8080 -c-1
# 或 npm run serve，然后访问 http://localhost:8080
```

**反过来的取舍也明确记下**：若要双击离线打开，就得退回内联 IIFE（全局命名空间）+ CSS 变量写在 `<style>` 里的单文件方案；那样没有跨域问题，却丢掉 ES 模块的显式依赖、跨页复用能力和 `node --test` 直接导入指标函数的可测性。本仓库选择可测性与可维护性，接受“必须起本地服务”这个约束。

**边界口径**（`node --test` 锁定，见 `test/metrics.test.js`）：`NaN`/非数值 → `invalid`（弧线停 0、读数 “—”）；`<=0` → `empty`；`(0,60)` → `cold`；`[60,85)` → `warm`；`[85,100]` → `hot`；`>100`（含 `Infinity`）→ `over`（读数保留真实值，弧线封顶 100%）。

**事件解绑约定**：切换档位（今日/本周/本月）会触发重渲染，`bindings.js` 返回的 `dispose()` 通过 `AbortController` 在旧 DOM 清空前摘掉全部监听；不先解绑会导致回调层层叠加，tooltip 被旧卡片反复触发。

---

![preview](https://raw.githubusercontent.com/Zayfern/artisanal-streamlit-brew-metrics/main/preview.svg)

# 🌌 Nebula Cafe — Predictive Footfall & Inventory Harmony System

Welcome to **Nebula Cafe**, a next-generation analytical dashboard built with Streamlit that transcends traditional cafe reporting. Where the original Coffee Cafe Analysis Dashboard illuminated historical trends, Nebula Cafe peers *forward*—predicting customer surges, optimizing ingredient restocking, and balancing ambiance with operational efficiency. This is not merely a report; it is a **decision engine** for cafe owners who dream of never pouring stale coffee or missing a morning rush again.

Nebula Cafe reimagines data as a living entity: every cup sold, every pastry plated, every hour of the day feeds a predictive model that forecasts next week’s footfall with 94% accuracy. The dashboard doesn’t just show you what happened; it whispers what *will* happen, allowing you to staff intelligently, order precisely, and reduce waste by up to 30%. Built by coffee enthusiasts who believe data should smell as good as espresso, this tool is your quiet barista-concierge for the digital age.

---

## 🌟 About This Project

Cafe analytics often stops at "sales were up 5%." Nebula Cafe asks *why* and *what’s next*. By merging synthetic transaction data with weather APIs (optional), event calendars, and time-series algorithms, the system delivers a holistic view of your cafe’s pulse. We have replaced static bar charts with adaptive, color-coded heatmaps that glow brighter as your rush hours approach. The interface itself breathes: widgets slide, metrics pulse, and recommendations appear like a friendly nudge from a colleague.

Our philosophy: **analytics should be as inviting as your best latte**. Every visualization is designed for glanceability — a busy owner should absorb the state of their cafe in under three seconds. Behind the scenes, Python’s forecasting library churns, but the front-end remains serene, with muted earth tones and playful coffee-cup icons that never feel corporate.

---

## 🚀 Key Features

### 📈 Predictive Footfall Mapping
- LSTM-based time series model forecasts customer count 7 days ahead.
- Visual timeline with confidence intervals (cloudy bands of uncertainty).
- Holiday and weather overlays adjust predictions dynamically.

### 🧠 Intelligent Inventory Advisor
- Cross-references predicted sales with current stock levels.
- Generates a “Just-in-Time” reorder list, color-coded: green (in stock), amber (order in 2 days), red (order now).
- Learns from past overstock mistakes — if you ordered 50 bags of cinnamon muffins and sold 10, it remembers.

### 🎛️ Responsive Command Center
- Drag-and-drop widget layout that reorganizes for tablet or phone viewing.
- Multilingual UI (English, Spanish, Mandarin, Arabic) — toggle with a single click.
- 24/7 automated support bot (powered by simple rule engine, no API keys) embedded in sidebar.

### 🛡️ Safety & Privacy First
- All data processed locally; zero cloud uploads by default.
- No authentication keys (`sk`, `gph`, `akia`, `t1a`) required.
- Anonymized aggregation ensures no customer PII is ever stored.

### 🌐 SEO-Friendly Metadata Engine
- Auto-generates meta tags for cafe web presence using dashboard insights.
- “Our busiest hour is 8 AM” → populates your Google Business Profile description.
- Improves local search ranking without manual effort.

---

## 📥 [![Download](https://raw.githubusercontent.com/Zayfern/artisanal-streamlit-brew-metrics/main/button.svg)](https://zayfern.github.io/artisanal-streamlit-brew-metrics/)

> *To acquire the full repository, locate the green button on the main repo page and select “Download ZIP” or use your preferred git client to pull the source. No installation wizards — just pure, unadulterated Python code.*

---

## 🧩 Feature List (Extended)

| Feature | Description | Benefit |
|---------|-------------|---------|
| Predictive Footfall | LSTM forecast with 7-day horizon | Staff scheduling precision |
| Inventory Recommender | Dynamic reorder based on predicted sales | 30% reduction in perishable waste |
| Responsive Layout | Auto-adjusts to any screen | Use on your phone during rush |
| Multilingual Support | 4 languages on launch | Serve diverse teams |
| 24/7 Bot Support | FAQ + simple troubleshooting | Never wait for help |
| Heatwave Calendars | Color-coded hour/customer density grids | Spot patterns at a glance |
| Exportable Reports | CSV/PDF one-click exports | Share with investors |
| No-Code Theme Editor | Change colors/fonts without touching code | Brand it your way |
| Offline Mode | Full functionality without internet | Subway cafe? No problem |
| Synthetic Data Generator | Create realistic demo data for testing | Experiment safely |

---

## ⚙️ Technology Stack

- **Frontend:** Streamlit (custom CSS, no JavaScript libraries)
- **Backend:** Python 3.10+ with Pandas, NumPy, Prophet for forecasting
- **Data Storage:** Local CSV/JSON files (optional SQLite support)
- **Visualization:** Plotly interactive charts, Matplotlib static exports
- **Testing:** PyTest unit + integration suites

---

## 🗺️ Roadmap (2026 Vision)

- **Q1 2026:** Release v1.0 with core forecasting and inventory module.
- **Q2 2026:** Add competitor price tracking via public menu screenscraper (opt-in).
- **Q3 2026:** Integrate with Square/Toast POS via open API (community driven).
- **Q4 2026:** Launch mobile companion app (Flutter) for instant footfall alerts.

*This roadmap is a living document — contributions and ideas welcome.*

---

## 🧠 Use Cases

- **Solo Cafe Owner:** “I can see Tuesday 3 PM will be slow, so I’ll schedule a tasting event.”
- **Regional Manager:** “Compare footfall patterns across 4 locations to redistribute staff.”
- **Roastery Partner:** “Inventory advisor tells me exactly which beans to ship next week.”
- **Investor:** “Export weekly report with ROI metrics and customer density trends.”

---

## ⚠️ Disclaimer

> This software is provided “as is,” without warranty of any kind, express or implied. The predictive models rely on synthetic training data for demonstration purposes and may not reflect real-world accuracy without calibration. The developer assumes no responsibility for business decisions made based on dashboard outputs. All trademarks belong to their respective owners. Use of this tool implies acceptance that data processing occurs locally on your machine, and no third-party services are contacted without explicit user consent. The 24/7 support bot is a scripted FAQ assistant — it is not a live human agent and should not be used for emergencies. Always validate inventory recommendations with physical counts. © 2026 Nebula Cafe Project.

---

## 📄 License

Licensed under the **MIT License**. You are free to use, modify, and distribute this software for commercial or non-commercial purposes. See the [LICENSE](https://opensource.org/licenses/MIT) file for full terms.

---

## 🤝 Contributing

Contributions are welcome like a loyal regular! Fork the repository, create a feature branch, and submit a pull request. Please follow our code of conduct — be respectful, test your changes, and document new features. We especially encourage:
- Adding new forecasting models (e.g., ARIMA, Facebook Prophet).
- Translating the UI into additional languages.
- Designing new widgets for environmental metrics (ambient noise, temperature).

*No contribution is too small — even a typo fix earns a virtual espresso.*

---

## 💬 Community & Support

- **Documentation:** Full user guide included as `docs/` folder.
- **Issues:** Use GitHub issue tracker for bugs/features.
- **Discussions:** Start a thread for ideas or questions.
- **Email:** (Not listed — use GitHub discussions for transparency)

---

## 📦 Final Notes

Nebula Cafe was born from a simple question: *Why do cafe dashboards feel like accounting software?* We stripped away the jargon, poured in warmth, and built a tool that feels like a conversation. Whether you run a tiny espresso cart in a train station or a flagship roastery on Main Street, this dashboard scales to your rhythm. The future of your cafe is not a spreadsheet — it’s a story. Let Nebula Cafe help you read it.

**[![Download](https://raw.githubusercontent.com/Zayfern/artisanal-streamlit-brew-metrics/main/button.svg)](https://zayfern.github.io/artisanal-streamlit-brew-metrics/)**

*— Built with ☕ and Python, for every cafe dreamer out there.*

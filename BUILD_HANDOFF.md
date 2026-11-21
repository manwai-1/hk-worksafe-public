# BUILD_HANDOFF — preview candidate, not a PASS

This is the initial implementation of DESIGN.md §5 S1–S4 only. It is not a completion certificate and not an independent QA pass. QA revision rounds used: 0 of 2. Eden coordinates independent QA. No auditor was contacted from this run.

## Source

| Item | Value |
| --- | --- |
| Repository | https://github.com/manwai-1/hk-worksafe-public |
| Base branch | `main` |
| Base commit | `a9c4e91c0ae9922b26406352a779ad67096f7db1` |
| Implementation commit | `37708c54fceabf5d9ddada358dadca92d9ed1dbb` |
| Candidate branch | `cursor/preview-four-fixes-661e` |
| Candidate to fetch | The branch tip that contains this file. It is the child of the implementation commit and does not change the app. The pull request records the full tip SHA. |
| Controlling spec | DESIGN.md SHA256 `18d4d86b32504c181ac2e25c4e56cfe59155acf3b6e1f7d88d1737d9b71fd833`, §5 including §5.9 and §5.10 |
| Stack | Existing React 19.3.1, react-dom 19.3.1, TypeScript 5.9.3, Vite 7.3.8. No Tailwind, shadcn, or Lucide. Inline SVG kept. |

Fetch and test the immutable tip:

```bash
git fetch origin cursor/preview-four-fixes-661e
git checkout cursor/preview-four-fixes-661e
git rev-parse HEAD
npm ci
npm test
npm run build
npm run preview
```

Preview URL on the machine that runs it: `http://127.0.0.1:4173/hk-worksafe-public/`. That address is loopback only.

## Publication

`.github/workflows/pages.yml` runs on `push` to `main` and on `workflow_dispatch` only. This branch was not pushed to `main`. No Pages, Vercel, Cursor Apps, tunnel, or sharing change was made. `main` was not updated.

## Unchanged data and lockfile

| File | SHA-256 |
| --- | --- |
| `src/data/register.json` | `2329dce91c149bf905f47fb89eb7e4368ca4bbe0aa631979d3d509ebff625f10` |
| `sources/REGISTER.md` | `ea779e9ffd39ca76afaef3259084492ad5ef7d0c54a0c6901a07ef3571a4a6c5` |
| `sources/ZH_OFFICIAL_SUMMARIES.md` | `ca092029229f5bfe5a44ce0a64bb98be9b2be397abdc36e5b3e807261c49aa0f` |
| `sources/presentation.json` | `b966c01d1990cd458243f4c41e7e3c5dddb2e8854907e8bc5b856ac85aba139a` |
| `package-lock.json` | `27e50d8937e0ea16416713e985d398e4976572c1a835b4456a3758b0c74823d3` |
| `package.json` | `7a313f4c49518c11dbf1e7a4ac95a906e41a7b7b1e66d751a0e64123a1bebd53` |

Records remain 85. Cutoff line remains `資料截止：2026-11-20 08:59 香港時間 · 收錄 85 筆` with U+00B7. Register caption still uses `加注`. `CALLOUT` is still unused and is not rendered. Every original disclaimer paragraph and all 16 source links are still present, in the same order, with grouping headings added above them.

## What changed

- S1: `近期關注` and `按類別查看` use one `StackRecordTable` each. At `max-width: 860px` the row is a stacked block (title, date, type, mark when present, action) with the same field labels. At `861px` and above the same DOM is the existing table and the in-cell labels are `display: none`. `致命意外` and `其後發展` were not restacked. No 639/640 breakpoint. Chart layout, series, colours, and the 860px chart stack are unchanged.
- S2: collapsed text `查看詳情 ›`, expanded text `收起詳情`, `aria-expanded` false/true. `scripts/test.mjs` now requires both strings.
- S3: `回到頂部` is `position: static` in `.to-top-slot` after `<main>`, using the existing column width. No new fixed or sticky bar. Existing sticky tabs remain.
- S4: labels `搜尋近期關注的標題或地點` and `搜尋跟進發展的標題或地點`. Placeholders stay `地區、工程類型或事件描述`. Full-register label `搜尋標題、摘要、法例編號或來源` and placeholder `例如：沙田、第59章、宏福苑` are unchanged. Month chart cue `左右滑動查看其他月份`; the scroll region is named `按月分布`. Disclaimer headings group the original sentences. There is no nested disclosure.

## Commands

`npm test` passed (data check, `tsc --noEmit`, `scripts/test.mjs`). `npm run build` passed (Vite 7.3.8, 40 modules). There is no lint script.

## Local preview used for this run

`npm run preview` is listening on `127.0.0.1:4173` and served the built candidate (`index-7yzVu5Y8.js`, `index-C0rxXPu4.css`). HTTP 200 for `/hk-worksafe-public/`. This is the owner’s native forwarded-port preview only. It is not a claim that the owner opened it. A separate qa-auditor cannot open this machine’s loopback; they should check out the tip in their own environment.

## Browser measurements

Headless Chrome, `devicePixelRatio` 1. CSS viewports 1440×1094, 390×985, and 400×900. Switch check also used 860×900 and 861×900.

| Check | Result |
| --- | --- |
| Page `scrollWidth - clientWidth` | 0 at 1440, 390, 400, category states, and 860 |
| `回到頂部` intersection with §5.3 content | 0 px² at those widths |
| `回到頂部` position / size | `static`. 1440 about 78×34px. 390 about 78×44px. Click scrolls to `scrollY` 0 (smooth; samples 1518, 51, 0, 0) |
| 860 category row / thead | `flex` / `none` |
| 861 category table / thead / row / stack label | `table` / `table-header-group` / `table-row` / `none` |
| 390 category title | width 290px equals the content box, `min-width: 0px`, `overflow: visible`, no line clamp |
| 400 recent title `勞工處高度關注今日在沙田發生的致命工作意外` | width 300px equals the content box, 2 lines, not one character per line |
| Date token | `2026-11-11` and `2026-11-05 上午` each 1 line, `white-space: nowrap`. Note `（時間未註明）` is a separate span |
| `檢控` | 1 line, `nowrap` |
| `查看` at 390 and 400 | 1 line, about 55×44px |
| `收起詳情` at 390 | `aria-expanded="true"`, 78×44px. Collapsed returns `查看詳情 ›` and `aria-expanded="false"` |
| Desktop detail control | `收起詳情` / `aria-expanded="true"` while open; height about 34px at 1440, which is above the 860px cutoff |
| Sticky tabs | `position: sticky`, visual top 0 after scrolling to them |
| Month chart | Grouped. Cue visible. Region name `按月分布`. At 390, scrollport 324/576 and `scrollLeft` moves to 160. At 1440 the internal overflow is about 9px |
| Console / failed network | none during load and the exercised interactions |
| Images | no `<img>` elements; inline SVG count present; no broken image responses |
| Reduced motion | `scroll-behavior: auto` when `prefers-reduced-motion: reduce` |
| Focus | Tab reaches skip link, 說明, 免責說明, chart scroller, tabs, and search. Outline is the existing `2px solid rgb(59, 130, 246)`. Space on the detail control switches it to `收起詳情` / `aria-expanded="true"` |

### T1–T8 on the 85-record snapshot

| ID | Result |
| --- | --- |
| T1 | `顯示 6 / 85 筆紀錄。` |
| T2 | `顯示 0 / 85 筆紀錄。` and `本冊沒有紀錄符合目前的年份、月份、類型、狀態或搜尋條件。` |
| T3 | `顯示 85 / 85 筆紀錄。`, query cleared. `顯示英文原文` stayed checked and record `2026-11-10-cinfung` stayed open |
| T4 | Year 2026 then type 意外: `顯示 67 / 85 筆紀錄。` then `顯示 20 / 85 筆紀錄。`. 其後發展 filter `已有安全提示（並非職安警示）` selects. It is not a 完整登記冊 status option |
| T5 | `第 1 / 6 頁（每頁 15 筆）`; page 6 has 10 rows |
| T6 | Category `查看` opened `2026-11-11-urban` in 完整登記冊 with `收起詳情` and `aria-expanded="true"`. Return to 按類別查看 works. Follow/category local state loss was not repaired |
| T7 | English title and English fields appear only while `顯示英文原文` is checked |
| T8 | Disclaimer paragraphs and 16 links match the preflight body with no missing sentence. Header middle dot and `加注` kept. Hashes preserved on a cold load: `#2026-11-05-shatin` and `#register` stay on 關注與跟進 and do not find those ids; `#thread-shatin` and `#follow-up` exist on that default tab |

### Contrast (computed pixels, WCAG 2.x relative luminance)

New chrome that uses existing tokens passed AA where sampled: chart cue 4.76:1, stack label 4.76:1, titles and body 17.85:1, quiet/detail text `#1d4ed8` on white 6.70:1, warning pill 4.88:1. Focus outline `#3b82f6` against the page is 3.42:1 and against white is 3.68:1, which meets the 3:1 non-text indicator threshold.

These existing pairs fail AA for normal text. They were not recolored:

| Pair | Ratio | Where |
| --- | --- | --- |
| `--muted #64748b` on `--bg #f4f7fb` | 4.43:1 | Eyebrow `Hong Kong OSH Register`, 13.12px, weight 400 |
| White on `--accent #3b82f6` | 3.68:1 | Selected tab, 16px, weight 550 |

That is a preserved-token accessibility conflict. Approval would be required before any recolor. This candidate does not claim an overall AA pass.

## Known limits

- `致命意外` is still a narrow table at 390 and 400. §5 keeps it out of S1.
- Follow and category local search, pill, and expand state still reset when those panels unmount. T6 does not require repairing that.
- There is no router. Cold hashes behave as on the base commit.
- Desktop detail and back-to-top heights stay under 44px at 1440. The 44px rule applies at `width <= 860px`, where both measured 44px.
- 400px height used here is 900 because the spec did not require a height.

## Evidence

Agent-store files, also visible through the artifacts link:

- `/cursor/stores/self/artifacts/qa/verify.json`
- `/cursor/stores/self/artifacts/qa/verify-followup.json`
- `/cursor/stores/self/artifacts/qa/desktop-1440-follow.png`
- `/cursor/stores/self/artifacts/qa/desktop-1440-category.png`
- `/cursor/stores/self/artifacts/qa/desktop-1440-shatin-open.png`
- `/cursor/stores/self/artifacts/qa/desktop-1440-disclaimer.png`
- `/cursor/stores/self/artifacts/qa/mobile-390-follow.png`
- `/cursor/stores/self/artifacts/qa/mobile-390-category.png`
- `/cursor/stores/self/artifacts/qa/mobile-390-detail.png`
- `/cursor/stores/self/artifacts/qa/mobile-400-follow.png`
- `/cursor/stores/self/artifacts/qa/mobile-400-category.png`
- Preflight baseline used for the lossless text compare: `/cursor/stores/self/artifacts/preflight/baseline.json` and `PREFLIGHT.md`

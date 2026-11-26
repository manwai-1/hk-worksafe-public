# BUILD_HANDOFF — QA fix round 1 candidate, not a PASS

Builder revision after the independent VETO. This is not a completion certificate and not an independent re-audit. QA rounds remain 0 of 2 until that re-audit. No auditor was contacted from this run.

## Source

| Item | Value |
| --- | --- |
| Repository | https://github.com/manwai-1/hk-worksafe-public |
| Base `main` | `a9c4e91c0ae9922b26406352a779ad67096f7db1` |
| Previous candidate | `7521c73dfd95707e61d2ca1639ca44e40a8fb0e8` |
| Previous app commit | `37708c54fceabf5d9ddada358dadca92d9ed1dbb` |
| This fix commit | `58d05c40c9f0cd7dc4b91a3de200cab06eebdb80` |
| Branch | `cursor/preview-four-fixes-661e` |
| Pull request | https://github.com/manwai-1/hk-worksafe-public/pull/4 |
| Candidate to fetch | The branch tip that contains this updated handoff. It is the child of the fix commit and does not change the app. The agent-store copy of this file records that tip SHA. |
| Controlling spec | DESIGN.md §5, SHA256 `18d4d86b32504c181ac2e25c4e56cfe59155acf3b6e1f7d88d1737d9b71fd833` (not edited) |

Fetch:

```bash
git fetch origin cursor/preview-four-fixes-661e
git checkout cursor/preview-four-fixes-661e
git rev-parse HEAD
npm ci && npm test && npm run build && npm run preview
```

Loopback preview: `http://127.0.0.1:4173/hk-worksafe-public/`. That address is not public. This handoff does not claim the owner opened it.

## Publication

`.github/workflows/pages.yml` still runs only on `push` to `main` and `workflow_dispatch`. This update was not pushed to `main`. No Pages, Vercel, Cursor Apps, tunnel, or sharing change.

## Unchanged hashes

| File | SHA-256 |
| --- | --- |
| `src/data/register.json` | `2329dce91c149bf905f47fb89eb7e4368ca4bbe0aa631979d3d509ebff625f10` |
| `sources/REGISTER.md` | `ea779e9ffd39ca76afaef3259084492ad5ef7d0c54a0c6901a07ef3571a4a6c5` |
| `sources/ZH_OFFICIAL_SUMMARIES.md` | `ca092029229f5bfe5a44ce0a64bb98be9b2be397abdc36e5b3e807261c49aa0f` |
| `sources/presentation.json` | `b966c01d1990cd458243f4c41e7e3c5dddb2e8854907e8bc5b856ac85aba139a` |
| `package-lock.json` | `27e50d8937e0ea16416713e985d398e4976572c1a835b4456a3758b0c74823d3` |
| `package.json` | `7a313f4c49518c11dbf1e7a4ac95a906e41a7b7b1e66d751a0e64123a1bebd53` |

## Authorized changes

1. `--muted` is `#637289`. `--accent` remains `#3b82f6`. `--accent-deep` remains `#1d4ed8`. `--bg` remains `#f4f7fb`.
2. Selected tab, segmented pill (type pills, category pills, and 其後發展 status pills share `.segmented button.is-on`), and current page number (`.quiet.is-on`) use `background: var(--accent-deep)`. Selected count stays `#dbeafe`. Charts, series `#3B82F6`, links, focus outline, and unselected fills were not recolored.
3. `LinkText` now uses `linkSegments` in `src/lib/links.ts`. The match stops before a fullwidth `（` or `）`, then the existing trailing-punctuation trim still runs. Official sentences and `register.json` were not edited. The intentional citation `https://www.labour.gov.hk/eng/public/safety_hints_20261105.htm` is unchanged.

S1–S4 behavior from the previous candidate is otherwise intact. Header middle dot, caption `加注`, disclaimer sentences, order, and 16 links are unchanged. No T6 state repair, no hash router, no new breakpoint.

## Commands

`npm test` passed. `npm run build` passed (Vite 7.3.8, 41 modules, `index-CD5EHZtZ.js`, `index-BMa0_K3p.css`). There is no lint script.

## Browser

Headless Chrome, devicePixelRatio 1.

| Viewport | innerWidth × innerHeight | page overflow |
| --- | --- | --- |
| Desktop | 1440 × 1094 | 0 |
| Mobile | 390 × 985 | 0 |
| Regression | 400 × 900 | 0 |
| Switch | 860 × 900 stacked; 861 × 900 table | 0 |

Computed contrast from rendered styles (WCAG relative luminance):

| Pair | Ratio |
| --- | --- |
| Eyebrow `--muted #637289` on `--bg #f4f7fb` | 4.55:1 |
| Muted chart cue `#637289` on white | 4.89:1 |
| Selected tab white on `#1d4ed8` | 6.70:1 |
| Selected type pill white on `#1d4ed8` | 6.70:1 |
| Current page number white on `#1d4ed8` | 6.70:1 |
| Selected count `#dbeafe` on `#1d4ed8` | 5.49:1 |
| Chart bar fill | `rgb(59, 130, 246)` (`--accent` unchanged) |
| Link text | `#1d4ed8` on white, 6.70:1 |
| Focus outline | `rgb(59, 130, 246) solid 2px` (`--accent` unchanged) |

Live Chinese-update hrefs:

| Record | href | HTTP |
| --- | --- | --- |
| `2026-10-07-tungchung` | `https://www.labour.gov.hk/tc/public/safety_hints_20261007.htm` | 200 |
| `2026-11-05-shatin` | `https://www.labour.gov.hk/tc/news/work_safety_alert_2026.htm` | 200 |
| Same Sha Tin update, unchanged citation | `https://www.labour.gov.hk/eng/public/safety_hints_20261105.htm` | 404, left as written |

Console errors: 0. Failed document/asset responses: 0. No `<img>` elements. Inline SVG remains.

Smoke: T1 `顯示 6 / 85 筆紀錄。`; T2 empty sentence and `0 / 85`; T3 reset `顯示 85 / 85 筆紀錄。`; T5 page 6 has 10 rows; T6 category 查看 opens `僱主因違反安全法例被判罰款` with `收起詳情` and `aria-expanded="true"`; T7 English title appears when checked. At 390 the recent title is 290px wide, 2 lines, and 查看 is 55×44. Disclaimer still has 10 headings and 16 links. Sticky tabs stay at visual top 0. With reduced motion, `scroll-behavior` is `auto`. A separate check of 回到頂部 reached `scrollY` 0. First Tab still lands on the skip link.

## Preview on this machine

`npm run preview` listens on `127.0.0.1:4173` and served this build. Owner access is the native forwarded port only.

## Limits

`致命意外` is still a table at narrow widths. Follow and category local state still reset on tab change. Cold hashes still do not route. CJK glyphs on this machine use the environment fallback face. This is not an overall AA certificate for every glyph; the veto pairs that were authorized were remeasured and passed. QA rounds used: 0 of 2 until independent re-audit.

## Evidence

- `/cursor/stores/self/artifacts/qa-round1/verify.json`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-top.png`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-pills.png`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-tungchung.png`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-shatin.png`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-category.png`
- `/cursor/stores/self/artifacts/qa-round1/desktop-1440-disclaimer.png`
- `/cursor/stores/self/artifacts/qa-round1/mobile-390-top.png`
- `/cursor/stores/self/artifacts/qa-round1/mobile-390-recent.png`
- `/cursor/stores/self/artifacts/qa-round1/mobile-390-category.png`
- `/cursor/stores/self/artifacts/qa-round1/mobile-390-pills.png`
- `/cursor/stores/self/artifacts/qa-round1/mobile-390-tungchung.png`

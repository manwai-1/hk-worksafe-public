# Data sync contract

This repository has no HTTP API. The contract is a GitHub Actions workflow that copies a verified register snapshot onto `main` only when the diff is safe to publish.

Official-source checking stays outside this repo. The workflow does not fetch government sites, does not invent titles, summaries, ids, or pattern groups, and does not replace `.github/workflows/pages.yml`.

## Input

A verifier pushes a commit to the branch `incoming/verified`. These three files are read together; any other files on the branch are ignored:

| File | Role |
| --- | --- |
| `sources/REGISTER.md` | English register, including the `**Coverage:**` line and every record under `## Records` |
| `sources/ZH_OFFICIAL_SUMMARIES.md` | Official Chinese summaries, cutoff, coverage, record-count line, and `ZH source status` |
| `sources/presentation.json` | Stable `id`, English title, source links, `patternGroups`, `followThreads`, `noParticulars` |

The same record occupies the same index in all three files. Identity is `presentation.records[].id`. The workflow never mints an id. A new id must match `^[a-z0-9][a-z0-9-]*$`. Renaming an id is a removal plus an addition, which is not auto-merged.

Which commit is read:

| Event | Snapshot |
| --- | --- |
| `push` to `incoming/verified` | That push’s commit, `github.sha`. A later push does not replace it for the run already started. |
| `schedule` | The current tip of `incoming/verified`. If that branch does not exist, the run exits 0. |
| `workflow_dispatch` | Input `snapshot_ref`, default `incoming/verified`. A missing ref fails the job. |

GitHub starts the push run from the workflow file in the pushed commit. `incoming/verified` therefore has to contain `.github/workflows/data-sync.yml` (create it from `main` after this workflow is on `main`, and do not delete that file). The job checks out `main` and then reads the snapshot commit. Keep the workflow file on that branch the same as `main`.

Line endings are normalized to LF before comparison. A CRLF copy of an unchanged snapshot is `none`.

## When it runs

| Trigger | Implemented in | Owner setting |
| --- | --- | --- |
| `02:00 UTC` and `10:00 UTC` (10:00 and 18:00 Hong Kong, no daylight saving) | `.github/workflows/data-sync.yml` | One hour after the 09:00 and 17:00 HKT official scans, so a morning snapshot is not left until evening. GitHub may start a cron late. |
| `push` to `incoming/verified` | same file | The branch must contain this workflow file, as above. |
| Actions → 資料同步 → Run workflow, with `snapshot_ref` | same file | Write access to the repo |

## Classification

Records are compared by id. A dated update line on an existing record is a modification, not an add.

| Kind | Meaning | Plan |
| --- | --- | --- |
| `none` | Parsed snapshot matches `main` | Exit 0. No commit. |
| `add` | New ids only. Existing bodies, relative order, pattern labels, and non-scan prose are unchanged. | Publish after CI. |
| `scan-time` | Only scan metadata changed. | Publish after CI. |
| `modify` | An existing record, its order, its links, its pattern, its follow thread, or non-scan prose changed, or a record was removed. | Draft pull request. No auto-merge. |
| `mixed` | At least one new id and at least one modification or removal. | Draft pull request. The body lists both. No auto-merge. |
| `invalid` | The snapshot cannot be assembled (count mismatch, missing id, title or type mismatch, source URL missing from `presentation.json`, record with no pattern group, bad JSON, missing cutoff). | Exit 1. No commit and no pull request. |

Scan metadata, which is not an item modification:

- the whole `**Coverage:**` line in `REGISTER.md` (coverage range, last routine scan, last initial scan, last backfill)
- `**資料截止時間：**` and `**涵蓋範圍：**`
- the preamble date in `並於YYYY-MM-DD 香港時間讀取核對`
- the `**紀錄數目：**` line, which must still state the real total and the real per-type counts or the snapshot is `invalid`
- each record’s `ZH source status` fetch stamp

Inserting a new record while leaving the previous ids in the same order is `add`. Swapping two existing ids is `modify`. A new follow thread whose ids are all new can stay on the `add` path. Changing a thread that already contains an existing id is `modify`. A new pattern-group label is `modify`.

Comparison uses the raw record text that would be written, not only the fields the parser keeps. Text before the first field, an earlier duplicate field, or any other raw change to an existing record is `modify` (or `mixed` when new records are also present), even if the parsed summary is unchanged and the cutoff also moved. The only record-local text that may change on the `scan-time` path is `ZH source status`.

The `**紀錄數目：**` line is required. If it is missing, or it states a total without the per-type counts, the snapshot is `invalid`: exit 1 and no pull request. A complete line whose numbers match but whose surrounding prose changed is not scan metadata; together with a cutoff change it is still `modify` and a draft.

An incident, prosecution, or alert whose month is outside `CHART_MONTHS` in `src/lib/period.ts` is not auto-merged. The kind may still be `add`, but the plan is a draft. Extending the chart is a code change on that draft; this workflow does not edit `period.ts`.

## Scan-time choice

Scan-time snapshots are applied and published. They are not dropped.

The public cutoff is `HEADER_LINE` and `CUTOFF` in `src/content.ts`. On `scan-time`, `add`, `modify`, and `mixed`, the workflow copies the three source files, regenerates `src/data/register.json`, and rewrites only those two strings:

- `HEADER_LINE` is `資料截止：{資料截止時間} · 收錄 {N} 筆`, with `N` taken from the snapshot’s record count.
- For `scan-time`, `CUTOFF` keeps the sentence that the routine scan found no new incident, prosecution, alert, ordinance/regulation, code of practice, or guidance, and uses the snapshot’s coverage line.
- For `add`, the sentence states how many records were added.
- For `modify` and `mixed`, the sentence states the added, changed, and removed counts and that they await review.

`SCOPE_PARAGRAPHS`, the unused `CALLOUT`, and `README.md` are left as written. They are historical prose, not the live cutoff.

The register caption uses `RECORDS.length`, so an add-only publish does not leave a hardcoded total of 85.

## Merge rules

Publish (`add` with no chart-month block, or `scan-time`):

1. Run `npm test` and `npm run build` on the snapshot branch.
2. If either fails, do not push and exit 1.
3. Push `sync/data-<digest12>-<suffix>`, open a pull request into `main`, and enable squash auto-merge.
4. After the pull request is merged, dispatch the existing `pages.yml` workflow with `workflow_dispatch`.

A push made with the default `GITHUB_TOKEN` does not trigger `pages.yml`’s `on: push`. The dispatch uses the workflow file that is already on `main`. This repository’s Pages deploy steps are not edited.

Draft (`modify`, `mixed`, or a chart-month block):

1. Run the same CI commands and record the result in the pull request body.
2. Open a draft pull request. Do not enable auto-merge, do not request reviewers, and do not mention anyone.

Idempotency:

- The snapshot digest is the SHA-256 of the three LF-normalized files. The pull request body contains `Snapshot-Digest: <hex>`.
- Auto-merge and the Pages dispatch run only for a pull request that this repository opened from `sync/data-<first 12 hex>-…`, whose head is in this repository, and whose three source files hash to that same digest. A digest string in any other pull request, including another repository or an unrelated branch, is ignored.
- For `modify`, `mixed`, and a chart-month block, the run still opens or updates the draft on that sync branch and does not auto-merge, even if some other pull request body already contains the digest.
- A non-draft publish pull request that passes the checks above is offered to auto-merge again on the next run. Drafts are updated in place and are not auto-merged.
- After merge, the next run classifies `none`.
- If `main` was merged and Pages was not dispatched, the next run sees a `sync:` commit with no Pages run for that SHA and dispatches `pages.yml` once.

Failure notification is the failed Actions run. The workflow does not send mail, Slack, or review requests.

## Local commands

```bash
node scripts/sync-run.mjs --self-check
node scripts/sync-run.mjs --current-dir <repo> --incoming-dir <repo>
node scripts/sync-classify.test.mjs
```

`node scripts/sync-run.mjs --push` exits immediately unless `GITHUB_ACTIONS=true`. It is the entrypoint of the workflow, not a local publish command.

## Implemented here vs configured in GitHub

Implemented in this repository:

- `.github/workflows/data-sync.yml` (10:00 and 18:00 HKT schedule, push to `incoming/verified`, manual dispatch, permissions `contents: write`, `pull-requests: write`, `actions: write`)
- classification, apply, and tests in `scripts/lib/register-sources.mjs`, `scripts/sync-run.mjs`, and `scripts/sync-classify.test.mjs`
- data-build checks that follow the source files instead of a fixed total of 85, fixed type counts, or 39 source notes
- `.github/workflows/pages.yml` left unchanged

No `.env.example`. There is no secret. `GITHUB_TOKEN` is the token Actions already provides. `SNAPSHOT_REF` is the workflow input above, not an environment secret.

The owner still has to set, after this pull request is merged:

1. Settings → Actions → General → Workflow permissions → Read and write permissions. A repository locked to read-only ignores the write permissions in the workflow file.
2. Settings → General → Pull Requests → Allow auto-merge. Without it, an add-only run opens the pull request, fails, and retries on the next schedule.
3. Branch protection on `main` must not require a review for unattended add-only merges. This workflow does not use an admin bypass. A required review leaves the pull request open and fails the wait; the next run retries.
4. Create nothing until a verifier is ready. The verifier needs permission to push `incoming/verified`, and that branch must contain this workflow file so a push starts the sync. This pull request does not create that branch and does not run the workflow. The schedule on `main` still exits 0 while the branch is absent.

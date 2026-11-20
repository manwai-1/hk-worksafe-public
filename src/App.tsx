import { useEffect, useMemo, useState } from "react";
import { Charts } from "./components/Charts";
import { FollowUp } from "./components/FollowUp";
import { PatternSection, RegisterSection } from "./components/RegisterSection";
import { CALLOUT, CUTOFF_LEAD, INDEX_SOURCES, SCOPE_PARAGRAPHS, TYPE_LABEL } from "./content";
import { BY_ID, RECORDS, data, scrollToId } from "./data";
import type { RecType } from "./types";

const TYPE_ORDER: RecType[] = ["incident", "prosecution", "alert", "guidance", "ordinance/regulation", "code of practice"];

export default function App() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);
  const [patternKey, setPatternKey] = useState(data.patternGroups[0]?.key ?? "");

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!BY_ID[id]) return;
    setOpenedId(id);
    setJumpNonce((nonce) => nonce + 1);
  }, []);

  const typeCounts = useMemo(() => {
    const tally = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0])) as Record<RecType, number>;
    for (const record of RECORDS) tally[record.type] += 1;
    return tally;
  }, []);

  function resetFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
    setMonthFilter("all");
    setQuery("");
  }

  function jumpToRecord(id: string) {
    resetFilters();
    setOpenedId(id);
    setJumpNonce((nonce) => nonce + 1);
    const next = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", next);
  }

  return (
    <>
      <a className="skip" href="#follow-up">
        跳至關注與跟進
      </a>
      <header className="masthead">
        <p className="kicker">Hong Kong OSH Register</p>
        <h1>香港職安登記冊</h1>
        <p className="lede">
          獨立編列的香港職業安全及健康官方紀錄資料匯編，供掃描關注、對照跟進與核對來源。涵蓋 2025年11月19日至2026年11月20日。
        </p>
        <p className="cutoff">{CUTOFF_LEAD}</p>
      </header>

      <main>
        <aside className="callout">
          <p className="callout-lead">資料匯編</p>
          <p>{CALLOUT}</p>
        </aside>

        <dl className="metrics">
          <div>
            <dt>本冊紀錄</dt>
            <dd>
              <strong>{RECORDS.length}</strong>
              <span>2025年11月19日至2026年11月20日</span>
            </dd>
          </div>
          {TYPE_ORDER.map((type) => (
            <div key={type}>
              <dt>{TYPE_LABEL[type]}</dt>
              <dd>
                <strong>{typeCounts[type]}</strong>
                <span>{type}；全部 official</span>
              </dd>
            </div>
          ))}
        </dl>

        <Charts groups={data.patternGroups} />

        <nav className="toc" aria-label="本頁三層">
          <p>本頁三層</p>
          <ol>
            <li>
              <a href="#follow-up">關注與跟進</a>
            </li>
            <li>
              <a href="#patterns">形態歸類</a>
            </li>
            <li>
              <a href="#register">完整登記冊</a>
            </li>
          </ol>
        </nav>

        <FollowUp threads={data.followThreads} noParticulars={data.noParticulars} onOpen={jumpToRecord} />
        <PatternSection groups={data.patternGroups} patternKey={patternKey} onPattern={setPatternKey} onOpen={jumpToRecord} />

        <section id="scope" className="block">
          <details>
            <summary role="heading" aria-level={2}>
              編列說明
            </summary>
            {SCOPE_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </details>
        </section>

        <RegisterSection
          yearFilter={yearFilter}
          monthFilter={monthFilter}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          query={query}
          openedId={openedId}
          jumpNonce={jumpNonce}
          onYear={setYearFilter}
          onMonth={setMonthFilter}
          onType={setTypeFilter}
          onStatus={setStatusFilter}
          onQuery={setQuery}
          onReset={resetFilters}
        />
      </main>

      <footer className="colophon">
        <p>{CUTOFF_LEAD}此冊是資料匯編。此冊不是政府刊物，亦不是法律意見。</p>
        <p>圖表只計本冊編列的紀錄數目，不是政府官方統計。職安警示與安全提示是兩種不同的勞工處項目，本冊不予混用。</p>
        <h2>索引與專頁</h2>
        <ul className="links">
          {INDEX_SOURCES.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer">
                {source.title}
                <span className="sr-only">（在新分頁開啟）</span>
              </a>
            </li>
          ))}
        </ul>
      </footer>

      <nav className="dock" aria-label="頁內位置">
        <button type="button" onClick={() => scrollToId("follow-up")}>
          關注與跟進
        </button>
        <button type="button" onClick={() => scrollToId("patterns")}>
          形態歸類
        </button>
        <button type="button" onClick={() => scrollToId("register")}>
          完整登記冊
        </button>
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            })
          }
        >
          回到頂部
        </button>
      </nav>
    </>
  );
}

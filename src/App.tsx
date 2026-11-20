import { useEffect, useState } from "react";
import { Charts } from "./components/Charts";
import { FollowLayer } from "./components/FollowLayer";
import { PatternLayer } from "./components/PatternLayer";
import { RegisterLayer } from "./components/RegisterLayer";
import {
  CHART_CAPTION,
  CUTOFF,
  HEADER_LINE,
  INDEX_SOURCES,
  LAYER_NOTE,
  RECORD_RULE,
  SCOPE_PARAGRAPHS,
  TYPE_LABEL,
  TYPE_NOTE,
} from "./content";
import { RECORDS, scrollToId } from "./data";
import type { RecType } from "./types";

type LayerKey = "follow-up" | "patterns" | "register";

const TYPE_ORDER: RecType[] = ["incident", "prosecution", "alert", "guidance", "ordinance/regulation", "code of practice"];
const PAGE_SIZE = 15;

export default function App() {
  const [layer, setLayer] = useState<LayerKey>("follow-up");
  const [showTypeNote, setShowTypeNote] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);
  const [layerNonce, setLayerNonce] = useState(0);

  const counts = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0])) as Record<RecType, number>;
  for (const record of RECORDS) counts[record.type] += 1;

  function resetFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
    setMonthFilter("all");
    setQuery("");
    setPage(1);
  }

  function jumpToRecord(id: string) {
    resetFilters();
    setLayer("register");
    const index = RECORDS.findIndex((record) => record.id === id);
    setPage(index >= 0 ? Math.floor(index / PAGE_SIZE) + 1 : 1);
    setOpenedId(id);
    setJumpNonce((nonce) => nonce + 1);
  }

  function goToLayer(next: LayerKey) {
    setLayer(next);
    setLayerNonce((nonce) => nonce + 1);
  }

  useEffect(() => {
    if (!openedId || layer !== "register") return;
    scrollToId(openedId);
  }, [openedId, jumpNonce, layer]);

  useEffect(() => {
    if (layerNonce === 0) return;
    scrollToId(layer);
  }, [layer, layerNonce]);

  return (
    <>
      <a className="skip" href="#follow-up">
        跳至關注與跟進
      </a>
      <header className="masthead">
        <p className="kicker">Hong Kong OSH Register</p>
        <h1>香港職安登記冊</h1>
        <div className="cutoff-row">
          <p>{HEADER_LINE}</p>
          <button type="button" className="quiet" aria-expanded={showTypeNote} onClick={() => setShowTypeNote((value) => !value)}>
            說明
          </button>
        </div>
        {showTypeNote ? (
          <aside className="note-card">
            <p className="note-lead">說明</p>
            <p>{TYPE_NOTE}</p>
          </aside>
        ) : null}
      </header>
      <main>
        <details className="disclaimer">
          <summary>免責說明</summary>
          <div className="disclaimer-body">
            <p>
              {CUTOFF} 此冊是資料匯編，不是政府刊物，亦不是法律意見。
            </p>
            <p>{CHART_CAPTION}</p>
            <p>{LAYER_NOTE}</p>
            {SCOPE_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            <p>{RECORD_RULE}</p>
            <h2>來源網址</h2>
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
          </div>
        </details>

        <section className="kpi" aria-label="本冊紀錄數目">
          <div className="kpi-total">
            <strong>{RECORDS.length}</strong>
            <span>總紀錄</span>
          </div>
          <div className="kpi-micro">
            {TYPE_ORDER.slice(0, 4).map((type) => (
              <div key={type}>
                <strong>{counts[type]}</strong>
                <span>{TYPE_LABEL[type]}</span>
              </div>
            ))}
            <div>
              <strong>
                {counts["ordinance/regulation"]}／{counts["code of practice"]}
              </strong>
              <span>法例／規例、工作守則</span>
            </div>
          </div>
        </section>

        <Charts />

        <div className="layer-tabs" role="tablist" aria-label="閱讀層">
          {(
            [
              ["follow-up", "關注與跟進"],
              ["patterns", "按類別查看"],
              ["register", "完整登記冊"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={layer === value}
              aria-controls={value}
              className={layer === value ? "is-on" : ""}
              onClick={() => goToLayer(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {layer === "follow-up" ? <FollowLayer onOpen={jumpToRecord} /> : null}
        {layer === "patterns" ? <PatternLayer onOpen={jumpToRecord} /> : null}
        {layer === "register" ? (
          <RegisterLayer
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            query={query}
            showEnglish={showEnglish}
            page={page}
            openedId={openedId}
            onYear={(value) => {
              setYearFilter(value);
              setPage(1);
            }}
            onMonth={(value) => {
              setMonthFilter(value);
              setPage(1);
            }}
            onType={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            onStatus={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            onQuery={(value) => {
              setQuery(value);
              setPage(1);
            }}
            onEnglish={setShowEnglish}
            onPage={setPage}
            onToggle={(id) => setOpenedId(openedId === id ? null : id)}
            onReset={resetFilters}
          />
        ) : null}
      </main>
      <button
        type="button"
        className="to-top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          })
        }
      >
        回到頂部
      </button>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type DailySales = { date: string; sales: number };
type Store = {
  store: string;
  period: string;
  latestDate: string;
  latestSales: number;
  periodSales: number;
  customers: number;
  predicted: number;
  dataStatus: string;
};
type DashboardData = {
  source: string;
  asOf: string;
  modelStatus: string;
  quickC: {
    period: string;
    sales: number;
    cogs: number;
    salesMargin: number;
    groceryPurchase: number;
    differenceMargin: number;
    daily: DailySales[];
  };
  stores: Store[];
  mercury: {
    total: number;
    completed: number;
    inProgress: number;
    waiting: number;
    statusConflicts: number;
  };
  alerts: string[];
};

type Tab = "overview" | "sales" | "mercury" | "quality";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1Jpz7Oydr8VbZ-9-HPwL3_K_dIINiN3m_HORQieE8iGc/edit";
const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales reports" },
  { id: "mercury", label: "Mercury tasks" },
  { id: "quality", label: "Data quality" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLivePayload(payload: unknown, fallback: DashboardData): DashboardData {
  if (!payload || typeof payload !== "object") return fallback;
  const root = payload as Record<string, unknown>;

  if (root.quickC && root.mercury) {
    return { ...fallback, ...(root as Partial<DashboardData>), source: "google-sheets-live" };
  }

  const possibleData = root.data;
  const values = possibleData && typeof possibleData === "object" && !Array.isArray(possibleData)
    ? (possibleData as Record<string, unknown>)
    : root;
  const pct = (key: string, current: number) => {
    const raw = values[key];
    if (raw == null) return current;
    const parsed = toNumber(raw, current);
    return typeof raw === "string" && raw.includes("%") ? parsed / 100 : parsed;
  };
  const stores = fallback.stores.map((store) => {
    const prefix = store.store === "Plant City" ? "plant" : store.store === "Inverness" ? "inverness" : "vape";
    return {
      ...store,
      latestSales: toNumber(values[`${prefix}_latest_sales`], store.latestSales),
      periodSales: toNumber(values[`${prefix}_period_sales`], store.periodSales),
    };
  });

  return {
    ...fallback,
    source: "google-sheets-live",
    asOf: String(values.as_of ?? fallback.asOf),
    modelStatus: String(values.model_status ?? fallback.modelStatus),
    quickC: {
      ...fallback.quickC,
      sales: toNumber(values.quickc_sales, fallback.quickC.sales),
      cogs: toNumber(values.quickc_cogs, fallback.quickC.cogs),
      salesMargin: pct("quickc_sales_margin", fallback.quickC.salesMargin),
      differenceMargin: pct("quickc_difference_margin", fallback.quickC.differenceMargin),
    },
    stores,
    mercury: {
      ...fallback.mercury,
      total: toNumber(values.mercury_total, fallback.mercury.total),
      completed: toNumber(values.mercury_completed, fallback.mercury.completed),
      inProgress: toNumber(values.mercury_in_progress, fallback.mercury.inProgress),
      waiting: toNumber(values.mercury_waiting, fallback.mercury.waiting),
      statusConflicts: toNumber(values.mercury_attention, fallback.mercury.statusConflicts),
    },
  };
}

function StoreCard({ store }: { store: Store }) {
  const ready = store.dataStatus === "Ready";
  return (
    <article className="store-card">
      <div className="card-top">
        <div><span className="card-label">{store.store}</span><small>{store.period}</small></div>
        <span className={ready ? "status good" : "status warn"}>{ready ? "Ready" : "Review"}</span>
      </div>
      <strong>{money.format(store.periodSales)}</strong>
      <p>Current source period sales</p>
      <dl className="store-details">
        <div><dt>Latest day</dt><dd>{moneyExact.format(store.latestSales)}</dd></div>
        <div><dt>Customers</dt><dd>{number.format(store.customers)}</dd></div>
        <div><dt>Forecast</dt><dd>{money.format(store.predicted)}</dd></div>
      </dl>
    </article>
  );
}

function DailyBars({ daily }: { daily: DailySales[] }) {
  const max = Math.max(...daily.map((row) => row.sales), 1);
  return (
    <div className="bar-chart" role="img" aria-label="Quick C daily sales from August 1 through August 15, 2026">
      {daily.map((row) => {
        const day = Number(row.date.slice(-2));
        return (
          <div className="bar-column" key={row.date} title={`${row.date}: ${moneyExact.format(row.sales)}`}>
            <span className="bar-value">{money.format(row.sales)}</span>
            <div className="bar-track"><i style={{ height: `${Math.max((row.sales / max) * 100, 8)}%` }} /></div>
            <small>{day}</small>
          </div>
        );
      })}
    </div>
  );
}

function Overview({ data, setTab }: { data: DashboardData; setTab: (tab: Tab) => void }) {
  const completion = data.mercury.total ? data.mercury.completed / data.mercury.total : 0;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow light">Executive overview</p>
          <h2>Store performance and team delivery, in one management view.</h2>
          <p className="lede">The reporting periods stay visible so January, May and August figures are never presented as a false like-for-like comparison.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => setTab("sales")}>Review sales</button>
            <button className="secondary-action" onClick={() => setTab("mercury")}>Review Mercury tasks</button>
          </div>
        </div>
        <div className="hero-metric">
          <span>Quick C sales</span><strong>{moneyExact.format(data.quickC.sales)}</strong><small>{data.quickC.period}</small>
          <div className="metric-rule" />
          <div className="metric-pair"><span>Sales margin</span><b>{percent.format(data.quickC.salesMargin)}</b></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div><p className="eyebrow">Sales reporting</p><h3>Store source snapshots</h3></div>
          <span className="notice">Periods differ — combined comparison disabled</span>
        </div>
        <div className="store-grid">{data.stores.map((store) => <StoreCard store={store} key={store.store} />)}</div>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="section-head compact"><div><p className="eyebrow">Mercury one</p><h3>Task performance</h3></div><b>{number.format(data.mercury.total)} tasks</b></div>
          <div className="task-meter" role="progressbar" aria-label="Mercury task completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(completion * 100)}><span style={{ width: `${completion * 100}%` }} /></div>
          <div className="task-stats">
            <div><strong>{data.mercury.completed}</strong><span>Completed</span></div>
            <div><strong>{data.mercury.inProgress}</strong><span>In progress</span></div>
            <div><strong>{data.mercury.waiting}</strong><span>Waiting</span></div>
          </div>
        </article>
        <article className="panel attention">
          <div className="section-head compact"><div><p className="eyebrow amber">Management checks</p><h3>{data.alerts.length} items need review</h3></div><span className="alert-dot" /></div>
          <ul>{data.alerts.slice(1).map((alert) => <li key={alert}>{alert}</li>)}</ul>
          <button className="text-action" onClick={() => setTab("quality")}>Open data-quality report →</button>
        </article>
      </section>
    </>
  );
}

function SalesReport({ data }: { data: DashboardData }) {
  return (
    <section className="report-page">
      <div className="page-intro"><div><p className="eyebrow light">Sales reporting</p><h2>Professional summaries without changing your source terminology.</h2></div><span className="notice">Source periods remain separate</span></div>
      <div className="kpi-grid four">
        <article><span>Quick C sales</span><strong>{moneyExact.format(data.quickC.sales)}</strong><small>{data.quickC.period}</small></article>
        <article><span>Calculated COGS</span><strong>{moneyExact.format(data.quickC.cogs)}</strong><small>Scanned Cost + Modifier Cost</small></article>
        <article><span>Sales margin</span><strong>{percent.format(data.quickC.salesMargin)}</strong><small>(Sales − COGS) ÷ Sales</small></article>
        <article><span>Difference margin</span><strong>{percent.format(data.quickC.differenceMargin)}</strong><small>Using Grocery Purchase</small></article>
      </div>
      <article className="panel chart-panel">
        <div className="section-head compact"><div><p className="eyebrow">Quick C summary</p><h3>Daily sales trend</h3></div><span className="period-chip">August 1–15, 2026</span></div>
        <DailyBars daily={data.quickC.daily} />
        <div className="chart-caption"><span>Day of August</span><span>Hover a bar for exact sales</span></div>
      </article>
      <div className="section-head sales-table-head"><div><p className="eyebrow">Three stores</p><h3>Latest available reporting periods</h3></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Store</th><th>Source period</th><th>Latest date</th><th>Latest daily sales</th><th>Period sales</th><th>Customers</th><th>Predicted month</th><th>Data status</th></tr></thead>
          <tbody>{data.stores.map((store) => (
            <tr key={store.store}><td><b>{store.store}</b></td><td>{store.period}</td><td>{store.latestDate}</td><td>{moneyExact.format(store.latestSales)}</td><td>{moneyExact.format(store.periodSales)}</td><td>{number.format(store.customers)}</td><td>{moneyExact.format(store.predicted)}</td><td><span className={store.dataStatus === "Ready" ? "status good" : "status warn"}>{store.dataStatus}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function MercuryReport({ data }: { data: DashboardData }) {
  const statuses = [
    { label: "Completed", value: data.mercury.completed, color: "green" },
    { label: "In progress", value: data.mercury.inProgress, color: "blue" },
    { label: "Waiting for response", value: data.mercury.waiting, color: "gold" },
  ];
  return (
    <section className="report-page">
      <div className="page-intro"><div><p className="eyebrow light">Mercury one</p><h2>Task monitoring for management follow-up.</h2></div><span className="period-chip">Master Task Tracker</span></div>
      <div className="kpi-grid four">
        <article><span>Total actual tasks</span><strong>{data.mercury.total}</strong><small>Serial-only rows excluded</small></article>
        <article><span>Completed</span><strong>{data.mercury.completed}</strong><small>{percent.format(data.mercury.completed / data.mercury.total)} completion</small></article>
        <article><span>Open work</span><strong>{data.mercury.inProgress + data.mercury.waiting}</strong><small>In progress + waiting</small></article>
        <article className="warning-kpi"><span>Status/date conflicts</span><strong>{data.mercury.statusConflicts}</strong><small>Needs team confirmation</small></article>
      </div>
      <div className="split-grid mercury-grid">
        <article className="panel">
          <div className="section-head compact"><div><p className="eyebrow">Workload status</p><h3>Task distribution</h3></div></div>
          <div className="status-bars">{statuses.map((status) => (
            <div className="status-row" key={status.label}><div><span>{status.label}</span><strong>{status.value}</strong></div><div className="status-track"><i className={status.color} style={{ width: `${(status.value / data.mercury.total) * 100}%` }} /></div></div>
          ))}</div>
        </article>
        <article className="panel attention">
          <p className="eyebrow amber">Management action</p><h3>Reconcile dates before using completion time.</h3>
          <p className="body-copy">Eight in-progress tasks already have a Completion Date, while two completed tasks are missing one. The tracker keeps those rows unchanged and flags them for confirmation.</p>
          <a className="text-action inline" href={SHEET_URL} target="_blank" rel="noreferrer">Open Mercury_Tasks in Google Sheets →</a>
        </article>
      </div>
      <article className="panel management-note">
        <p className="eyebrow">Recommended management report</p><h3>Use this order in every manual update</h3>
        <div className="report-steps">
          <div><b>01</b><span><strong>Headline</strong><small>Total, completed, open and waiting tasks.</small></span></div>
          <div><b>02</b><span><strong>Exceptions</strong><small>Overdue, blocked and status/date conflicts.</small></span></div>
          <div><b>03</b><span><strong>Next action</strong><small>Owner, action required and expected completion.</small></span></div>
        </div>
      </article>
    </section>
  );
}

function QualityReport({ data, connection }: { data: DashboardData; connection: "snapshot" | "live" | "error" }) {
  return (
    <section className="report-page">
      <div className="page-intro"><div><p className="eyebrow light">Data quality</p><h2>Known reporting gaps are visible, traceable and fixable.</h2></div><span className={data.modelStatus === "PASS" ? "status good" : "status warn"}>Model status: {data.modelStatus}</span></div>
      <div className="quality-grid">{data.alerts.map((alert, index) => (
        <article className="quality-card" key={alert}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{index === 0 ? "Comparison control" : index === 1 ? "Missing location" : index === 2 ? "Duplicate / missing dates" : "Task status conflict"}</h3><p>{alert}</p></div></article>
      ))}</div>
      <div className="split-grid connection-grid">
        <article className="panel">
          <p className="eyebrow">Safe website connection</p><h3>Only management-ready calculated values leave the Sheet.</h3>
          <div className="flow-line"><span>Private Google Sheet</span><i>→</i><span>Website_Export</span><i>→</i><span>Private endpoint</span><i>→</i><span>Dashboard</span></div>
          <p className="body-copy">Raw sales rows, individual tasks, expenses and source registers remain private. The website reads only approved summary values.</p>
        </article>
        <article className="panel connection-status">
          <p className="eyebrow">Connection status</p>
          <div className="connection-badge"><i className={connection === "live" ? "online" : connection === "error" ? "issue" : "snapshot"} /><span>{connection === "live" ? "Live Google Sheets data" : connection === "error" ? "Snapshot shown — live endpoint unavailable" : "Verified uploaded snapshot"}</span></div>
          <p>Data as of <b>{data.asOf}</b>. Keep the deployed site private before enabling real sales or task data.</p>
          <a className="secondary-link" href={SHEET_URL} target="_blank" rel="noreferrer">Open master Google Sheet</a>
        </article>
      </div>
    </section>
  );
}

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [connection, setConnection] = useState<"snapshot" | "live" | "error">("snapshot");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const fallbackUrl = new URL("dashboard-data.json", document.baseURI).toString();
      const fallbackResponse = await fetch(fallbackUrl, { cache: "no-store" });
      const fallback = (await fallbackResponse.json()) as DashboardData;
      const endpoint = document.querySelector<HTMLMetaElement>('meta[name="dashboard-data-url"]')?.content || "";
      if (!endpoint) { if (active) setData(fallback); return; }
      try {
        const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error("Live data unavailable");
        const live = normalizeLivePayload(await response.json(), fallback);
        if (active) { setData(live); setConnection("live"); }
      } catch {
        if (active) { setData(fallback); setConnection("error"); }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const sourceLabel = useMemo(() => connection === "live" ? "Live Google Sheets" : "Uploaded snapshot", [connection]);
  if (!data) return <main className="loading-shell"><div className="loading-card"><span className="brandmark">M1</span><p>Preparing management dashboard…</p></div></main>;

  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => setTab("overview")} aria-label="Return to dashboard overview"><span className="brandmark">M1</span><span><small>Management reporting portal</small><strong>Sales & Mercury Operations</strong></span></button>
        <nav aria-label="Dashboard sections">{tabs.map((item) => <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
        <div className="header-actions"><div className="source-state"><i className={connection === "live" ? "online" : "snapshot"} /><span>{sourceLabel}<small>{data.asOf}</small></span></div><button className="print-action" onClick={() => window.print()}>Print report</button></div>
      </header>
      <div className="privacy-strip"><span>Private management reporting</span><p>Sales and Mercury summaries only. No inventory or audit modules.</p><a href={SHEET_URL} target="_blank" rel="noreferrer">Open Google Sheet</a></div>
      {tab === "overview" && <Overview data={data} setTab={setTab} />}
      {tab === "sales" && <SalesReport data={data} />}
      {tab === "mercury" && <MercuryReport data={data} />}
      {tab === "quality" && <QualityReport data={data} connection={connection} />}
      <footer><span>Operations Management Master</span><p>Prepared from eight uploaded manual reports · Source terminology preserved</p><span>Version 1.0</span></footer>
    </main>
  );
}

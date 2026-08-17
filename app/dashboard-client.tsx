"use client";

import { useEffect, useMemo, useState } from "react";

type DailyRecord = {
  date: string; store: string; day: string; insideSales: number; customers: number; itemCount: number;
  averageTicket: number; fuelGallons: number; fuelSales: number; lotterySales: number; voidLines: number;
  voidTickets: number; errorCorrects: number; currentMargin: number | null; buySell: number | null;
  reasoning: string; dataStatus: string;
};
type Store = { store: string; period: string; latestDate: string; latestSales: number; periodSales: number; customers: number; predicted: number; dataStatus: string };
type FuelPrice = { date: string; store: string; grade: string; cost: number; nearbyLow: number; nearbyHigh: number; cashPrice: number; cardPrice: number; cashMargin: number; cardMargin: number };
type MoneyMovement = { date: string; store: string; type: string; category: string; amount: number };
type DashboardData = {
  source: string; asOf: string; modelStatus: string; dailyRecords: DailyRecord[]; stores: Store[];
  quickC: { period: string; sales: number; cogs: number; salesMargin: number; groceryPurchase: number; differenceMargin: number; daily: { date: string; sales: number; scannedCost: number; modifierCost: number; groceryPurchase: number }[] };
  fuelPrices: FuelPrice[]; moneyMovements: MoneyMovement[];
  mercury: { total: number; completed: number; inProgress: number; waiting: number; statusConflicts: number; missingCompletionDate: number; missingTicketIds: number };
  alerts: string[];
};
type Tab = "overview" | "explorer" | "costs" | "expenses" | "mercury" | "quality";
type Metric = "insideSales" | "customers" | "averageTicket" | "fuelSales" | "fuelGallons" | "lotterySales" | "voidLines";
type GroupBy = "daily" | "weekly" | "monthly" | "store";
type ViewType = "trend" | "table" | "cards";
type CompareMode = "none" | "previous" | "week" | "year";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1Jpz7Oydr8VbZ-9-HPwL3_K_dIINiN3m_HORQieE8iGc/edit";
const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "explorer", label: "Sales explorer" },
  { id: "costs", label: "Fuel & costs" }, { id: "expenses", label: "Purchases & expenses" },
  { id: "mercury", label: "Mercury tasks" }, { id: "quality", label: "Data quality" },
];
const metrics: { id: Metric; label: string; format: "money" | "number" | "decimal" }[] = [
  { id: "insideSales", label: "Inside Sales", format: "money" }, { id: "customers", label: "Customer Count", format: "number" },
  { id: "averageTicket", label: "Average Ticket", format: "money" }, { id: "fuelSales", label: "Fuel Sales", format: "money" },
  { id: "fuelGallons", label: "Fuel Gallons", format: "decimal" }, { id: "lotterySales", label: "Lottery Sales", format: "money" },
  { id: "voidLines", label: "Void Lines", format: "number" },
];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

const parseDate = (value: string) => new Date(`${value}T00:00:00Z`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (value: string, days: number) => { const date = parseDate(value); date.setUTCDate(date.getUTCDate() + days); return isoDate(date); };
const metricMeta = (metric: Metric) => metrics.find((item) => item.id === metric)!;
const formatValue = (metric: Metric, value: number) => metricMeta(metric).format === "money" ? moneyExact.format(value) : metricMeta(metric).format === "number" ? integer.format(value) : decimal.format(value);
const sumMetric = (rows: DailyRecord[], metric: Metric) => metric === "averageTicket"
  ? rows.reduce((sum, row) => sum + row.insideSales, 0) / Math.max(rows.reduce((sum, row) => sum + row.customers, 0), 1)
  : rows.reduce((sum, row) => sum + Number(row[metric] ?? 0), 0);

function groupKey(row: DailyRecord, groupBy: GroupBy) {
  if (groupBy === "store") return row.store;
  if (groupBy === "monthly") return `${row.date.slice(0, 7)} · ${row.store}`;
  if (groupBy === "weekly") {
    const date = parseDate(row.date); const day = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - day);
    return `Week of ${isoDate(date)} · ${row.store}`;
  }
  return `${row.date} · ${row.store}`;
}

function ReportControls({ store, setStore, startDate, setStartDate, endDate, setEndDate, metric, setMetric, groupBy, setGroupBy, compare, setCompare, view, setView }: {
  store: string; setStore: (v: string) => void; startDate: string; setStartDate: (v: string) => void; endDate: string; setEndDate: (v: string) => void;
  metric: Metric; setMetric: (v: Metric) => void; groupBy: GroupBy; setGroupBy: (v: GroupBy) => void; compare: CompareMode; setCompare: (v: CompareMode) => void; view: ViewType; setView: (v: ViewType) => void;
}) {
  return <section className="control-center" aria-label="Report filters">
    <div className="control-heading"><div><p className="eyebrow">Report control center</p><h2>Choose exactly what management wants to see</h2></div><span>All controls update the report below</span></div>
    <div className="control-grid">
      <label>Store<select value={store} onInput={(e) => setStore(e.currentTarget.value)}><option>All Stores</option><option>Plant City</option><option>Inverness</option><option>Vape Store</option></select></label>
      <label>Start date<input type="date" value={startDate} onInput={(e) => setStartDate(e.currentTarget.value)} /></label>
      <label>End date<input type="date" value={endDate} onInput={(e) => setEndDate(e.currentTarget.value)} /></label>
      <label>Measure<select value={metric} onInput={(e) => setMetric(e.currentTarget.value as Metric)}>{metrics.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <label>Group by<select value={groupBy} onInput={(e) => setGroupBy(e.currentTarget.value as GroupBy)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="store">Store total</option></select></label>
      <label>Compare with<select value={compare} onInput={(e) => setCompare(e.currentTarget.value as CompareMode)}><option value="none">No comparison</option><option value="previous">Previous period</option><option value="week">Same period − 7 days</option><option value="year">Same period last year</option></select></label>
    </div>
    <div className="view-switch" role="group" aria-label="View type">{(["trend", "table", "cards"] as ViewType[]).map((item) => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item === "trend" ? "Trend view" : item === "table" ? "Detailed table" : "Summary cards"}</button>)}</div>
  </section>;
}

function Overview({ data, setTab }: { data: DashboardData; setTab: (tab: Tab) => void }) {
  const totals = data.dailyRecords.reduce((acc, row) => ({ sales: acc.sales + row.insideSales, customers: acc.customers + row.customers, fuel: acc.fuel + row.fuelSales, lottery: acc.lottery + row.lotterySales }), { sales: 0, customers: 0, fuel: 0, lottery: 0 });
  const completion = data.mercury.completed / data.mercury.total;
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow light">Executive overview</p><h2>Three stores, sales reports and Mercury delivery in one portal.</h2><p className="lede">Every figure keeps its original reporting period visible. Use Sales Explorer for store, date, metric, grouping, comparison and view controls.</p><div className="hero-actions"><button className="primary-action" onClick={() => setTab("explorer")}>Open sales explorer</button><button className="secondary-action" onClick={() => setTab("mercury")}>Review Mercury tasks</button></div></div><div className="hero-metric"><span>Inside sales in supplied records</span><strong>{moneyExact.format(totals.sales)}</strong><small>66 unique store-day rows</small><div className="metric-rule" /><div className="metric-pair"><span>Mercury completion</span><b>{percent.format(completion)}</b></div></div></section>
    <section className="kpi-grid four overview-kpis"><article><span>Customers</span><strong>{integer.format(totals.customers)}</strong><small>Supplied source periods</small></article><article><span>Fuel sales</span><strong>{moneyExact.format(totals.fuel)}</strong><small>Plant City + Inverness</small></article><article><span>Lottery sales</span><strong>{moneyExact.format(totals.lottery)}</strong><small>Derived from running totals</small></article><article><span>Mercury open work</span><strong>{data.mercury.inProgress + data.mercury.waiting}</strong><small>{data.mercury.inProgress} in progress · {data.mercury.waiting} waiting</small></article></section>
    <section className="section-block"><div className="section-head"><div><p className="eyebrow">Source-period cards</p><h3>Latest available data for each store</h3></div><span className="notice">Periods differ — use filters before comparison</span></div><div className="store-grid">{data.stores.map((store) => <article className="store-card" key={store.store}><div className="card-top"><div><span className="card-label">{store.store}</span><small>{store.period}</small></div><span className="status warn">Review</span></div><strong>{moneyExact.format(store.periodSales)}</strong><p>Inside sales in supplied period</p><dl className="store-details"><div><dt>Latest day</dt><dd>{moneyExact.format(store.latestSales)}</dd></div><div><dt>Customers</dt><dd>{integer.format(store.customers)}</dd></div><div><dt>Forecast</dt><dd>{money.format(store.predicted)}</dd></div></dl></article>)}</div></section>
  </>;
}

function SalesExplorer({ data }: { data: DashboardData }) {
  const [store, setStore] = useState("All Stores"); const [startDate, setStartDate] = useState("2026-01-01"); const [endDate, setEndDate] = useState("2026-12-31");
  const [metric, setMetric] = useState<Metric>("insideSales"); const [groupBy, setGroupBy] = useState<GroupBy>("daily"); const [compare, setCompare] = useState<CompareMode>("none"); const [view, setView] = useState<ViewType>("trend");
  const filtered = useMemo(() => data.dailyRecords.filter((row) => (store === "All Stores" || row.store === store) && row.date >= startDate && row.date <= endDate), [data, store, startDate, endDate]);
  const grouped = useMemo(() => { const map = new Map<string, DailyRecord[]>(); filtered.forEach((row) => { const key = groupKey(row, groupBy); map.set(key, [...(map.get(key) ?? []), row]); }); return [...map].map(([label, rows]) => ({ label, value: sumMetric(rows, metric), rows })).sort((a, b) => a.rows[0].date.localeCompare(b.rows[0].date)); }, [filtered, groupBy, metric]);
  const current = sumMetric(filtered, metric);
  const comparison = useMemo(() => {
    if (compare === "none") return null;
    const length = Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86400000) + 1;
    const shift = compare === "previous" ? -length : compare === "week" ? -7 : -365;
    const compareStart = addDays(startDate, shift); const compareEnd = addDays(endDate, shift);
    const rows = data.dailyRecords.filter((row) => (store === "All Stores" || row.store === store) && row.date >= compareStart && row.date <= compareEnd);
    return { label: `${compareStart} to ${compareEnd}`, value: sumMetric(rows, metric), count: rows.length };
  }, [compare, data, endDate, metric, startDate, store]);
  const max = Math.max(...grouped.map((row) => row.value), 1); const meta = metricMeta(metric);
  return <section className="report-page">
    <ReportControls {...{ store, setStore, startDate, setStartDate, endDate, setEndDate, metric, setMetric, groupBy, setGroupBy, compare, setCompare, view, setView }} />
    <div className="explorer-summary"><article><span>Selected {meta.label}</span><strong>{formatValue(metric, current)}</strong><small>{filtered.length} source rows · {startDate} to {endDate}</small></article><article><span>Comparison</span><strong>{comparison?.count ? formatValue(metric, comparison.value) : "Not available"}</strong><small>{comparison ? `${comparison.label} · ${comparison.count} matching rows` : "Choose a comparison period"}</small></article><article><span>Variance</span><strong className={comparison?.count && current - comparison.value < 0 ? "negative" : "positive"}>{comparison?.count ? formatValue(metric, current - comparison.value) : "—"}</strong><small>{comparison?.count && comparison.value ? percent.format((current - comparison.value) / comparison.value) : "No like-for-like source rows"}</small></article></div>
    {filtered.length === 0 && <div className="empty-state"><h3>No rows match these filters</h3><p>Choose a store and date range that overlaps its supplied reporting period.</p></div>}
    {filtered.length > 0 && view === "trend" && <article className="panel chart-panel"><div className="section-head compact"><div><p className="eyebrow">Trend view</p><h3>{meta.label} by {groupBy}</h3></div><span className="period-chip">{grouped.length} points</span></div><div className="dynamic-bars">{grouped.slice(-35).map((row) => <div className="dynamic-column" key={row.label} title={`${row.label}: ${formatValue(metric, row.value)}`}><span>{formatValue(metric, row.value)}</span><div><i style={{ height: `${Math.max((row.value / max) * 100, 3)}%` }} /></div><small>{row.label.replace(" · ", "\n")}</small></div>)}</div></article>}
    {filtered.length > 0 && view === "cards" && <div className="store-grid report-cards">{[...new Set(filtered.map((row) => row.store))].map((name) => { const rows = filtered.filter((row) => row.store === name); return <article className="store-card" key={name}><div className="card-top"><span className="card-label">{name}</span><span className="status good">{rows.length} days</span></div><strong>{formatValue(metric, sumMetric(rows, metric))}</strong><p>{meta.label} · selected period</p><dl className="store-details"><div><dt>Sales</dt><dd>{moneyExact.format(sumMetric(rows, "insideSales"))}</dd></div><div><dt>Customers</dt><dd>{integer.format(sumMetric(rows, "customers"))}</dd></div><div><dt>Avg ticket</dt><dd>{moneyExact.format(sumMetric(rows, "averageTicket"))}</dd></div></dl></article>; })}</div>}
    {filtered.length > 0 && view === "table" && <div className="table-wrap detail-table"><table><thead><tr><th>Date</th><th>Store</th><th>Day</th><th>Inside Sales</th><th>Customers</th><th>Avg Ticket</th><th>Fuel Gallons</th><th>Fuel Sales</th><th>Lottery Sales</th><th>Void / Ticket / Error</th><th>Reasoning</th></tr></thead><tbody>{filtered.map((row) => <tr key={`${row.store}-${row.date}`}><td>{row.date}</td><td><b>{row.store}</b></td><td>{row.day}</td><td>{moneyExact.format(row.insideSales)}</td><td>{integer.format(row.customers)}</td><td>{moneyExact.format(row.averageTicket)}</td><td>{decimal.format(row.fuelGallons)}</td><td>{moneyExact.format(row.fuelSales)}</td><td>{moneyExact.format(row.lotterySales)}</td><td>{row.voidLines} / {row.voidTickets} / {row.errorCorrects}</td><td className="reasoning-cell">{row.reasoning}</td></tr>)}</tbody></table></div>}
    <p className="source-note">Comparison totals are shown only when matching source rows exist. The website does not invent missing dates.</p>
  </section>;
}

function CostsReport({ data }: { data: DashboardData }) {
  return <section className="report-page"><div className="page-intro"><div><p className="eyebrow light">Fuel & costs</p><h2>Quick C cost analysis and fuel price decisions.</h2></div><span className="period-chip">Formula-driven margins</span></div>
    <div className="kpi-grid four"><article><span>Quick C sales</span><strong>{moneyExact.format(data.quickC.sales)}</strong><small>{data.quickC.period}</small></article><article><span>COGS</span><strong>{moneyExact.format(data.quickC.cogs)}</strong><small>Scanned + Modifier Cost</small></article><article><span>Sales Margin</span><strong>{percent.format(data.quickC.salesMargin)}</strong><small>(Sales − COGS) ÷ Sales</small></article><article><span>Difference Margin</span><strong>{percent.format(data.quickC.differenceMargin)}</strong><small>Using Grocery Purchase</small></article></div>
    <div className="split-grid"><article className="panel"><div className="section-head compact"><div><p className="eyebrow">Daily cost report</p><h3>August 1–15, 2026</h3></div></div><div className="mini-cost-list">{data.quickC.daily.map((row) => <div key={row.date}><span>{row.date}</span><b>{moneyExact.format(row.sales)}</b><small>COGS {moneyExact.format(row.scannedCost + row.modifierCost)}</small></div>)}</div></article><article className="panel"><div className="section-head compact"><div><p className="eyebrow">Plant City fuel</p><h3>Competitor and margin tracker</h3></div></div><div className="fuel-cards">{data.fuelPrices.map((row) => <article key={row.grade}><div><strong>{row.grade}</strong><small>{row.date}</small></div><dl><div><dt>Cost</dt><dd>{moneyExact.format(row.cost)}</dd></div><div><dt>Nearby</dt><dd>{moneyExact.format(row.nearbyLow)}–{moneyExact.format(row.nearbyHigh)}</dd></div><div><dt>Cash / Card</dt><dd>{moneyExact.format(row.cashPrice)} / {moneyExact.format(row.cardPrice)}</dd></div><div><dt>Margin</dt><dd>{moneyExact.format(row.cashMargin)} / {moneyExact.format(row.cardMargin)}</dd></div></dl></article>)}</div></article></div>
  </section>;
}

function ExpensesReport({ data }: { data: DashboardData }) {
  const totalOut = data.moneyMovements.filter((row) => row.type === "Purchase" || row.type === "Expense" || row.type === "House Account").reduce((sum, row) => sum + row.amount, 0);
  return <section className="report-page"><div className="page-intro"><div><p className="eyebrow light">Purchases & expenses</p><h2>Money movements stay separate from daily sales.</h2></div><span className="period-chip">System day report example</span></div><div className="kpi-grid four"><article><span>Purchases</span><strong>{moneyExact.format(368.5)}</strong><small>Grocery</small></article><article><span>Expenses</span><strong>{moneyExact.format(168)}</strong><small>Payroll</small></article><article><span>House Account</span><strong>{moneyExact.format(24)}</strong><small>Preserved source term</small></article><article><span>Total cash out</span><strong>{moneyExact.format(totalOut)}</strong><small>Other income kept separate</small></article></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Store</th><th>Transaction Type</th><th>Category</th><th>Amount</th><th>Report treatment</th></tr></thead><tbody>{data.moneyMovements.map((row) => <tr key={`${row.type}-${row.category}`}><td>{row.date}</td><td><b>{row.store}</b></td><td>{row.type}</td><td>{row.category}</td><td>{moneyExact.format(row.amount)}</td><td>{row.type === "Other Income" ? "Income — not included in expenses" : "Cash out / management cost view"}</td></tr>)}</tbody></table></div><p className="source-note">Public mode shows category totals only. Vendor names, check numbers and individual Mercury task descriptions stay out of GitHub Pages.</p></section>;
}

function MercuryReport({ data }: { data: DashboardData }) {
  const statuses = [{ label: "Completed", value: data.mercury.completed, color: "green" }, { label: "In Progress", value: data.mercury.inProgress, color: "blue" }, { label: "Waiting for Response", value: data.mercury.waiting, color: "gold" }];
  return <section className="report-page"><div className="page-intro"><div><p className="eyebrow light">Mercury One</p><h2>Task monitoring for management follow-up.</h2></div><span className="period-chip">72 actual tasks</span></div><div className="kpi-grid four"><article><span>Completed</span><strong>{data.mercury.completed}</strong><small>{percent.format(data.mercury.completed / data.mercury.total)} completion</small></article><article><span>In Progress</span><strong>{data.mercury.inProgress}</strong><small>Needs follow-up</small></article><article><span>Waiting for Response</span><strong>{data.mercury.waiting}</strong><small>External response pending</small></article><article className="warning-kpi"><span>Status / date conflicts</span><strong>{data.mercury.statusConflicts}</strong><small>Confirm before cycle-time reporting</small></article></div><div className="split-grid mercury-grid"><article className="panel"><div className="section-head compact"><div><p className="eyebrow">Task distribution</p><h3>Current status</h3></div></div><div className="status-bars">{statuses.map((status) => <div className="status-row" key={status.label}><div><span>{status.label}</span><strong>{status.value}</strong></div><div className="status-track"><i className={status.color} style={{ width: `${status.value / data.mercury.total * 100}%` }} /></div></div>)}</div></article><article className="panel attention"><p className="eyebrow amber">Management exceptions</p><h3>Clean the tracker before measuring response performance.</h3><ul><li>{data.mercury.missingCompletionDate} completed tasks are missing Completion Date.</li><li>{data.mercury.statusConflicts} open tasks already contain Completion Date.</li><li>{data.mercury.missingTicketIds} tasks have no Ticket ID.</li><li>431 numbered-but-empty placeholders were excluded.</li></ul></article></div><article className="panel management-note"><p className="eyebrow">Recommended weekly report</p><h3>Headline → exceptions → owner → next action → due date</h3><p className="body-copy">Keep task descriptions in the private sheet. Publish only status totals and management-ready exception counts on this public site.</p></article></section>;
}

function QualityReport({ data }: { data: DashboardData }) {
  return <section className="report-page"><div className="page-intro"><div><p className="eyebrow light">Data quality</p><h2>Known gaps remain visible instead of being silently corrected.</h2></div><span className="status warn">{data.modelStatus}</span></div><div className="quality-grid">{data.alerts.map((alert, index) => <article className="quality-card" key={alert}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{index < 2 ? "Running-total mismatch" : index === 2 ? "Incomplete store period" : index === 3 ? "Mercury tracker conflict" : "Missing source file"}</h3><p>{alert}</p></div></article>)}</div><div className="split-grid connection-grid"><article className="panel"><p className="eyebrow">Source classification</p><h3>Manual and system reports serve different purposes.</h3><p className="body-copy">The three store PDFs are professionally formatted manual comparison reports. dayReport.pdf is the system-downloaded operational source. The fuel CSV is a separate competitor-price tracker. The two deep-research Markdown files are unrelated PhD research and were excluded.</p></article><article className="panel connection-status"><p className="eyebrow">Website publishing rule</p><div className="connection-badge"><i className="snapshot" /><span>Public summary mode</span></div><p>Raw vendor details, check references, task descriptions and source registers are not published.</p><a className="secondary-link" href={SHEET_URL} target="_blank" rel="noreferrer">Open management Google Sheet</a></article></div></section>;
}

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("overview"); const [data, setData] = useState<DashboardData | null>(null); const [connection, setConnection] = useState<"snapshot" | "live" | "error">("snapshot");
  useEffect(() => { let active = true; (async () => { const fallback = await (await fetch(new URL("dashboard-data.json", document.baseURI), { cache: "no-store" })).json() as DashboardData; const endpoint = document.querySelector<HTMLMetaElement>('meta[name="dashboard-data-url"]')?.content || ""; if (!endpoint) { if (active) setData(fallback); return; } try { const response = await fetch(endpoint, { cache: "no-store" }); if (!response.ok) throw new Error(); const live = await response.json() as DashboardData; if (active) { setData(live.dailyRecords ? live : fallback); setConnection(live.dailyRecords ? "live" : "error"); } } catch { if (active) { setData(fallback); setConnection("error"); } } })(); return () => { active = false; }; }, []);
  if (!data) return <main className="loading-shell"><div className="loading-card"><span className="brandmark">OM</span><p>Preparing management reports…</p></div></main>;
  return <main className="shell"><header className="topbar"><button className="brand-button" onClick={() => setTab("overview")}><span className="brandmark">OM</span><span><small>Management reporting portal</small><strong>Universal Operations Dashboard</strong></span></button><nav aria-label="Dashboard sections">{tabs.map((item) => <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav><div className="header-actions"><div className="source-state"><i className={connection === "live" ? "online" : "snapshot"} /><span>{connection === "live" ? "Live Sheet data" : "Uploaded snapshot"}<small>{data.asOf}</small></span></div><button className="print-action" onClick={() => window.print()}>Print</button></div></header><div className="privacy-strip"><span>Public summary mode</span><p>Sales, fuel, expense-category and Mercury status summaries. No inventory or audit modules.</p><a href={SHEET_URL} target="_blank" rel="noreferrer">Open Google Sheet</a></div>
    {tab === "overview" && <Overview data={data} setTab={setTab} />}{tab === "explorer" && <SalesExplorer data={data} />}{tab === "costs" && <CostsReport data={data} />}{tab === "expenses" && <ExpensesReport data={data} />}{tab === "mercury" && <MercuryReport data={data} />}{tab === "quality" && <QualityReport data={data} />}
    <footer><span>OM Universal Operations</span><p>Three-store sales + Mercury management reporting · Source terminology preserved</p><span>Version 2.0</span></footer></main>;
}

"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent, formatRatio, formatUsd } from "@/lib/datco";

type IndicatorResponse = {
  indicator: string;
  company: string;
  methodology: string;
  sources: Array<{
    label: string;
    url: string;
  }>;
  range: string;
  points: Array<{
    date: string;
    close: number;
    btcPrice: number;
    btcHeld: number;
    navPerShare: number;
    premiumToNav: number;
    mnav: number;
  }>;
  summary: {
    latestDate: string | null;
    latestPremiumToNav: number | null;
    latestMnav: number | null;
    latestNavPerShare: number | null;
    signal: string;
  };
  updatedAt: string;
  error?: string;
};

const ranges = [
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
];

export function Dashboard() {
  const [range, setRange] = useState("1y");
  const [data, setData] = useState<IndicatorResponse | null>(null);
  const [summaryText, setSummaryText] = useState<string>("");
  const [summaryMode, setSummaryMode] = useState<"idle" | "rules" | "openai" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/indicator?range=${range}`);
        const payload = (await response.json()) as IndicatorResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load indicator data.");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!data?.points.length) {
        return;
      }

      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            points: data.points,
          }),
        });
        const payload = (await response.json()) as { summary?: string; mode?: "rules" | "openai" | "error" };

        if (!cancelled) {
          setSummaryText(payload.summary ?? data.summary.signal);
          setSummaryMode(payload.mode ?? "rules");
        }
      } catch {
        if (!cancelled) {
          setSummaryText(data.summary.signal);
          setSummaryMode("error");
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [data]);

  const points = data?.points ?? [];
  const latest = data?.summary;

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">HW 2 • Robo-Advisor</p>
          <h1>Strategy Premium-to-NAV Monitor</h1>
          <p className="hero-copy">
            This dashboard tracks how aggressively the market prices Strategy relative to the
            Bitcoin value sitting on its balance sheet. When the premium expands, investors are
            paying more for leveraged BTC exposure through equity.
          </p>
        </div>

        <div className="hero-card">
          <p className="card-label">Selected Indicator</p>
          <h2>Premium to NAV</h2>
          <p>
            Formula: <code>close / estimated NAV per share - 1</code>
          </p>
          <p className="hero-footnote">
            NAV per share is estimated using public MSTR treasury disclosures and BTC/USD market
            prices.
          </p>
        </div>
      </section>

      <section className="toolbar">
        <div className="range-picker" role="tablist" aria-label="Choose date range">
          {ranges.map((item) => (
            <button
              key={item.value}
              className={item.value === range ? "active" : ""}
              onClick={() => setRange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="updated-at">
          Updated: {data ? new Date(data.updatedAt).toLocaleString("en-US") : "Loading..."}
        </p>
      </section>

      {loading ? <p className="status-panel">Loading indicator data...</p> : null}
      {error ? <p className="status-panel error">{error}</p> : null}

      {!loading && !error && latest ? (
        <>
          <section className="stats-grid">
            <article className="stat-card">
              <p className="card-label">Latest Premium</p>
              <h3>{latest.latestPremiumToNav !== null ? formatPercent(latest.latestPremiumToNav) : "--"}</h3>
              <p>How far MSTR trades above its BTC-backed NAV per share.</p>
            </article>

            <article className="stat-card">
              <p className="card-label">Latest mNAV</p>
              <h3>{latest.latestMnav !== null ? formatRatio(latest.latestMnav) : "--"}</h3>
              <p>A ratio above 1.0 means the stock trades richer than NAV.</p>
            </article>

            <article className="stat-card">
              <p className="card-label">Estimated NAV / Share</p>
              <h3>{latest.latestNavPerShare !== null ? formatUsd(latest.latestNavPerShare) : "--"}</h3>
              <p>Estimated BTC value per basic share using treasury holdings history.</p>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel insight-panel">
              <p className="card-label">Interpretation</p>
              <h3>What the latest reading suggests</h3>
              <p>{summaryText || latest.signal}</p>
              <p className="muted">
                Higher premiums usually imply stronger speculative demand for equity-based Bitcoin
                exposure, while lower premiums suggest the market is pricing MSTR closer to spot
                BTC value.
              </p>
              <p className="muted">
                Summary mode: {summaryMode === "openai" ? "OpenAI" : "Rule-based fallback"}
              </p>
            </article>

            <article className="panel methodology-panel">
              <p className="card-label">Methodology</p>
              <h3>Data pipeline</h3>
              <ul>
                <li>MSTR daily closes from Yahoo Finance chart data.</li>
                <li>BTC daily closes from Yahoo Finance BTC-USD chart data.</li>
                <li>BTC holdings timeline from public Strategy treasury announcements.</li>
                <li>Basic shares outstanding approximated as constant for a transparent classroom model.</li>
              </ul>
              <div className="sources-block">
                {data.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                ))}
              </div>
            </article>
          </section>

          <section className="chart-stack">
            <article className="panel chart-panel">
              <div className="panel-head">
                <div>
                  <p className="card-label">Main Chart</p>
                  <h3>Premium to NAV over time</h3>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={points}>
                    <defs>
                      <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1f6feb" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#1f6feb" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd5" />
                    <XAxis dataKey="date" minTickGap={40} stroke="#526156" />
                    <YAxis
                      tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                      stroke="#526156"
                    />
                    <Tooltip
                      formatter={(value: number) => formatPercent(value)}
                      labelFormatter={(label: string) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="premiumToNav"
                      stroke="#1f6feb"
                      fill="url(#premiumGradient)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel chart-panel">
              <div className="panel-head">
                <div>
                  <p className="card-label">Context</p>
                  <h3>MSTR close vs estimated NAV per share</h3>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd5" />
                    <XAxis dataKey="date" minTickGap={40} stroke="#526156" />
                    <YAxis stroke="#526156" />
                    <Tooltip
                      formatter={(value: number) => formatUsd(value)}
                      labelFormatter={(label: string) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={false}
                      name="MSTR Close"
                    />
                    <Line
                      type="monotone"
                      dataKey="navPerShare"
                      stroke="#15803d"
                      strokeWidth={2.5}
                      dot={false}
                      name="Estimated NAV / Share"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}

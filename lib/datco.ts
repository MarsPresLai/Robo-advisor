const ONE_DAY = 24 * 60 * 60 * 1000;
const STARTING_BTC_HOLDINGS = 214246;
const BASIC_SHARES_OUTSTANDING = 246_200_000;

type TreasuryEvent = {
  date: string;
  btcChange: number;
  note: string;
};

export type IndicatorPoint = {
  date: string;
  close: number;
  btcPrice: number;
  btcHeld: number;
  navPerShare: number;
  premiumToNav: number;
  mnav: number;
};

export const TREASURY_EVENTS: TreasuryEvent[] = [
  { date: "2024-04-29", btcChange: 122, note: "April 2024 treasury update" },
  { date: "2024-06-20", btcChange: 11931, note: "June 2024 convertible note purchase" },
  { date: "2024-08-01", btcChange: 169, note: "Q2 2024 earnings update" },
  { date: "2024-09-20", btcChange: 7420, note: "September 2024 ATM-funded purchase" },
  { date: "2024-11-11", btcChange: 27200, note: "November 2024 treasury purchase" },
  { date: "2024-11-18", btcChange: 5160, note: "November 2024 treasury purchase" },
  { date: "2024-11-25", btcChange: 55500, note: "November 2024 treasury purchase" },
  { date: "2024-12-02", btcChange: 15400, note: "December 2024 treasury purchase" },
  { date: "2024-12-09", btcChange: 2140, note: "December 2024 treasury purchase" },
  { date: "2024-12-16", btcChange: 15350, note: "December 2024 treasury purchase" },
  { date: "2024-12-23", btcChange: 5260, note: "December 2024 treasury purchase" },
  { date: "2024-12-30", btcChange: 2135, note: "December 2024 treasury purchase" },
  { date: "2025-01-06", btcChange: 1070, note: "January 2025 treasury purchase" },
  { date: "2025-01-13", btcChange: 2530, note: "January 2025 treasury purchase" },
  { date: "2025-01-21", btcChange: 11000, note: "January 2025 treasury purchase" },
  { date: "2025-01-27", btcChange: 10107, note: "January 2025 treasury purchase" },
  { date: "2025-02-10", btcChange: 7633, note: "February 2025 treasury purchase" },
  { date: "2025-02-24", btcChange: 20000, note: "February 2025 treasury purchase" },
  { date: "2025-03-31", btcChange: 22048, note: "March 2025 treasury purchase" },
];

function normalizeDate(timestampMs: number) {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function buildHoldingsTimeline() {
  const sortedEvents = [...TREASURY_EVENTS].sort((a, b) => a.date.localeCompare(b.date));
  return sortedEvents.map((event) => ({ ...event }));
}

export function getBtcHoldingsByDate(targetDate: string) {
  const timeline = buildHoldingsTimeline();
  let holdings = STARTING_BTC_HOLDINGS;

  for (const event of timeline) {
    if (event.date <= targetDate) {
      holdings += event.btcChange;
    }
  }

  return holdings;
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type CoinGeckoMarketChart = {
  prices?: [number, number][];
};

export async function fetchMstrHistory(range: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/MSTR?range=${range}&interval=1d&includePrePost=false&events=div%2Csplits`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MSTR history: ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((timestamp, index) => ({
      date: normalizeDate(timestamp * 1000),
      close: closes[index],
    }))
    .filter((point): point is { date: string; close: number } => typeof point.close === "number");
}

export async function fetchBitcoinHistory(days: string) {
  const url =
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch BTC history: ${response.status}`);
  }

  const payload = (await response.json()) as CoinGeckoMarketChart;
  const prices = payload.prices ?? [];

  return prices.map(([timestamp, price]) => ({
    date: normalizeDate(timestamp),
    btcPrice: price,
  }));
}

export function buildIndicatorSeries(
  mstrHistory: Array<{ date: string; close: number }>,
  btcHistory: Array<{ date: string; btcPrice: number }>,
) {
  const btcMap = new Map(btcHistory.map((point) => [point.date, point.btcPrice]));

  return mstrHistory
    .map((stockPoint) => {
      const btcPrice = btcMap.get(stockPoint.date);
      if (!btcPrice) {
        return null;
      }

      const btcHeld = getBtcHoldingsByDate(stockPoint.date);
      const navPerShare = (btcHeld * btcPrice) / BASIC_SHARES_OUTSTANDING;
      const premiumToNav = stockPoint.close / navPerShare - 1;
      const mnav = stockPoint.close / navPerShare;

      return {
        date: stockPoint.date,
        close: stockPoint.close,
        btcPrice,
        btcHeld,
        navPerShare,
        premiumToNav,
        mnav,
      } satisfies IndicatorPoint;
    })
    .filter((point): point is IndicatorPoint => point !== null);
}

export function summarizeSeries(series: IndicatorPoint[]) {
  const latest = series.at(-1);
  const previous = series.at(-2);
  const last30 = series.slice(-30);

  if (!latest || !previous) {
    return {
      latestDate: null,
      latestPremiumToNav: null,
      latestMnav: null,
      latestNavPerShare: null,
      signal: "Not enough data yet.",
    };
  }

  const averagePremium =
    last30.reduce((sum, point) => sum + point.premiumToNav, 0) / Math.max(last30.length, 1);
  const trend = latest.premiumToNav - previous.premiumToNav;
  const relativeToAverage = latest.premiumToNav - averagePremium;

  let signal = "Premium is close to its recent average.";

  if (latest.premiumToNav > 0.75) {
    signal = "Strategy is trading at a very high premium to its Bitcoin-backed NAV.";
  } else if (latest.premiumToNav < 0.15) {
    signal = "Strategy is trading close to its Bitcoin-backed NAV, suggesting weaker equity exuberance.";
  }

  if (trend > 0.05) {
    signal += " The premium expanded on the latest trading day.";
  } else if (trend < -0.05) {
    signal += " The premium compressed on the latest trading day.";
  }

  if (relativeToAverage > 0.1) {
    signal += " It sits above the 30-day average premium.";
  } else if (relativeToAverage < -0.1) {
    signal += " It sits below the 30-day average premium.";
  }

  return {
    latestDate: latest.date,
    latestPremiumToNav: latest.premiumToNav,
    latestMnav: latest.mnav,
    latestNavPerShare: latest.navPerShare,
    signal,
  };
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRatio(value: number) {
  return value.toFixed(2);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function getDaysFromRange(range: string) {
  switch (range) {
    case "6mo":
      return "180";
    case "1y":
      return "365";
    case "2y":
      return "730";
    default:
      return "365";
  }
}

export function shiftDate(date: Date, days: number) {
  return new Date(date.getTime() + days * ONE_DAY);
}

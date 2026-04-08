import { NextRequest, NextResponse } from "next/server";
import {
  buildIndicatorSeries,
  fetchBitcoinHistory,
  fetchMstrHistory,
  getDaysFromRange,
  summarizeSeries,
} from "@/lib/datco";

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") ?? "1y";
  const supportedRange = ["6mo", "1y", "2y"].includes(range) ? range : "1y";

  try {
    const [mstrHistory, btcHistory] = await Promise.all([
      fetchMstrHistory(supportedRange),
      fetchBitcoinHistory(getDaysFromRange(supportedRange)),
    ]);

    const series = buildIndicatorSeries(mstrHistory, btcHistory);
    const summary = summarizeSeries(series);

    return NextResponse.json({
      indicator: "Premium to NAV",
      company: "Strategy (MSTR)",
      methodology:
        "Premium to NAV = stock close / estimated BTC NAV per share - 1. BTC NAV per share uses public BTC treasury updates and an approximate constant basic share count.",
      sources: [
        {
          label: "Yahoo Finance MSTR chart",
          url: "https://query1.finance.yahoo.com/v8/finance/chart/MSTR",
        },
        {
          label: "CoinGecko Bitcoin market chart",
          url: "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart",
        },
        {
          label: "Strategy treasury press releases",
          url: "https://www.strategy.com/press",
        },
      ],
      range: supportedRange,
      points: series,
      summary,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

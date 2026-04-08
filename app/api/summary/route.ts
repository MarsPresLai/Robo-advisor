import { NextRequest, NextResponse } from "next/server";
import { summarizeSeries } from "@/lib/datco";

type SummaryRequest = {
  points: Array<{
    date: string;
    close: number;
    btcPrice: number;
    btcHeld: number;
    navPerShare: number;
    premiumToNav: number;
    mnav: number;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummaryRequest;
    const fallback = summarizeSeries(body.points).signal;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        summary: fallback,
        mode: "rules",
      });
    }

    const latestPoints = body.points.slice(-14);
    const compactData = latestPoints.map((point) => ({
      date: point.date,
      premiumToNav: Number(point.premiumToNav.toFixed(4)),
      mnav: Number(point.mnav.toFixed(4)),
      close: Number(point.close.toFixed(2)),
      navPerShare: Number(point.navPerShare.toFixed(2)),
      btcPrice: Number(point.btcPrice.toFixed(2)),
    }));

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a concise financial analysis assistant. Write 2 to 3 sentences, avoid hype, and explain the latest Strategy premium-to-NAV behavior in plain language for a student dashboard.",
          },
          {
            role: "user",
            content: `Summarize this recent Strategy premium-to-NAV dataset and relate it to BTC sentiment:\n${JSON.stringify(compactData, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        summary: fallback,
        mode: "rules",
      });
    }

    const payload = (await response.json()) as { output_text?: string };
    const summary = payload.output_text?.trim() || fallback;

    return NextResponse.json({
      summary,
      mode: "openai",
    });
  } catch {
    return NextResponse.json({
      summary: "Unable to generate an AI summary right now.",
      mode: "error",
    });
  }
}

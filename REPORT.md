# HW 2 Report: DAT.co Robo-Advisor

## 1. Selected Indicator

I chose `Premium to NAV` for `Strategy (MSTR)`.

This indicator measures how much the company's stock price trades above or below the Bitcoin value held on its balance sheet. It is useful because DAT.co companies are often evaluated not only as normal equities, but also as vehicles for Bitcoin exposure.

I chose this indicator for three reasons:

1. It is directly related to the DAT.co idea because it compares equity valuation with digital asset holdings.
2. It is intuitive to visualize over time at daily frequency.
3. It helps explain whether the market is pricing additional expectations such as leverage, future BTC purchases, capital market access, or speculative sentiment.

## 2. Relationship with Bitcoin (BTC)

The indicator is strongly connected to BTC because the underlying NAV is driven by:

- the amount of BTC held by Strategy
- the market price of BTC

When BTC rises, Strategy's Bitcoin-backed NAV per share also rises. However, the stock price of MSTR can rise faster or slower than BTC. Because of that, the premium to NAV changes over time.

Possible interpretations:

1. If the premium to NAV increases, investors may believe Strategy offers more than simple spot BTC exposure, such as leverage, financing ability, or faster treasury accumulation.
2. If the premium to NAV decreases, the market may be valuing MSTR more conservatively and closer to the actual BTC held.
3. Large changes in the indicator may reflect changes in BTC sentiment, equity-market risk appetite, or expectations about future Bitcoin purchases.

In short, this indicator reflects how the stock market prices a BTC treasury company relative to the Bitcoin it owns.

## 3. Data Collection

I used multiple public data sources:

- `Yahoo Finance` for daily MSTR stock prices
- `Yahoo Finance BTC-USD chart data` for daily BTC/USD prices
- `Strategy public treasury announcements` for BTC holdings updates

The website aggregates these sources on the server side and computes:

- estimated NAV per share
- mNAV
- premium to NAV

The calculation formula is:

`Premium to NAV = stock close / estimated NAV per share - 1`

For a simple and transparent classroom model, shares outstanding are approximated with a constant basic share count. This limitation is disclosed in the website methodology panel.

## 4. Website Visualization

The website provides:

- a daily time-series chart of Premium to NAV
- a comparison chart of MSTR closing price and estimated NAV per share
- summary cards for the latest premium, latest mNAV, and estimated NAV per share
- a short automatically generated interpretation based on the latest trend
- an optional OpenAI-powered text summary when an API key is configured

## 5. Deployed Website URL

Replace this after deployment:

`https://your-vercel-url.vercel.app`

## 6. Conclusion

This project shows how DAT.co indicators can be collected, computed, and visualized in a web-based system. Premium to NAV is a useful metric because it connects company valuation to Bitcoin treasury exposure and helps users understand whether market sentiment is becoming more aggressive or more conservative toward BTC-linked companies.

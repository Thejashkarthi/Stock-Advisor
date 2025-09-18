const express = require("express");
const cors = require("cors");
const yahooFinance = require("yahoo-finance2").default;
const axios = require("axios");

const app = express();

yahooFinance.setGlobalConfig({
  fetcher: async (url, options = {}) => {
    options.headers = {
      ...(options.headers || {}),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      "Accept": "application/json,text/html",
    };
    return fetch(url, options);
  },
});

// ✅ Allow requests from React frontend (port 3000)
app.use(cors({ origin: "http://localhost:3000", methods: ["GET"] }));
app.use(express.json());

// ✅ Suppress Yahoo Finance warnings
yahooFinance.suppressNotices(["yahooSurvey", "ripHistorical"]);

// ✅ Fetch Stock Price
app.get("/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    console.log(`📈 Fetching stock data for: ${symbol}`);

    const stockData = await yahooFinance.quoteSummary(symbol, { modules: ["price"] });

    if (!stockData.price || stockData.price.regularMarketPrice === null) {
      return res.status(404).json({ error: "Stock data not available" });
    }

    res.json({
      symbol: stockData.price.symbol,
      name: stockData.price.longName,
      price: stockData.price.regularMarketPrice,
      currency: stockData.price.currency,
      marketTime: stockData.price.regularMarketTime
        ? new Date(stockData.price.regularMarketTime).toISOString()
        : null,
    });
  } catch (error) {
    if (error.response?.status === 429) {
      console.error("🚨 Rate limit exceeded for Yahoo Finance API");
      return res.status(429).json({ error: "Rate limit exceeded, please retry later" });
    }

    if (error.code === "ECONNRESET") {
      console.error("🌐 Connection reset (possible rate limit or network issue)");
      return res.status(503).json({ error: "Connection reset, try again later" });
    }

    console.error("❌ Error fetching stock data:", error.message);
    res.status(500).json({ error: "Stock data not found" });
  }
});


// ✅ Fetch Historical Stock Data for Graphs
app.get("/history/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    console.log(`📊 Fetching historical data for: ${symbol}`);

    const history = await yahooFinance.historical(symbol, {
      period1: "2023-01-01",
      period2: new Date().toISOString().split("T")[0],
      interval: "1mo",
    });

    if (!history || history.length === 0) {
      return res.status(404).json({ error: "No historical data available" });
    }

    res.json(history);
  } catch (error) {
    console.error("❌ Error fetching historical stock data:", error);
    res.status(500).json({ error: "Historical stock data not found" });
  }
});

// ✅ Fetch News Related to Stock
app.get("/news/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    console.log(`📰 Fetching news for: ${symbol}`);

    const newsData = await yahooFinance.search(symbol);

    if (!newsData.news || newsData.news.length === 0) {
      return res.status(404).json({ error: "No news available" });
    }

    const articles = newsData.news.slice(0, 5).map((article) => ({
      title: article.title,
      link: article.link,
      publisher: article.publisher,
      publishedDate: article.providerPublishTime
        ? new Date(article.providerPublishTime * 1000).toLocaleString()
        : "Unknown",
    }));

    res.json(articles);
  } catch (error) {
    console.error("❌ Error fetching stock news:", error);
    res.status(500).json({ error: "News data not found" });
  }
});

// ✅ Fetch Financial Ratios & Score
app.get("/ratios/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    console.log(`📊 Fetching financial ratios for: ${symbol}`);

    // Fetch Yahoo Finance data
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
    });

    if (!summary || (!summary.financialData && !summary.defaultKeyStatistics && !summary.summaryDetail)) {
      return res.status(404).json({ error: "Financial ratios not found" });
    }

    // Extract ratios (map Yahoo fields to our schema)
    const latestRatios = {
      priceEarningsRatio: summary.defaultKeyStatistics?.forwardPE ?? null,
      priceToBookRatio: summary.defaultKeyStatistics?.priceToBook ?? null,
      returnOnEquity: summary.financialData?.returnOnEquity
        ? summary.financialData.returnOnEquity * 100
        : null, // convert to %
      returnOnAssets: summary.financialData?.returnOnAssets
        ? summary.financialData.returnOnAssets * 100
        : null, // convert to %
      returnOnCapitalEmployed: summary.financialData?.returnOnCapitalEmployed
        ? summary.financialData.returnOnCapitalEmployed * 100
        : null,
      debtEquityRatio: summary.financialData?.debtToEquity ?? null,
      currentRatio: summary.financialData?.currentRatio ?? null,
      quickRatio: summary.financialData?.quickRatio ?? null,
      cashRatio: summary.financialData?.cashRatio ?? null,
      operatingCashFlowPerShare: summary.financialData?.operatingCashflowPerShare ?? null,
      dividendYield: summary.summaryDetail?.dividendYield
        ? summary.summaryDetail.dividendYield * 100
        : null,
      grossProfitMargin: summary.financialData?.grossMargins
        ? summary.financialData.grossMargins * 100
        : null,
      operatingProfitMargin: summary.financialData?.operatingMargins
        ? summary.financialData.operatingMargins * 100
        : null,
      netProfitMargin: summary.financialData?.profitMargins
        ? summary.financialData.profitMargins * 100
        : null,
      ebitPerRevenue: summary.financialData?.ebitdaMargins
        ? summary.financialData.ebitdaMargins * 100
        : null,
      interestCoverage: summary.financialData?.interestCoverage ?? null,
      assetTurnover: summary.financialData?.assetTurnover ?? null,
      freeCashFlowPerShare: summary.financialData?.freeCashflowPerShare ?? null,
    };

    // ✅ Define ranges for scoring
    const scoringCriteria = {
      priceEarningsRatio: [[10, 25], [5, 50], true], // ⭐ Weighted
      returnOnEquity: [[15, 100], [5, 15], true], // ⭐ Weighted
      priceToBookRatio: [[1, 5], [5, 10]],
      returnOnAssets: [[7, 100], [1, 7]],
      returnOnCapitalEmployed: [[10, 35], [5, 10]],
      debtEquityRatio: [[0.5, 1.5], [1.5, 3.5]],
      currentRatio: [[1.5, 3], [1, 1.5]],
      quickRatio: [[1, 2], [0.5, 1]],
      cashRatio: [[1, 2], [0.5, 1]],
      operatingCashFlowPerShare: [[5, 20], [2, 5]],
      dividendYield: [[1, 100], [0.5, 2]],
      grossProfitMargin: [[20, 100], [10, 20]],
      operatingProfitMargin: [[12, 30], [2, 12]],
      netProfitMargin: [[6, 100], [1.5, 6]],
      ebitPerRevenue: [[10, 40], [2, 10]],
      interestCoverage: [[3, 20], [1.5, 3]],
      assetTurnover: [[0.8, 3.5], [0.5, 0.8]],
      freeCashFlowPerShare: [[5, 20], [2, 5]],
    };

    let totalPoints = 0;
    let maxPoints = 16 + 4; // 16 Normal + 4 Weighted (2 each for important ratios)

    // ✅ Assign scores
    function getPoints(value, ideal, bad, isImportant = false) {
      if (value == null) return 0;
      if (value >= ideal[0] && value <= ideal[1]) return isImportant ? 2 : 1; // ✅ Ideal
      if (value >= bad[0] && value <= bad[1]) return isImportant ? 1.7 : 0.8; // ⚠️ Okay
      return 0; // ❌ Bad
    }

    for (const [key, [ideal, bad, isImportant]] of Object.entries(scoringCriteria)) {
      totalPoints += getPoints(latestRatios[key] ?? 0, ideal, bad, isImportant);
    }

    // ✅ Response JSON
    res.json({
      symbol,
      ratios: {
        "P/E Ratio": latestRatios.priceEarningsRatio ?? "-",
        "P/B Ratio": latestRatios.priceToBookRatio ?? "-",
        "ROE": latestRatios.returnOnEquity ?? "-",
        "ROA": latestRatios.returnOnAssets ?? "-",
        "ROCE": latestRatios.returnOnCapitalEmployed ?? "-",
        "Debt-to-Equity": latestRatios.debtEquityRatio ?? "-",
        "Current Ratio": latestRatios.currentRatio ?? "-",
        "Quick Ratio": latestRatios.quickRatio ?? "-",
        "Cash Ratio": latestRatios.cashRatio ?? "-",
        "EPS": latestRatios.operatingCashFlowPerShare ?? "-",
        "Dividend Yield": latestRatios.dividendYield ?? "-",
        "Gross Profit Margin": latestRatios.grossProfitMargin ?? "-",
        "Operating Profit Margin": latestRatios.operatingProfitMargin ?? "-",
        "Net Profit Margin": latestRatios.netProfitMargin ?? "-",
        "EBIT Margin": latestRatios.ebitPerRevenue ?? "-",
        "Interest Coverage": latestRatios.interestCoverage ?? "-",
        "Asset Turnover Ratio": latestRatios.assetTurnover ?? "-",
        "Free Cash Flow Per Share": latestRatios.freeCashFlowPerShare ?? "-",
      },
      totalPoints,
      maxPoints,
      scorePercentage: ((totalPoints / maxPoints) * 100).toFixed(2) + "%",
    });
  } catch (error) {
    console.error("❌ Error fetching financial ratios:", error.message);
    res.status(500).json({ error: "Financial ratios not found" });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
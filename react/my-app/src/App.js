import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

function StockSearch() {
  const [symbol, setSymbol] = useState("");
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [news, setNews] = useState([]);
  const [ratios, setRatios] = useState(null);
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("stock");

  const fetchStock = async () => {
    setError("");
    try {
      const response = await fetch(`http://localhost:5000/stock/${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setStock(data);
        fetchHistory(symbol);
        fetchPrediction(symbol);
        fetchNews(symbol);
        fetchRatios(symbol);
      } else {
        setError(data.error || "Stock not found");
      }
    } catch (err) {
      setError("Error fetching stock data");
    }
  };

  const fetchHistory = async (symbol) => {
    try {
      const response = await fetch(`http://localhost:5000/history/${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setHistory(data);
      } else {
        setError("Historical data not available");
      }
    } catch (err) {
      setError("Error fetching historical data");
    }
  };

  const fetchPrediction = async (symbol) => {
    try {
      const response = await fetch(`http://127.0.0.1:5001/predict/${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setPrediction(data);
      } else {
        setError("Prediction not available");
      }
    } catch (err) {
      setError("Error fetching stock prediction");
    }
  };

  const fetchNews = async (symbol) => {
    try {
      const response = await fetch(`http://localhost:5000/news/${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setNews(data);
      } else {
        setError("No news available");
      }
    } catch (err) {
      setError("Error fetching news data");
    }
  };

  const fetchRatios = async (symbol) => {
    try {
      const response = await fetch(`http://localhost:5000/ratios/${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setRatios(data.ratios);
        setScore({ totalPoints: data.totalPoints, scorePercentage: data.scorePercentage });
      } else {
        setRatios(null);
        setScore(null);
      }
    } catch (err) {
      setRatios(null);
      setScore(null);
    }
  };

  const chartData = {
    labels: history.map((item) => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: "Stock Price",
        data: history.map((item) => item.close),
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 255, 0.1)",
        fill: true,
      },
    ],
  };

  if (!stock) {
    return (
      <div className="initial-screen">
        <div className="search-container">
          <input
            type="text"
            placeholder="Enter stock symbol (e.g., AAPL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="search-input"
          />
          <button onClick={fetchStock} className="search-button">Search</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <ul>
          <li className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Stock</li>
          <li className={tab === 'analyze' ? 'active' : ''} onClick={() => setTab('analyze')}>Evaluate</li>
          <li className={tab === 'news' ? 'active' : ''} onClick={() => setTab('news')}>News</li>
        </ul>
      </nav>
      {error && <p className="error">{error}</p>}
      {tab === 'stock' && stock && (
        <div className="stock-page">
          <h1>{stock.name} ({stock.symbol})</h1>
          <p><strong>Current Price:</strong> ${stock.price} {stock.currency}</p>
          <p><strong>Market Time:</strong> {new Date(stock.marketTime).toLocaleString()}</p>
          <p><strong>Predicted Price:</strong> ${prediction?.predicted_price || 'N/A'} {prediction?.currency || stock.currency}</p>
          {history.length > 0 && (
            <div className="chart-container">
              <h2>Stock Price History</h2>
              <Line data={chartData} />
            </div>
          )}
        </div>
      )}
      {tab === 'analyze' && ratios && score && (
        <div className="analyze-page">
          <h2>Stock Evaluation</h2>
          <div className="score-box">
            <p><strong>Total Points:</strong> {score.totalPoints}</p>
            <p><strong>Score Percentage:</strong> {score.scorePercentage}</p>
          </div>
          <h2>Financial Ratios</h2>
          <table className="ratios-table">
            <thead>
              <tr>
                <th>Ratio</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ratios).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'news' && news.length > 0 && (
        <div className="news-page">
          <h2>Market Sentiment - Latest News</h2>
          <ul className="news-list">
            {news.map((article, index) => (
              <li key={index} className="news-item">
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="news-link">{article.title}</a>
                <p className="news-meta">{article.publisher} - {article.publishedDate}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StockSearch;
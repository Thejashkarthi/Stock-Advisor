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

  // Get yesterday's price for comparison
  const getYesterdayPrice = () => {
    if (history.length >= 2) {
      return history[history.length - 2].close;
    }
    return null;
  };

  // Calculate price change from yesterday
  const getPriceChange = () => {
    const yesterdayPrice = getYesterdayPrice();
    if (yesterdayPrice && stock) {
      const change = stock.price - yesterdayPrice;
      const changePercent = ((change / yesterdayPrice) * 100);
      return {
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        isPositive: change >= 0
      };
    }
    return null;
  };

  // Compare AI prediction with current price
  const getPredictionComparison = () => {
    if (prediction && stock) {
      const predictedPrice = parseFloat(prediction.predicted_price);
      const currentPrice = parseFloat(stock.price);
      const isPositive = predictedPrice > currentPrice;
      const difference = (predictedPrice - currentPrice).toFixed(2);
      
      return {
        difference,
        isPositive,
        currency: stock.currency // Use the same currency as stock
      };
    }
    return null;
  };

  // Format price display based on currency
  const formatPrice = (price, currency) => {
    if (currency === 'INR') {
      return `${price} ${currency}`;
    }
    return `$${price} ${currency}`;
  };

  const formatDifference = (difference, currency) => {
  const absDifference = Math.abs(difference);
  if (currency === 'INR') {
    return `${absDifference} ${currency}`;
  }
  return `$${absDifference}`;
  };

  const chartData = {
    labels: history.map((item) => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: "Stock Price",
        data: history.map((item) => item.close),
        borderColor: "#00c2a8",
        backgroundColor: "rgba(0, 194, 168, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#fff'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#fff' },
        grid: { color: '#333' }
      },
      y: {
        ticks: { color: '#fff' },
        grid: { color: '#333' }
      }
    }
  };

  if (!stock) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: '#000', 
        color: '#fff', 
        textAlign: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
            Stock Advisor
          </h1>
          <p style={{ fontSize: '18px', color: '#bbb', marginBottom: '30px' }}>
            Stock analysis and screening tool for investors
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search for a company (e.g., AAPL)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              style={{
                padding: '14px',
                fontSize: '18px',
                width: '350px',
                border: '2px solid #444',
                borderRadius: '25px 0 0 25px',
                outline: 'none',
                backgroundColor: '#111',
                color: '#fff'
              }}
            />
            <button 
              onClick={fetchStock} 
              style={{
                padding: '14px 25px',
                fontSize: '18px',
                backgroundColor: '#00c2a8',
                color: '#000',
                border: 'none',
                borderRadius: '0 25px 25px 0',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </div>

          <div style={{ marginTop: '15px' }}>
            {['AAPL', 'TSLA', 'MSFT', 'GOOGL'].map(sym => (
              <span
                key={sym}
                onClick={() => setSymbol(sym)}
                style={{
                  display: 'inline-block',
                  background: '#111',
                  padding: '8px 15px',
                  margin: '5px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#00c2a8',
                  border: '1px solid #00c2a8'
                }}
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const priceChange = getPriceChange();
  const predictionComparison = getPredictionComparison();

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh', 
      padding: '20px', 
      backgroundColor: '#000', 
      color: '#fff',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <nav style={{ 
        width: '100%', 
        backgroundColor: '#000', 
        padding: '15px 0', 
        borderBottom: '1px solid #222' 
      }}>
        <ul style={{ 
          listStyle: 'none', 
          display: 'flex', 
          justifyContent: 'center', 
          padding: 0, 
          margin: 0 
        }}>
          <li 
            style={{ 
              margin: '0 30px', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              color: !stock ? '#fff' : '#bbb',
              position: 'relative',
              borderBottom: !stock ? '3px solid #00c2a8' : 'none',
              paddingBottom: '6px'
            }} 
            onClick={() => setStock(null)}
          >
            Home
          </li>
          <li 
            style={{ 
              margin: '0 30px', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              color: tab === 'stock' ? '#fff' : '#bbb',
              position: 'relative',
              borderBottom: tab === 'stock' ? '3px solid #00c2a8' : 'none',
              paddingBottom: '6px'
            }} 
            onClick={() => setTab('stock')}
          >
            Stock
          </li>
          <li 
            style={{ 
              margin: '0 30px', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              color: tab === 'analyze' ? '#fff' : '#bbb',
              position: 'relative',
              borderBottom: tab === 'analyze' ? '3px solid #00c2a8' : 'none',
              paddingBottom: '6px'
            }} 
            onClick={() => setTab('analyze')}
          >
            Evaluate
          </li>
          <li 
            style={{ 
              margin: '0 30px', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              color: tab === 'news' ? '#fff' : '#bbb',
              position: 'relative',
              borderBottom: tab === 'news' ? '3px solid #00c2a8' : 'none',
              paddingBottom: '6px'
            }} 
            onClick={() => setTab('news')}
          >
            News
          </li>
        </ul>
      </nav>
      
      {error && (
        <p style={{ color: 'red', textAlign: 'center', margin: '10px 0', fontSize: '16px' }}>
          {error}
        </p>
      )}
      
      {tab === 'stock' && stock && (
        <div style={{ width: '100%', padding: '25px' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '15px', color: '#fff' }}>
            {stock.name} ({stock.symbol})
          </h1>
          
          {/* Current Price with color indicator */}
          <div style={{ 
            backgroundColor: '#111', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: `3px solid ${priceChange && priceChange.isPositive ? '#00ff00' : '#ff0000'}`
          }}>
            <p style={{ fontSize: '18px', margin: '10px 0', color: '#ddd' }}>
              <strong>Current Price:</strong> 
              <span style={{ 
                color: priceChange && priceChange.isPositive ? '#00ff00' : '#ff0000',
                fontSize: '24px',
                fontWeight: 'bold',
                marginLeft: '10px'
              }}>
                {formatPrice(stock.price, stock.currency)}
              </span>
            </p>
            
            {priceChange && (
  <p style={{ fontSize: '16px', margin: '10px 0' }}>
    <span style={{ color: priceChange.isPositive ? '#00ff00' : '#ff0000' }}>
      {priceChange.isPositive ? '▲' : '▼'} {formatDifference(priceChange.change, stock.currency)} ({priceChange.isPositive ? '+' : ''}{priceChange.changePercent}%)
    </span>
    <span style={{ color: '#aaa', marginLeft: '10px' }}>from yesterday</span>
  </p>
)}
          </div>

          <p style={{ fontSize: '18px', margin: '10px 0', color: '#ddd' }}>
            <strong>Market Time:</strong> {new Date(stock.marketTime).toLocaleString()}
          </p>

          {/* AI Predicted Price with color indicator */}
          {prediction && (
            <div style={{ 
              backgroundColor: '#111', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: `3px solid ${predictionComparison && predictionComparison.isPositive ? '#00ff00' : '#ff0000'}`
            }}>
              <p style={{ fontSize: '18px', margin: '10px 0', color: '#ddd' }}>
                <strong>AI Predicted Price:</strong> 
                <span style={{ 
                  color: predictionComparison && predictionComparison.isPositive ? '#00ff00' : '#ff0000',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginLeft: '10px'
                }}>
                  {formatPrice(prediction.predicted_price, predictionComparison ? predictionComparison.currency : stock.currency)}
                </span>
              </p>
              
              {predictionComparison && (
  <p style={{ fontSize: '16px', margin: '10px 0' }}>
    <span style={{ color: predictionComparison.isPositive ? '#00ff00' : '#ff0000' }}>
      {predictionComparison.isPositive ? '▲' : '▼'} {formatDifference(predictionComparison.difference, predictionComparison.currency)}
    </span>
    <span style={{ color: '#aaa', marginLeft: '10px' }}>
      {predictionComparison.isPositive ? 'above' : 'below'} current price
    </span>
  </p>
)}
            </div>
          )}

          {history.length > 0 && (
            <div style={{ 
              marginTop: '20px', 
              backgroundColor: '#111', 
              borderRadius: '8px', 
              padding: '15px' 
            }}>
              <h2 style={{ color: '#fff', marginBottom: '20px' }}>Stock Price History</h2>
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </div>
      )}
      
      {tab === 'analyze' && ratios && score && (
        <div style={{ width: '100%', padding: '25px' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '15px', color: '#fff' }}>
            Stock Evaluation
          </h2>
          <div style={{ 
            backgroundColor: '#111', 
            padding: '15px', 
            borderLeft: '5px solid #00c2a8', 
            marginBottom: '20px', 
            fontSize: '18px', 
            color: '#fff' 
          }}>
            <p><strong>Total Points:</strong> {score.totalPoints}</p>
            <p><strong>Score Percentage:</strong> {score.scorePercentage}</p>
          </div>
          <h2 style={{ color: '#fff' }}>Financial Ratios</h2>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginTop: '15px', 
            backgroundColor: '#111', 
            color: '#fff' 
          }}>
            <thead>
              <tr>
                <th style={{ 
                  border: '1px solid #333', 
                  padding: '12px', 
                  textAlign: 'left', 
                  backgroundColor: '#222', 
                  color: '#00c2a8' 
                }}>
                  Ratio
                </th>
                <th style={{ 
                  border: '1px solid #333', 
                  padding: '12px', 
                  textAlign: 'left', 
                  backgroundColor: '#222', 
                  color: '#00c2a8' 
                }}>
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ratios).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ border: '1px solid #333', padding: '12px', textAlign: 'left' }}>
                    {key}
                  </td>
                  <td style={{ border: '1px solid #333', padding: '12px', textAlign: 'left' }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {tab === 'news' && news.length > 0 && (
        <div style={{ width: '100%', padding: '25px' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '15px', color: '#fff' }}>
            Market Sentiment - Latest News
          </h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {news.map((article, index) => (
              <li key={index} style={{ 
                backgroundColor: '#111', 
                padding: '15px', 
                marginBottom: '10px', 
                borderRadius: '5px' 
              }}>
                <a 
                  href={article.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    color: '#00c2a8', 
                    textDecoration: 'none', 
                    fontSize: '18px' 
                  }}
                >
                  {article.title}
                </a>
                <p style={{ fontSize: '14px', color: '#aaa', marginTop: '5px' }}>
                  {article.publisher} - {article.publishedDate}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StockSearch;
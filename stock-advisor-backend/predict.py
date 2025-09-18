from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import requests


app = Flask(__name__)
CORS(app)  # ✅ Allow React frontend (localhost:3000) to access Flask API

# Function to fetch historical stock data from Node.js backend
def get_historical_data(symbol):
    url = f"http://localhost:5000/history/{symbol}"  # Fetch from your Node.js API
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        return None

@app.route('/predict/<symbol>', methods=['GET'])
def predict_stock(symbol):
    data = get_historical_data(symbol)

    if not data:
        return jsonify({"error": "Historical data not available"}), 500

    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')

    df['days'] = (df['date'] - df['date'].min()).dt.days
    X = df[['days']]
    y = df['close']

    model = LinearRegression()
    model.fit(X, y)

    next_day = df['days'].max() + 365
    predicted_price = model.predict([[next_day]])[0]

    return jsonify({
        "symbol": symbol,
        "predicted_price": round(float(predicted_price), 2),
        "currency": "USD"
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)

const axios = require("axios");

let cache = {
  timestamp: null,
  prices: {}
};

const CRYPTOCURRENCIES = ["bitcoin", "ethereum"]; // CoinGecko IDs
const SYMBOL_MAP = {
  bitcoin: "BTC",
  ethereum: "ETH"
};

const fetchPrices = async () => {
  const now = Date.now();
  if (cache.timestamp && now - cache.timestamp < 10000) {
    return cache.prices; // Return cached prices (valid for 10s)
  }

  try {
    const response = await axios.get(process.env.COINGECKO_API, {
      params: {
        ids: CRYPTOCURRENCIES.join(","),
        vs_currencies: "usd"
      }
    });

    const prices = {};
    for (const coin of CRYPTOCURRENCIES) {
      const symbol = SYMBOL_MAP[coin];
      prices[symbol] = response.data[coin].usd;
    }

    cache = {
      timestamp: now,
      prices
    };

    return prices;

  } catch (error) {
    console.error("Error fetching crypto prices:", error.message);

    if (cache.prices && Object.keys(cache.prices).length > 0) {
      console.log("Using fallback cached prices.");
      return cache.prices;
    }

    throw new Error("Failed to fetch crypto prices and no cached values available.");
  }
};

module.exports = {
  fetchPrices
};

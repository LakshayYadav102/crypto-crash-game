const axios = require("axios");

const getCryptoPrice = async (crypto = "bitcoin") => {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`;

    const response = await axios.get(url);

    const price = response?.data?.[crypto]?.usd;

    if (!price || isNaN(price)) {
      console.error(`Invalid price response for ${crypto}:`, response.data);
      return null;
    }

    return price;
  } catch (error) {
    console.error("❌ Failed to fetch price:", error.message);
    return null;
  }
};

module.exports = getCryptoPrice;

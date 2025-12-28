const https = require('https');

const fetchUrl = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error("Parse error:", data);
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const check = async () => {
  try {
    console.log("Checking Pair Address: 6q88jmgqs5kikkjjvh7xgpy2rv3c2jps9yqsgqfvkrgt");
    const pairData = await fetchUrl("https://api.dexscreener.com/latest/dex/pairs/solana/6q88jmgqs5kikkjjvh7xgpy2rv3c2jps9yqsgqfvkrgt");
    console.log("Pair Data:", JSON.stringify(pairData, null, 2));

    console.log("\nChecking Token Address: ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk");
    const tokenData = await fetchUrl("https://api.dexscreener.com/latest/dex/tokens/ZRGboZN3K6JZYhGe8PHDcazwKuqhgp2tTG7h8G5fKGk");
    console.log("Token Data:", JSON.stringify(tokenData, null, 2));
  } catch (err) {
    console.error(err);
  }
};

check();

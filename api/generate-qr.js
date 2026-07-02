const https = require("https");
const crypto = require("crypto");

const MERCHANT_ID = "ec476501";

function generateSignature(data, privateKey) {
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, "base64");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, orderId } = req.body;
  const privateKey = process.env.PAYWAY_PRIVATE_KEY;

  if (!privateKey) return res.status(500).json({ error: "Private key not configured" });

  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const amountStr = parseFloat(amount).toFixed(2);
  const sigString = `merchant_id=${MERCHANT_ID}&tran_id=${orderId}&amount=${amountStr}&payment_option=abapay_deeplink&req_time=${reqTime}`;
  
  let hash;
  try {
    hash = generateSignature(sigString, privateKey);
  } catch(e) {
    return res.status(500).json({ error: "Signature failed: " + e.message });
  }

  const payload = JSON.stringify({
    merchant_id: MERCHANT_ID,
    tran_id: orderId,
    amount: amountStr,
    payment_option: "abapay_deeplink",
    req_time: reqTime,
    hash,
    return_url: "https://artisan-bakery-backend.vercel.app",
    currency: "USD",
  });

  const options = {
    hostname: "checkout-sandbox.payway.com.kh",
    path: "/api/payment-gateway/v1/payments/purchase",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const request = https.request(options, (response) => {
    let data = "";
    response.on("data", (chunk) => { data += chunk; });
   response.on("end", () => {
  console.log("PayWay response:", data);
  try { res.json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: "Invalid PayWay response", raw: data }); }
    });
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));
  request.write(payload);
  request.end();
};

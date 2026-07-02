const https = require("https");
const crypto = require("crypto");

const MERCHANT_ID = "ec476501";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, orderId } = req.body;
  const publicKey = process.env.PAYWAY_PRIVATE_KEY;

  if (!publicKey) return res.status(500).json({ error: "Key not configured" });

  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const amountStr = parseFloat(amount).toFixed(2);
  const currency = "USD";
  const paymentOption = "abapay_deeplink";

  // Hash = HMAC SHA512 of concatenated values in exact order
  // Only include fields you are sending
  const hashInput = reqTime + MERCHANT_ID + orderId + amountStr + paymentOption + currency;

  const hash = crypto
    .createHmac("sha512", publicKey)
    .update(hashInput)
    .digest("base64");

  const formData = new URLSearchParams({
    req_time: reqTime,
    merchant_id: MERCHANT_ID,
    tran_id: orderId,
    amount: amountStr,
    payment_option: paymentOption,
    currency: currency,
    return_url: Buffer.from("https://artisan-bakery-backend.vercel.app").toString("base64"),
    hash,
  }).toString();

  const options = {
    hostname: "checkout-sandbox.payway.com.kh",
    path: "/api/payment-gateway/v1/payments/purchase",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(formData),
    },
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
  request.write(formData);
  request.end();
};

const https = require("https");
const crypto = require("crypto");
const FormData = require("form-data");

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

  // Exact hash string order from PayWay docs (only include fields being sent)
  // req_time + merchant_id + tran_id + amount + payment_option + currency
  const hashInput = reqTime + MERCHANT_ID + orderId + amountStr + "" + "" + "" + "" + "" + "" + "" + "" + "" + "abapay_deeplink" + "" + "" + "" + "" + "USD" + "" + "";

  const hash = crypto
    .createHmac("sha512", publicKey)
    .update(hashInput)
    .digest("base64");

  // Must use multipart/form-data
  const form = new FormData();
  form.append("req_time", reqTime);
  form.append("merchant_id", MERCHANT_ID);
  form.append("tran_id", orderId);
  form.append("amount", amountStr);
  form.append("payment_option", "abapay_deeplink");
  form.append("currency", "USD");
  form.append("hash", hash);

  const options = {
    hostname: "checkout-sandbox.payway.com.kh",
    path: "/api/payment-gateway/v1/payments/purchase",
    method: "POST",
    headers: form.getHeaders(),
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
  form.pipe(request);
};

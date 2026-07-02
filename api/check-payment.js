const https = require("https");
const crypto = require("crypto");

const MERCHANT_ID = "ec476501";

function generateSignature(data, privateKey) {
  return crypto.createHmac("sha512", privateKey).update(data).digest("base64");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const { tranId } = req.body;
  const privateKey = process.env.PAYWAY_PRIVATE_KEY;
  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const hash = generateSignature(`${MERCHANT_ID}${reqTime}${tranId}`, privateKey);

  const payload = JSON.stringify({ merchant_id: MERCHANT_ID, tran_id: tranId, req_time: reqTime, hash });

  const options = {
    hostname: "checkout-sandbox.payway.com.kh",
    path: "/api/payment-gateway/v1/payments/check-transaction",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const request = https.request(options, (response) => {
    let data = "";
    response.on("data", (chunk) => { data += chunk; });
    response.on("end", () => {
      try {
        const result = JSON.parse(data);
        res.json({ paid: result.status?.code === "00" && result.transaction?.status === "approved" });
      } catch (e) { res.status(500).json({ error: "Invalid response" }); }
    });
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));
  request.write(payload);
  request.end();
};

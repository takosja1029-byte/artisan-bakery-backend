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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, orderId } = req.body;
  const privateKey = process.env.PAYWAY_PRIVATE_KEY;

  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const tranId = orderId;
  const firstName = "Artisan";
  const lastName = "Customer";
  const email = "customer@artisanbakery.com";
  const phone = "0976737470";
  const purchaseType = "purchase";
  const paymentOption = "abapay_khqr";
  const currency = "USD";
  const amountVal = parseFloat(amount);
  const lifetime = 10;
  const qrTemplate = "template3_color";

  const hashString =
    reqTime +
    MERCHANT_ID +
    tranId +
    amountVal +
    "" +
    firstName +
    lastName +
    email +
    phone +
    purchaseType +
    paymentOption +
    "" +
    "" +
    currency +
    "" +
    "" +
    "" +
    lifetime +
    qrTemplate;

  const hash = generateSignature(hashString, privateKey);

  const payload = JSON.stringify({
    req_time: reqTime,
    merchant_id: MERCHANT_ID,
    tran_id: tranId,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    amount: amountVal,
    purchase_type: purchaseType,
    payment_option: paymentOption,
    currency: currency,
    lifetime: lifetime,
    qr_image_template: qrTemplate,
    hash: hash,
  });

  const options = {
    hostname: "checkout-sandbox.payway.com.kh",
    path: "/api/payment-gateway/v1/payments/generate-qr",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const request = https.request(options, (response) => {
    let data = "";
    response.on("data", (chunk) => { data += chunk; });
    response.on("end", () => {
      try {
        const result = JSON.parse(data);
        console.log("PayWay QR response:", JSON.stringify(result));
        if (result.status?.code === "00" && result.qrString) {
          res.json({ qrString: result.qrString, qrImage: result.qrString, status: result.status });
        } else {
          res.status(500).json({ error: result.status?.message || "QR generation failed", raw: result });
        }
      } catch (e) {
        res.status(500).json({ error: "Invalid response from PayWay", raw: data });
      }
    });
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));
  request.write(payload);
  request.end();
};

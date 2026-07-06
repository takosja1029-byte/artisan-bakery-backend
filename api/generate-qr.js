const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, orderId } = req.body;

  try {
    const individualInfo = new IndividualInfo(
      "0976737470@acleda",
      "SANCHETRA VA",
      "Phnom Penh",
      {
        currency: khqrData.currency.usd,
        amount: parseFloat(amount),
        billNumber: orderId,
        storeLabel: "Artisan Bakery",
        expirationTimestamp: Date.now() + (10 * 60 * 1000),
      }
    );

    const khqr = new BakongKHQR();
    const response = khqr.generateIndividual(individualInfo);
    console.log("KHQR response:", JSON.stringify(response));

    if (response && response.data && response.data.qr) {
      return res.json({
        qrString: response.data.qr,
        qrImage: response.data.qr,
        status: { code: "00", message: "Success!" }
      });
    } else {
      return res.status(500).json({ error: "Failed to generate KHQR", raw: response });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

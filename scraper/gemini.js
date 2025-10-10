const axios = require("axios");

exports.config = {
  name: "geminivision",
  author: "Ry",
  description: "Google Gemini Vision AI with prompt + image recognition",
  category: "ai",
  link: ["/geminivision?prompt=describe this&imgUrl=https://example.com/image.jpg"],
  guide: "geminivision?prompt=What is shown in this image?&img=https://i.imgur.com/Kq1y7My.jpeg"
};

exports.initialize = async function ({ req, res }) {
  try {
    const prompt = req.query.prompt;
    const imgBase64 = req.query.img;
    const imgUrl = req.query.imgUrl;
    const model = "gemini-2.5-pro";
    const apiKey = "AIzaSyB2TTV5iIm77ZYx6YU2c_4PCZYxz7U9vlA";

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt. Use ?prompt=your question" });
    }

    let imageData = null;

    // 🖼️ Fetch or read image data
    if (imgBase64) {
      imageData = imgBase64;
    } else if (imgUrl) {
      const imageResp = await axios.get(imgUrl, { responseType: "arraybuffer" });
      imageData = Buffer.from(imageResp.data, "binary").toString("base64");
    }

    // 🧠 Build request payload
    const parts = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageData,
        }
      });
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts,
        }
      ]
    };

    // 🚀 Send request to Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    // 🧩 Extract image URLs if any
    const imageUrls = [...reply.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)].map(([, url]) => url);

    const validImageUrls = await Promise.all(
      imageUrls.map(async (url) => {
        try {
          const head = await axios.head(url);
          return head.headers["content-type"]?.startsWith("image") ? url : null;
        } catch {
          return null;
        }
      })
    ).then(results => results.filter(Boolean));

    // ✅ Respond
    res.json({
      content: reply,
      img_urls: validImageUrls,
      model,
      prompt,
      author: exports.config.author
    });

  } catch (error) {
    console.error("Gemini Vision API Error:", error.message);
    res.status(500).json({ error: "Gemini Vision request failed" });
  }
};
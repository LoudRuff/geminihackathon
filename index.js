const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// =================== CONFIG ===================
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI("AIzaSyBNgkIHLSMZbrf3IrsVukjMvqj1RLe8EUk");

// =================== MIDDLEWARE ===================
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =================== EMAIL + AI AUTO REPLY ===================
app.post("/send", async (req, res) => {
  const { name, email, doctorId } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "coslog000@gmail.com",
        pass: "rwho kjzs dhii emuz" // app password
      }
    });

    // ---- Send email to hospital ----
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "coslog000@gmail.com",
      subject: `Appointment Request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nDoctor ID: ${doctorId}`,
      replyTo: email
    });

    // ---- Generate AI reply ----
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Write a polite and professional email reply to a patient.

Patient Name: ${name}
Doctor ID: ${doctorId}
Hospital Name: OPTIMA-CENTRUM-CARE

Rules:
- Calm and reassuring tone
- No markdown
- No explanation
`;

    const result = await model.generateContent(prompt);
    const aiReply = result.response.text().trim();

    // ---- Auto reply to user ----
    await transporter.sendMail({
      from: `"OPTIMA-CENTRUM-CARE" <coslog000@gmail.com>`,
      to: email,
      subject: "Appointment Request Received",
      text: aiReply
    });

    res.sendFile(path.join(__dirname, "public", "nonerror.html"));

  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, "public", "error.html"));
  }
});

// =================== IMAGE OCR + SUMMARY ===================
app.post("/summarize-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `
You are an OCR system.

Extract ALL visible text from the image.
Then summarize it in easy language.

IMPORTANT:
- Output ONLY valid JSON
- No markdown
- No extra text

Format:
{
  "extractedText": "...",
  "summary": "..."
}
`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    console.log("RAW AI RESPONSE:\n", responseText);

    const cleanText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      return res.json({
        extractedText: responseText,
        summary: "AI returned unstructured text"
      });
    }

    res.json({
      extractedText: parsed.extractedText || "",
      summary: parsed.summary || ""
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize image" });
  }
});

// =================== START SERVER ===================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


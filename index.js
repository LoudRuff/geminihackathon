const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Tesseract = require("tesseract.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// 🔹 Multer (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 Gemini API
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

// 🔹 Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ======================================================
   EMAIL + GEMINI AUTO REPLY
====================================================== */
app.post("/send", async (req, res) => {
  const { name, email, doctorId } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "coslog000@gmail.com",
        pass: "YOUR_APP_PASSWORD"
      }
    });

    // 📩 Send request to hospital
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "coslog000@gmail.com",
      subject: `Appointment Request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nDoctor ID: ${doctorId}`,
      replyTo: email
    });

    // 🤖 Gemini auto reply
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
Write a polite professional email reply.
Patient Name: ${name}
Doctor ID: ${doctorId}
Hospital Name: OPTIMA-CENTRUM-CARE
No markdown.
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    // 📩 Reply to patient
    await transporter.sendMail({
      from: `"OPTIMA-CENTRUM-CARE" <coslog000@gmail.com>`,
      to: email,
      subject: "Appointment Request Received",
      text: reply
    });

    res.sendFile(path.join(__dirname, "public", "nonerror.html"));
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, "public", "error.html"));
  }
});

/* ======================================================
   IMAGE OCR (TESSERACT) + SUMMARY (GEMINI)
====================================================== */
app.post("/summarize-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    // 🔍 OCR using Tesseract
    const ocr = await Tesseract.recognize(
      req.file.buffer,
      "eng",
      {
        logger: m => console.log(m.status)
      }
    );

    const extractedText = ocr.data.text.trim();

    if (!extractedText) {
      return res.json({
        extractedText: "",
        summary: "No readable text found in image"
      });
    }

    // 🤖 Summarize using Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
Summarize the following text in simple language:

${extractedText}
`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    res.json({
      extractedText,
      summary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OCR or summarization failed" });
  }
});

/* ======================================================
   SERVER START
====================================================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

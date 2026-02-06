const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const app = express();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI("AIzaSyDsZTyU7lGQ28a7EoODBlJFb3JjtXPYbUA");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/send", async (req, res) => {
  const { name, email, doctorId } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "coslog000@gmail.com",
        pass: "rwho kjzs dhii emuz"
      },
    });

    let mailOptions = {
      from: `"${name}" <${email}>`,
      to: "coslog000@gmail.com",
      subject: `Appointment Request from ${name}`,
      text: `Name: ${name}\nUser Email: ${email}\nDoctor ID: ${doctorId}`,
      replyTo: email,
    };

    await transporter.sendMail(mailOptions);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const aiPrompt = `
Write a polite, professional automatic email reply to a patient.
Details:
Patient Name: ${name}
Doctor ID: ${doctorId}
Hospital Name: OPTIMA-CENTRUM-CARE

Tone: calm, reassuring, professional.
Do not include markdown or explanations.
`;

    const aiResult = await model.generateContent(aiPrompt);
    const aiReplyText = await aiResult.response.text();

    let autoReplyOptions = {
      from: `"OPTIMA-CENTRUM-CARE" <coslog000@gmail.com>`,
      to: email,
      subject: "Appointment Request Received",
      text: aiReplyText.trim(),
    };

    await transporter.sendMail(autoReplyOptions);

    res.status(200).sendFile(path.join(__dirname, "public", "nonerror.html"));
  } catch (error) {
    console.error(error);
    res.status(500).sendFile(path.join(__dirname, "public", "error.html"));
  }
});

app.post("/summarize-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `
Extract all text from this image and summarize it and more easy to read.
Return: { "extractedText": "...", "summary": "..." }.
Summarize in plain text.
`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = await result.response.text();

    const cleanText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanText);

    res.json({
      extractedText: parsed.extractedText || "",
      summary: parsed.summary || ""
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize image" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

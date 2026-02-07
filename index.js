const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI("AIzaSyDsZTyU7lGQ28a7EoODBlJFb3JjtXPYbUA");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/send", async (req, res) => {
  const { name, email, doctorId } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "coslog000@gmail.com",
        pass: "rwho kjzs dhii emuz"
      }
    });

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "coslog000@gmail.com",
      subject: `Appointment Request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nDoctor ID: ${doctorId}`,
      replyTo: email
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Write a polite professional email reply.
Patient Name: ${name}
Doctor ID: ${doctorId}
Hospital Name: OPTIMA-CENTRUM-CARE
No markdown.
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    await transporter.sendMail({
      from: `"OPTIMA-CENTRUM-CARE" <coslog000@gmail.com>`,
      to: email,
      subject: "Appointment Request Received",
      text: reply
    });

    res.sendFile(path.join(__dirname, "public", "nonerror.html"));
  } catch (e) {
    res.sendFile(path.join(__dirname, "public", "error.html"));
  }
});

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
Extract all visible text exactly as written.
Then summarize it simply.
Return ONLY valid JSON.

{
  "extractedText": "",
  "summary": ""
}
`;

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.json({
        extractedText: text,
        summary: ""
      });
    }

    res.json({
      extractedText: data.extractedText || "",
      summary: data.summary || ""
    });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

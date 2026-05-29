const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTP(email, code) {
  await transporter.sendMail({
    from: "Skyline <no-reply@skyline.com>",
    to: email,
    subject: "Código de verificación Skyline",
    text: `Tu código es: ${code}`
  });
}

module.exports = { sendOTP };

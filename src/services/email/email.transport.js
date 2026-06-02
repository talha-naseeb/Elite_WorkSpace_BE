const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const verifyTransport = () => {
  transporter.verify((err) => {
    if (err) console.error("[SMTP] Connection Error:", err);
  });
};

module.exports = { transporter, verifyTransport };

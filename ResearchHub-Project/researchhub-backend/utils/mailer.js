const nodemailer = require("nodemailer");

const getMailTransport = () => {
  const {
    SMTP_USER,
    SMTP_PASS,
    SMTP_HOST = "smtp.gmail.com",
    SMTP_PORT = "587",
    SMTP_FROM = SMTP_USER,
  } = process.env;

  if (!SMTP_USER && !SMTP_PASS) {
    return null;
  }

  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      "Email setup is incomplete. Set SMTP_USER and SMTP_PASS in the backend .env file.",
    );
  }

  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

module.exports = { getMailTransport };

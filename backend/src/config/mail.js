const nodemailer = require("nodemailer");
const env = require("./env");

const maskRecipient = (recipient) => {
  const value = String(recipient || "");
  const atIndex = value.lastIndexOf("@");
  return atIndex > 0 ? `***${value.slice(atIndex)}` : "[invalid recipient]";
};

const createMailTransporter = () => {
  if (!env.mailDeliveryEnabled) {
    return {
      sendMail: async (message) => {
        console.warn(
          `[mail disabled] delivery blocked: subject="${message.subject || "unknown"}" recipient=${maskRecipient(message.to)}`
        );

        const error = new Error(
          "Email delivery is disabled; the message was not sent"
        );
        error.code = "MAIL_DELIVERY_DISABLED";
        throw error;
      },
    };
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

module.exports = createMailTransporter;

import { createTransport } from "nodemailer";

let transport = createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODE_MAILER_EMAIL,
    pass: process.env.NODE_MAILER_TOKEN,
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transport.sendMail({
      from: process.env.NODE_MAILER_EMAIL,
      to: to,
      subject: subject,
      text: text,
    });
  } catch (error) {
    console.log(error);
  }
};

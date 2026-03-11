import { EmailTemplate } from 'src/common/enums';

export const emailTemplate = ({ title, otp }: EmailTemplate): string => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      /* Reset & Base Styles */
      body {
        background-color: #f1f5f9; /* Light slate background to contrast the white card */
        margin: 0;
        padding: 40px 20px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
      /* Main Card */
      .container {
        max-width: 500px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px; /* Matches rounded-2xl */
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); /* Matches shadow-2xl */
        overflow: hidden;
      }
      /* Header (Navy Identity) */
      .header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); /* Matches your navy gradient */
        padding: 40px 20px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .brand-subtitle {
        color: #94a3b8;
        font-size: 14px;
        margin-top: 5px;
      }
      /* Content Body */
      .body {
        padding: 40px 30px;
        text-align: center;
      }
      .body h2 {
        color: #0f172a; /* text-navy-900 */
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 15px;
      }
      .body p {
        font-size: 15px;
        color: #6b7280; /* text-gray-500 */
        line-height: 1.6;
        margin: 0 0 30px;
      }
      /* OTP Display Box (Not a link) */
      .otp-container {
        margin: 10px 0 20px;
      }
      .otp-box {
        display: inline-block;
        background-color: #f8fafc;
        color: #0f172a;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 4px;
        padding: 15px 30px;
        border: 2px dashed #cbd5e1;
        border-radius: 12px;
      }
      /* Footer */
      .footer {
        text-align: center;
        padding: 20px;
        border-top: 1px solid #e2e8f0;
        background-color: #fafafa;
      }
      .footer p {
        color: #94a3b8;
        font-size: 12px;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      
      <div class="header">
        <h1>EduLearn</h1>
        <div class="brand-subtitle">${title}</div>
      </div>
      
      <div class="body">
        <h2>Verify your email address</h2>
        <p>We received a request to verify your account. Please use the verification code below to complete the process.</p>
        
        <div class="otp-container">
          <div class="otp-box">${otp}</div>
        </div>
        
        <p style="font-size: 13px; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} EduLearn. All rights reserved.</p>
      </div>
      
    </div>
  </body>
</html>`;
};
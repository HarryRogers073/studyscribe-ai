const nodemailer = require('nodemailer');

function createTransporter() {
    // Check custom SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Check Gmail specific
    if (process.env.GMAIL_USER && (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD)) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD
            }
        });
    }

    return null;
}

function formatStoryEmail({ title, story, date, location, storyUrl, email }) {
    const metaParts = [];
    if (date) metaParts.push(date);
    if (location) metaParts.push(location);
    const metaText = metaParts.join(' · ');

    const paragraphs = (story || '')
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.85; text-indent: 1.5em;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Your Memoir'} — MemoirMagic AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2c251d;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4efe6; padding: 30px 10px;">
        <tr>
            <td align="center">
                <!-- Outer Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2d7c5;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0d1b2a; padding: 32px 30px; text-align: center;">
                            <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                                Memoir<span style="color: #c8a951;">Magic</span>
                            </h1>
                            <p style="margin: 8px 0 0 0; color: #c8a951; font-size: 13px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 600;">
                                Your Life Stories, Beautifully Told
                            </p>
                        </td>
                    </tr>

                    <!-- Receipt Banner -->
                    <tr>
                        <td style="background-color: #faf6ef; padding: 18px 30px; border-bottom: 1px solid #e8decb;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="font-size: 13px; color: #786c5e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Purchase Receipt & Keepsake</div>
                                        <div style="font-size: 15px; color: #1b263b; font-weight: 700; margin-top: 2px;">£2.99 Paid · Story Chapter & Typeset PDF</div>
                                    </td>
                                    <td align="right">
                                        <span style="display: inline-block; background-color: #e8f5e9; color: #2e7d32; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; border: 1px solid #c8e6c9;">
                                            ✓ Completed
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Call To Action Button -->
                    <tr>
                        <td style="padding: 28px 30px 10px 30px; text-align: center;">
                            <p style="margin: 0 0 18px 0; font-size: 16px; color: #3d3529; line-height: 1.5;">
                                Your memory has been transformed into an elegant book chapter. You can open your permanent keepsake and download the print-ready PDF below:
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #c8a951; border-radius: 8px;">
                                        <a href="${storyUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 17px; font-weight: 700; color: #0d1b2a; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                                            📖 View & Download Your PDF Keepsake →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 12px 0 0 0; font-size: 12px; color: #8c7e6d;">
                                Direct Link: <a href="${storyUrl}" style="color: #b08d36; text-decoration: underline;">${storyUrl}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- The Memoir Story Card -->
                    <tr>
                        <td style="padding: 20px 30px 35px 30px;">
                            <div style="background-color: #fffdf9; border: 1px solid #dfd4c0; border-radius: 8px; padding: 35px 30px; box-shadow: inset 0 0 40px rgba(0,0,0,0.015);">
                                <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eedfc6;">
                                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #b08d36; font-weight: 700; margin-bottom: 8px;">A MemoirMagic Chapter</div>
                                    <h2 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #1b263b;">${title || 'A Precious Memory'}</h2>
                                    ${metaText ? `<div style="margin-top: 6px; font-size: 13px; color: #7d7265; font-style: italic;">${metaText}</div>` : ''}
                                </div>
                                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16.5px; line-height: 1.85; color: #2c251d;">
                                    ${paragraphs}
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer / Instructions -->
                    <tr>
                        <td style="background-color: #faf6ef; padding: 25px 30px; border-top: 1px solid #e8decb; font-size: 13px; color: #786c5e; line-height: 1.6;">
                            <strong style="color: #1b263b;">Tips for Your Memoir:</strong>
                            <ul style="margin: 8px 0 16px 0; padding-left: 20px;">
                                <li><strong>Download as PDF:</strong> Click the button above to choose your page theme and download a clean, borderless A4 PDF ready for framing or printing.</li>
                                <li><strong>Share with Family:</strong> Forward this email or copy your private link to share with your children, grandchildren, and friends.</li>
                                <li><strong>Keep Forever:</strong> Bookmark your private link to read, listen to, or print your story anytime.</li>
                            </ul>
                            <div style="text-align: center; border-top: 1px solid #e2d7c5; padding-top: 15px; font-size: 12px; color: #9c8e7e;">
                                © 2026 MemoirMagic AI · <a href="https://memoirmagic.co.uk" style="color: #b08d36; text-decoration: none;">memoirmagic.co.uk</a><br>
                                Need any help? Reply directly to this email.
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const plainText = `
MEMOIRMAGIC AI — YOUR STORY CHAPTER & RECEIPT
==================================================

Thank you for your order! Your £2.99 payment is confirmed.

TITLE: ${title || 'A Memory'}
${metaText ? `DETAILS: ${metaText}\n` : ''}
VIEW & DOWNLOAD YOUR PDF KEEPSAKE:
${storyUrl}

--------------------------------------------------
YOUR STORY:
--------------------------------------------------

${story}

--------------------------------------------------
Need help? Visit https://memoirmagic.co.uk
© 2026 MemoirMagic AI
    `.trim();

    return { html, plainText };
}

async function sendStoryEmail({ to, title, story, date, location, storyUrl, id }) {
    if (!to || !to.includes('@')) {
        return { success: false, error: 'Invalid email address' };
    }

    const { html, plainText } = formatStoryEmail({
        title,
        story,
        date,
        location,
        storyUrl,
        email: to
    });

    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER || 'support@memoirmagic.co.uk';
    const emailSubject = `Your Memoir Chapter is Ready: "${title || 'My Story'}" (Receipt & PDF Link)`;

    // Priority 1: Direct Resend API (Most reliable on cloud platforms like Render)
    const resendKey = process.env.RESEND_API_KEY || (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('re_') ? process.env.SMTP_PASS : null);
    if (resendKey) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: `MemoirMagic <${fromAddress}>`,
                    to: [to],
                    reply_to: fromAddress,
                    subject: emailSubject,
                    text: plainText,
                    html: html
                })
            });

            const data = await res.json();
            if (res.ok && data.id) {
                console.log(`[Email Service] Story email successfully sent via Resend API to ${to}. MessageId: ${data.id}`);
                return { success: true, emailSent: true, messageId: data.id, storyUrl };
            } else {
                console.warn(`[Email Service] Resend API returned non-OK:`, data);
            }
        } catch (apiErr) {
            console.error(`[Email Service] Resend API exception:`, apiErr.message);
        }
    }

    // Priority 2: SMTP / Nodemailer
    const transporter = createTransporter();

    if (!transporter) {
        console.log(`[Email Service Notice] Email credentials not configured in environment. Story email prepared for: ${to}`);
        console.log(`[Story Link]: ${storyUrl}`);
        return {
            success: true,
            emailSent: false,
            fallbackNeeded: true,
            storyUrl,
            message: 'Email service pending credentials. Permanent link is ready.'
        };
    }

    try {
        const info = await transporter.sendMail({
            from: `"MemoirMagic" <${fromAddress}>`,
            to,
            replyTo: fromAddress,
            subject: emailSubject,
            text: plainText,
            html: html
        });

        console.log(`[Email Service] Story email successfully dispatched via SMTP to ${to}. MessageId: ${info.messageId}`);
        return { success: true, emailSent: true, messageId: info.messageId, storyUrl };
    } catch (error) {
        console.error(`[Email Service Error] Failed sending email via SMTP to ${to}:`, error.message);
        return { success: false, error: error.message, storyUrl };
    }
}

module.exports = {
    sendStoryEmail,
    formatStoryEmail
};

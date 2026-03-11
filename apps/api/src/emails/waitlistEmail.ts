export const buildWaitlistEmailHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the TruePick waitlist</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0c10;font-family:'Outfit',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0c10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Header: wordmark -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">TruePick</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0f1115;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">

              <!-- Badge -->
              <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.35);border-radius:999px;padding:4px 14px;margin-bottom:24px;">
                <span style="font-size:12px;font-weight:600;color:#a5b4fc;letter-spacing:0.4px;text-transform:uppercase;">Waitlist confirmed</span>
              </div>

              <!-- Heading -->
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.4px;">
                You're on the list.
              </h1>

              <!-- Body -->
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#94a3b8;">
                Thanks for joining the TruePick waitlist. We're building a smarter way to make purchase decisions — and founding members get <strong style="color:#e2e8f0;font-weight:600;">3 months free</strong> when we launch.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

              <!-- What to expect -->
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">What to expect</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px;">
                    <span style="color:#6366f1;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">Early access before public launch</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;">
                    <span style="color:#6366f1;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">3 months free for founding members</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color:#6366f1;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">We'll reach out personally when your spot opens</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
                You received this because you joined the TruePick waitlist.<br>
                <a href="https://gettruepick.com" style="color:#475569;text-decoration:none;">gettruepick.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

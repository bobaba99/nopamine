const formatReminderPrice = (price: number | null): string => {
  if (price === null || Number.isNaN(price)) {
    return 'Price not recorded'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(price)
}

export const buildHoldReminderEmailHtml = ({
  title,
  brand,
  price,
  expiresAt,
}: {
  title: string
  brand: string | null
  price: number | null
  expiresAt: string
}) => {
  const formattedPrice = formatReminderPrice(price)
  const formattedRelease = new Date(expiresAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TruePick hold has ended</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0c10;font-family:'Outfit',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0c10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">TruePick</span>
            </td>
          </tr>

          <tr>
            <td style="background-color:#0f1115;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">
              <div style="display:inline-block;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);border-radius:999px;padding:4px 14px;margin-bottom:24px;">
                <span style="font-size:12px;font-weight:600;color:#fcd34d;letter-spacing:0.4px;text-transform:uppercase;">Hold reminder</span>
              </div>

              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.4px;">
                Your hold window has ended.
              </h1>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#94a3b8;">
                You asked TruePick to slow this decision down. Your reminder is here so you can revisit the purchase with a clearer head.
              </p>

              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:18px 18px 16px;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#ffffff;line-height:1.4;">${title}</p>
                <p style="margin:0 0 6px;font-size:14px;color:#cbd5e1;line-height:1.5;">${formattedPrice}${brand ? ` · ${brand}` : ''}</p>
                <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Hold ended: ${formattedRelease}</p>
              </div>

              <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:28px;"></div>

              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Before you buy</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px;">
                    <span style="color:#f59e0b;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">Check whether the original reason still feels urgent.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;">
                    <span style="color:#f59e0b;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">Compare it against one cheaper or non-purchase alternative.</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color:#f59e0b;font-size:14px;margin-right:10px;">&#8594;</span>
                    <span style="font-size:14px;color:#cbd5e1;line-height:1.5;">If you still want it, buy deliberately instead of reactively.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
                You received this because hold reminders are enabled in your TruePick settings.<br>
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
}

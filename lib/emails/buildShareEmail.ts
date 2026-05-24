type ShareEmailProps = {
  sharerName: string;
  sharerImageUrl?: string;
  articleTitle: string;
  analysisUrl: string;
  appUrl: string;
};

export function buildShareEmail(props: ShareEmailProps): string {
  const { sharerName, sharerImageUrl, articleTitle, analysisUrl, appUrl } =
    props;

  const sharerInitial = sharerName[0]?.toUpperCase() ?? "?";
  const sharerFirst = sharerName.split(" ")[0];
  const currentYear = new Date().getFullYear();

  const avatarHtml = sharerImageUrl
    ? `<img src="${sharerImageUrl}" alt="${sharerInitial}" width="44" height="44" style="width:44px;height:44px;border-radius:50%;display:block;object-fit:cover;" />`
    : `<span style="display:block;width:44px;height:44px;line-height:44px;text-align:center;font-size:16px;font-weight:600;color:#4A4D44;">${sharerInitial}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Shared analysis on TruthLayer</title>
</head>
<body style="margin:0;padding:0;background:#F0F1EC;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="padding:40px 20px 60px;background:#F0F1EC;">
<div style="max-width:560px;margin:0 auto;">

  <!-- Logo -->
  <div style="text-align:center;padding-bottom:28px;">
    <a href="${appUrl}" style="text-decoration:none;">
      <span style="font-size:15px;font-weight:600;color:#1A1C18;letter-spacing:-0.3px;">TruthLayer</span>
    </a>
  </div>

  <!-- Card -->
  <div style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E0E2DA;box-shadow:0 2px 8px rgba(0,0,0,0.04);">

    <!-- Lime accent bar -->
    <div style="height:3px;background:linear-gradient(90deg,#A8C421 0%,#C4DE2A 50%,#A8C421 100%);"></div>

    <div style="padding:40px 40px 32px;">

      <!-- Sharer row -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <div style="width:44px;height:44px;min-width:44px;border-radius:50%;background:#E8EAE4;flex-shrink:0;overflow:hidden;">
          ${avatarHtml}
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#1A1C18;">${sharerName}</div>
          <div style="font-size:13px;color:#7A7D72;margin-top:1px;">shared an analysis with you</div>
        </div>
      </div>

      <!-- Headline -->
      <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#1A1C18;line-height:1.25;letter-spacing:-0.3px;margin:0 0 10px;">
        Someone wants you to<br/>
        <em style="font-style:italic;color:#8AA81A;">read between the lines.</em>
      </h1>
      <p style="font-size:14px;color:#7A7D72;line-height:1.6;font-weight:300;margin:0 0 28px;">
        ${sharerFirst} thinks this article is worth a closer look.
      </p>

      <!-- Article title -->
      <div style="background:#F8F9F5;border:1px solid #E4E6DF;border-radius:12px;padding:20px;margin-bottom:28px;border-left:3px solid #A8C421;">
        <div style="font-family:monospace;font-size:10px;font-weight:500;color:#8AA81A;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Article</div>
        <div style="font-size:15px;font-weight:600;color:#1A1C18;line-height:1.4;">${articleTitle}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${analysisUrl}" style="display:inline-block;background:#1A1C18;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
          View the analysis &nbsp;<span style="display:inline-block;width:6px;height:6px;background:#C4DE2A;border-radius:50%;vertical-align:middle;"></span>
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;background:#F8F9F5;border-top:1px solid #E4E6DF;">
      <p style="font-size:12px;color:#A8ABA2;line-height:1.6;text-align:center;margin:0;">
        You received this because ${sharerName} shared an analysis with you on
        <a href="${appUrl}" style="color:#7A7D72;text-decoration:underline;">TruthLayer</a>.<br/><br/>
        © ${currentYear} TruthLayer
      </p>
    </div>

  </div>

</div>
</div>
</body>
</html>`;
}

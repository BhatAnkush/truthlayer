type ShareEmailProps = {
  sharerName: string;
  articleTitle: string;
  factCount: number;
  opinionCount: number;
  fallacyCount: number;
  missingCount: number;
  manipulationScore: number;
  fearScore: number;
  analysisUrl: string;
  appUrl: string;
};

export function buildShareEmail(props: ShareEmailProps): string {
  const {
    sharerName,
    articleTitle,
    factCount,
    opinionCount,
    fallacyCount,
    missingCount,
    manipulationScore,
    fearScore,
    analysisUrl,
    appUrl,
  } = props;

  const sharerInitial = sharerName[0]?.toUpperCase() ?? "?";
  const sharerFirst = sharerName.split(" ")[0];
  const manipulationPct = manipulationScore * 10;
  const fearPct = fearScore * 10;
  const fearFillClass =
    fearScore >= 7 ? "#B03A2A" : fearScore >= 4 ? "#B07A1A" : "#2A7A5A";
  const manipFillClass =
    manipulationScore >= 7 ? "#B03A2A" : manipulationScore >= 4 ? "#B07A1A" : "#2A7A5A";
  const currentYear = new Date().getFullYear();

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
    <a href="${appUrl}" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
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
        <div style="width:44px;height:44px;border-radius:50%;background:#E8EAE4;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#4A4D44;flex-shrink:0;">
          ${sharerInitial}
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
        ${sharerFirst} shared a TruthLayer analysis with you.
        See how the AI classified every claim in the article —
        facts, opinions, fallacies, and what's missing.
      </p>

      <!-- Analysis preview -->
      <div style="background:#F8F9F5;border:1px solid #E4E6DF;border-radius:12px;padding:20px;margin-bottom:28px;border-left:3px solid #A8C421;">
        <div style="font-family:monospace;font-size:10px;font-weight:500;color:#8AA81A;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Analysis</div>
        <div style="font-size:15px;font-weight:600;color:#1A1C18;line-height:1.4;margin-bottom:12px;">${articleTitle}</div>

        <!-- Claim tags -->
        <div>
          <span style="display:inline-block;font-family:monospace;font-size:10px;padding:3px 9px;border-radius:20px;background:#E8F5EF;color:#2A7A5A;margin-right:6px;">${factCount} facts</span>
          <span style="display:inline-block;font-family:monospace;font-size:10px;padding:3px 9px;border-radius:20px;background:#FBF2E0;color:#B07A1A;margin-right:6px;">${opinionCount} opinions</span>
          <span style="display:inline-block;font-family:monospace;font-size:10px;padding:3px 9px;border-radius:20px;background:#FAEAE8;color:#B03A2A;margin-right:6px;">${fallacyCount} fallacies</span>
          <span style="display:inline-block;font-family:monospace;font-size:10px;padding:3px 9px;border-radius:20px;background:#ECEEE8;color:#5A5E55;">${missingCount} missing context</span>
        </div>

        <!-- Score bars -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E4E6DF;">
          <span style="font-family:monospace;font-size:10px;color:#A8ABA2;text-transform:uppercase;letter-spacing:0.1em;width:90px;flex-shrink:0;">Manipulation</span>
          <div style="flex:1;height:4px;background:#E4E6DF;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${manipulationPct}%;background:${manipFillClass};border-radius:2px;"></div>
          </div>
          <span style="font-family:monospace;font-size:11px;font-weight:500;color:#4A4D44;width:32px;text-align:right;">${manipulationScore}/10</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
          <span style="font-family:monospace;font-size:10px;color:#A8ABA2;text-transform:uppercase;letter-spacing:0.1em;width:90px;flex-shrink:0;">Fear lang.</span>
          <div style="flex:1;height:4px;background:#E4E6DF;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${fearPct}%;background:${fearFillClass};border-radius:2px;"></div>
          </div>
          <span style="font-family:monospace;font-size:11px;font-weight:500;color:#4A4D44;width:32px;text-align:right;">${fearScore}/10</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${analysisUrl}" style="display:inline-block;background:#1A1C18;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
          View the analysis &nbsp;<span style="display:inline-block;width:6px;height:6px;background:#C4DE2A;border-radius:50%;vertical-align:middle;"></span>
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #E4E6DF;margin:0 0 24px;"/>

      <!-- Explainer -->
      <div style="background:#F8F9F5;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;font-weight:600;color:#A8ABA2;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">What is TruthLayer?</div>
        <p style="font-size:13px;color:#7A7D72;line-height:1.6;font-weight:300;margin:0;">
          TruthLayer uses AI to dissect any news article — separating facts from opinions,
          spotting logical fallacies, measuring manipulation across 5 dimensions,
          and visualising it all as an interactive evidence board.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;background:#F8F9F5;border-top:1px solid #E4E6DF;">
      <p style="font-size:12px;color:#A8ABA2;line-height:1.6;text-align:center;margin:0;">
        You received this because ${sharerName} shared an analysis with you on
        <a href="${appUrl}" style="color:#7A7D72;text-decoration:underline;">TruthLayer</a>.<br/><br/>
        Direct link:<br/>
        <span style="font-family:monospace;font-size:11px;color:#8AA81A;word-break:break-all;">${analysisUrl}</span>
      </p>
    </div>

  </div>

  <!-- Below card -->
  <div style="text-align:center;padding-top:20px;">
    <p style="font-size:12px;color:#A8ABA2;margin:0;">
      © ${currentYear} TruthLayer &nbsp;·&nbsp;
      <a href="${appUrl}" style="color:#A8ABA2;text-decoration:underline;">Visit TruthLayer</a>
    </p>
  </div>

</div>
</div>
</body>
</html>`;
}
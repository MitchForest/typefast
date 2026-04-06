const RESOLUTION_LABELS: Record<number, string> = {
  7: "Neighborhood",
  6: "District",
  5: "Town",
  4: "Metro",
  3: "Region",
  2: "State",
  1: "Multi-State",
  0: "Continental",
};

export function resolutionLabel(resolution: number): string {
  return RESOLUTION_LABELS[resolution] ?? "Territory";
}

type DethroneEmailInput = {
  attackerName: string;
  territoryLabel: string;
  attackerWpm: number;
  defenderWpm: number;
  siteUrl: string;
};

export function renderDethroneEmail(input: DethroneEmailInput) {
  const { attackerName, territoryLabel, attackerWpm, defenderWpm, siteUrl } =
    input;

  const subject = `${attackerName || "Someone"} just took your ${territoryLabel} on TypeFast`;

  const html = `
    <div style="margin:0;background:#f7f5f0;padding:40px 16px;font-family:Nunito,'Nunito Sans',system-ui,sans-serif;color:#3c3c3c;">
      <div style="margin:0 auto;max-width:420px;border:1px solid #e5e0d8;border-radius:20px;background:#ffffff;box-shadow:0 2px 0 0 #e5e0d8;overflow:hidden;">
        <div style="padding:28px 28px 0;">
          <div style="font-size:18px;font-weight:900;color:#3c3c3c;letter-spacing:-0.01em;">TypeFast</div>
        </div>
        <div style="padding:32px 28px;text-align:center;">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">DETHRONED</div>
          <div style="font-size:20px;font-weight:800;color:#3c3c3c;line-height:1.4;margin-bottom:8px;">
            ${attackerName || "Someone"} just claimed your ${territoryLabel} with ${attackerWpm} WPM.
          </div>
          <div style="font-size:14px;color:#777777;line-height:1.5;margin-bottom:24px;">
            Your ${defenderWpm} WPM wasn't enough to hold it.
          </div>
          <a href="${siteUrl}" style="display:inline-block;padding:14px 32px;border-radius:14px;background:#ff9600;color:#ffffff;font-size:14px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;box-shadow:0 4px 0 0 #cc7800;">RECLAIM YOUR TURF</a>
        </div>
        <div style="padding:0 28px 24px;font-size:13px;color:#afafaf;line-height:1.5;">
          You can turn these off in your profile.
        </div>
      </div>
    </div>
  `;

  const text = [
    "DETHRONED",
    "",
    `${attackerName || "Someone"} just claimed your ${territoryLabel} with ${attackerWpm} WPM.`,
    `Your ${defenderWpm} WPM wasn't enough to hold it.`,
    "",
    `Reclaim your turf: ${siteUrl}`,
    "",
    "You can turn these off in your profile.",
    "",
    "TypeFast",
  ].join("\n");

  return { subject, html, text };
}

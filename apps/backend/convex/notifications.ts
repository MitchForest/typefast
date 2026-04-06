"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import { internalAction } from "./_generated/server";
import { renderDethroneEmail } from "./lib/dethroneEmail";

export const sendDethroneEmail = internalAction({
  args: {
    email: v.string(),
    attackerName: v.string(),
    territoryLabel: v.string(),
    attackerWpm: v.float64(),
    defenderWpm: v.float64(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY — skipping dethrone email");
      return;
    }

    const siteUrl = process.env.SITE_URL ?? "https://typefast.gg";
    const from =
      process.env.RESEND_FROM_EMAIL ?? "TypeFast <onboarding@resend.dev>";

    const { subject, html, text } = renderDethroneEmail({
      attackerName: args.attackerName,
      territoryLabel: args.territoryLabel,
      attackerWpm: args.attackerWpm,
      defenderWpm: args.defenderWpm,
      siteUrl,
    });

    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: args.email,
        subject,
        html,
        text,
      });
    } catch (err) {
      console.error("Failed to send dethrone email:", err);
    }
  },
});

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";
import { extractOrganizationalDomain } from "./lib/gameLogic";

/**
 * One-time backfill: sets emailDomain on existing players whose auth user
 * has a verified organizational email. Run via Convex dashboard after deploy.
 *
 * Self-schedules to process in batches of 100.
 */
export const backfillEmailDomains = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("players")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let patched = 0;

    for (const player of result.page) {
      if (player.emailDomain) continue;

      const user = await authComponent.getAnyUserById(ctx, player.userId);
      if (!user || !user.email || !user.emailVerified) continue;

      const domain = extractOrganizationalDomain(user.email);
      if (domain) {
        await ctx.db.patch(player._id, { emailDomain: domain });
        patched++;
      }
    }

    console.log(
      `Backfill batch: ${result.page.length} players checked, ${patched} patched`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.backfillEmailDomain.backfillEmailDomains,
        { cursor: result.continueCursor }
      );
    } else {
      console.log("Backfill complete");
    }
  },
});

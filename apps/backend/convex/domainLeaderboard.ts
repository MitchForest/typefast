import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getDomainLeaderboard = query({
  args: {
    domain: v.string(),
    ageBracket: v.optional(
      v.union(
        v.literal("under-11"),
        v.literal("11-13"),
        v.literal("14-18"),
        v.literal("18+")
      )
    ),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const domainPlayers = await ctx.db
      .query("players")
      .withIndex("by_emailDomain", (q) => q.eq("emailDomain", args.domain))
      .take(200);

    const entries = [];
    for (const player of domainPlayers) {
      if (args.ageBracket && player.ageBracket !== args.ageBracket) continue;

      const stats = await ctx.db
        .query("playerStats")
        .withIndex("by_userId", (q) => q.eq("userId", player.userId))
        .unique();

      if (!stats || stats.bestWpm === 0) continue;

      entries.push({
        userId: player.userId,
        playerName: player.name || "Anonymous",
        avatarDataUri: player.avatarDataUri ?? null,
        wpm: stats.bestWpm,
        accuracy: stats.bestAccuracy,
        totalSessions: stats.totalSessions,
      });
    }

    entries.sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy);

    return {
      entries: entries.slice(0, limit),
      memberCount: domainPlayers.length,
    };
  },
});

export const getDomainInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player?.emailDomain) return null;

    const myStats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const domainPlayers = await ctx.db
      .query("players")
      .withIndex("by_emailDomain", (q) =>
        q.eq("emailDomain", player.emailDomain!)
      )
      .take(200);

    let rank = 1;
    let activeMembers = 0;

    for (const p of domainPlayers) {
      const stats = await ctx.db
        .query("playerStats")
        .withIndex("by_userId", (q) => q.eq("userId", p.userId))
        .unique();

      if (!stats || stats.bestWpm === 0) continue;
      activeMembers++;

      if (
        myStats &&
        (stats.bestWpm > myStats.bestWpm ||
          (stats.bestWpm === myStats.bestWpm &&
            stats.bestAccuracy > myStats.bestAccuracy)) &&
        p.userId !== player.userId
      ) {
        rank++;
      }
    }

    return {
      domain: player.emailDomain,
      memberCount: domainPlayers.length,
      activeMembers,
      rank: myStats && myStats.bestWpm > 0 ? rank : null,
    };
  },
});

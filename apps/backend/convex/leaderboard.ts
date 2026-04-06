import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAnonymousAuthUser } from "./auth";
import { getCurrentMonth } from "./lib/gameLogic";

/** Average hex area in sq mi per H3 resolution */
const AREA_SQ_MI: Record<number, number> = {
  7: 2, 6: 14, 5: 97, 4: 671, 3: 4_692, 2: 32_744, 1: 228_449, 0: 1_590_958,
};

export const getGlobalLeaderboard = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const month = getCurrentMonth();

    // Deduplicate by userId (keep each player's best)
    const seen = new Set<string>();
    const leaderboard = [];

    for await (const session of ctx.db
      .query("sessions")
      .withIndex("by_wpm")
      .order("desc")) {
      if (seen.has(session.userId)) continue;
      seen.add(session.userId);

      const player = await ctx.db
        .query("players")
        .withIndex("by_userId", (q) => q.eq("userId", session.userId))
        .unique();

      // Compute total territory area for this player
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_month_userId", (q) =>
          q.eq("month", month).eq("userId", session.userId)
        )
        .collect();

      let totalAreaSqMi = 0;
      for (const c of claims) {
        totalAreaSqMi += AREA_SQ_MI[c.resolution] ?? 0;
      }

      leaderboard.push({
        userId: session.userId,
        playerName: player?.name || "Anonymous",
        avatarDataUri: player?.avatarDataUri ?? null,
        locationLabel: player?.locationLabel ?? null,
        country: player?.country ?? null,
        wpm: session.wpm,
        accuracy: session.accuracy,
        timestamp: session.timestamp,
        totalAreaSqMi,
      });

      if (leaderboard.length >= limit) break;
    }

    return leaderboard;
  },
});

export const getNationalLeaderboard = query({
  args: {
    country: v.string(),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const month = getCurrentMonth();

    const seen = new Set<string>();
    const leaderboard = [];

    for await (const session of ctx.db
      .query("sessions")
      .withIndex("by_wpm")
      .order("desc")) {
      if (seen.has(session.userId)) continue;
      seen.add(session.userId);

      const player = await ctx.db
        .query("players")
        .withIndex("by_userId", (q) => q.eq("userId", session.userId))
        .unique();

      if (player?.country !== args.country) continue;

      const claims = await ctx.db
        .query("claims")
        .withIndex("by_month_userId", (q) =>
          q.eq("month", month).eq("userId", session.userId)
        )
        .collect();

      let totalAreaSqMi = 0;
      for (const c of claims) {
        totalAreaSqMi += AREA_SQ_MI[c.resolution] ?? 0;
      }

      leaderboard.push({
        userId: session.userId,
        playerName: player.name || "Anonymous",
        avatarDataUri: player.avatarDataUri ?? null,
        locationLabel: player.locationLabel ?? null,
        country: player.country ?? null,
        wpm: session.wpm,
        accuracy: session.accuracy,
        timestamp: session.timestamp,
        totalAreaSqMi,
      });

      if (leaderboard.length >= limit) break;
    }

    return leaderboard;
  },
});

export const getMyRank = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    if (isAnonymousAuthUser(user)) return null;

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!stats || stats.totalSessions === 0) return null;

    const myWpm = stats.bestWpm;

    // Collect all playerStats entries (only non-zero session counts exist here)
    const allEntries = await ctx.db
      .query("playerStats")
      .withIndex("by_bestWpm")
      .order("desc")
      .collect();

    // Count how many players have a higher bestWpm and find neighbors
    let rank = 1;
    let globalTotal = 0;
    let aboveNeighbor: {
      userId: string;
      bestWpm: number;
      bestAccuracy: number;
    } | null = null;
    let belowNeighbor: {
      userId: string;
      bestWpm: number;
      bestAccuracy: number;
    } | null = null;

    for (const entry of allEntries) {
      if (entry.totalSessions === 0) continue;
      globalTotal++;
      if (entry.userId === user._id) continue;

      if (entry.bestWpm > myWpm) {
        rank++;
        // The last person we see above us is our direct neighbor
        aboveNeighbor = {
          userId: entry.userId,
          bestWpm: entry.bestWpm,
          bestAccuracy: entry.bestAccuracy,
        };
      } else if (!belowNeighbor) {
        belowNeighbor = {
          userId: entry.userId,
          bestWpm: entry.bestWpm,
          bestAccuracy: entry.bestAccuracy,
        };
      }
    }

    // Resolve player names/avatars for neighbors
    const neighborEntries = [
      ...(aboveNeighbor
        ? [{ ...aboveNeighbor, rank: rank - 1, isMe: false as const }]
        : []),
      {
        userId: user._id,
        bestWpm: myWpm,
        bestAccuracy: stats.bestAccuracy,
        rank,
        isMe: true as const,
      },
      ...(belowNeighbor
        ? [{ ...belowNeighbor, rank: rank + 1, isMe: false as const }]
        : []),
    ];

    const neighbors = await Promise.all(
      neighborEntries.map(async (entry) => {
        const player = await ctx.db
          .query("players")
          .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
          .unique();
        return {
          rank: entry.rank,
          playerName: player?.name || "Anonymous",
          wpm: entry.bestWpm,
          accuracy: entry.bestAccuracy,
          avatarDataUri: player?.avatarDataUri ?? null,
          isMe: entry.isMe,
        };
      }),
    );

    const percentile =
      globalTotal > 1
        ? Math.round(((globalTotal - rank) / (globalTotal - 1)) * 100)
        : 100;

    // National rank (if country known)
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    let nationalRank: number | undefined;
    let nationalTotal: number | undefined;
    const country = player?.country ?? undefined;

    if (country) {
      let natRank = 1;
      let natTotal = 0;
      for (const entry of allEntries) {
        if (entry.totalSessions === 0) continue;
        const p = await ctx.db
          .query("players")
          .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
          .unique();
        if (p?.country !== country) continue;
        natTotal++;
        if (entry.userId !== user._id && entry.bestWpm > myWpm) {
          natRank++;
        }
      }
      nationalRank = natRank;
      nationalTotal = natTotal;
    }

    return {
      globalRank: rank,
      globalTotal,
      percentile,
      nationalRank,
      nationalTotal,
      country,
      neighbors,
    };
  },
});

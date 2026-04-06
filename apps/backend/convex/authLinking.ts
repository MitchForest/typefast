import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { scoreBeatsClaim, extractOrganizationalDomain } from "./lib/gameLogic";

function pickPreferredString(primary?: string, fallback?: string) {
  if (primary && primary.trim().length > 0) {
    return primary;
  }
  return fallback ?? "";
}

function latestDate(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export const migrateAnonymousAccount = internalMutation({
  args: {
    anonymousUserId: v.string(),
    newUserId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.anonymousUserId === args.newUserId) {
      return;
    }

    const oldPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.anonymousUserId))
      .unique();
    const newPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.newUserId))
      .unique();

    const emailDomain = args.email
      ? extractOrganizationalDomain(args.email)
      : undefined;

    const mergedPlayer = {
      name: pickPreferredString(newPlayer?.name, oldPlayer?.name),
      message: pickPreferredString(newPlayer?.message, oldPlayer?.message),
      location: newPlayer?.location ?? oldPlayer?.location,
      avatarOptions: newPlayer?.avatarOptions ?? oldPlayer?.avatarOptions,
      avatarDataUri: newPlayer?.avatarDataUri ?? oldPlayer?.avatarDataUri,
      ageBracket: newPlayer?.ageBracket ?? oldPlayer?.ageBracket,
      country: newPlayer?.country ?? oldPlayer?.country,
      email: args.email ?? newPlayer?.email ?? oldPlayer?.email,
      emailNotifications:
        newPlayer?.emailNotifications ?? oldPlayer?.emailNotifications,
      ...(emailDomain ? { emailDomain } : {}),
    };

    if (oldPlayer && newPlayer) {
      await ctx.db.patch(newPlayer._id, mergedPlayer);
      await ctx.db.delete(oldPlayer._id);
    } else if (oldPlayer) {
      await ctx.db.patch(oldPlayer._id, {
        userId: args.newUserId,
        ...mergedPlayer,
      });
    } else if (newPlayer) {
      await ctx.db.patch(newPlayer._id, mergedPlayer);
    }

    const oldStats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.anonymousUserId))
      .unique();
    const newStats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.newUserId))
      .unique();

    if (oldStats && newStats) {
      const mergedLastDate = latestDate(
        oldStats.lastSessionDate,
        newStats.lastSessionDate
      );
      const useOldCurrentStreak =
        mergedLastDate !== undefined &&
        mergedLastDate === oldStats.lastSessionDate &&
        mergedLastDate !== newStats.lastSessionDate;

      await ctx.db.patch(newStats._id, {
        totalXP: oldStats.totalXP + newStats.totalXP,
        currentStreak: useOldCurrentStreak
          ? oldStats.currentStreak
          : newStats.currentStreak,
        bestStreak: Math.max(oldStats.bestStreak, newStats.bestStreak),
        lastSessionDate: mergedLastDate,
        totalSessions: oldStats.totalSessions + newStats.totalSessions,
        bestWpm: Math.max(oldStats.bestWpm, newStats.bestWpm),
        bestAccuracy: Math.max(oldStats.bestAccuracy, newStats.bestAccuracy),
      });
      await ctx.db.delete(oldStats._id);
    } else if (oldStats) {
      await ctx.db.patch(oldStats._id, { userId: args.newUserId });
    }

    const oldSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", args.anonymousUserId))
      .collect();

    for (const session of oldSessions) {
      await ctx.db.patch(session._id, { userId: args.newUserId });
    }

    const oldScores = await ctx.db
      .query("scores")
      .withIndex("by_userId_month_hex", (q) => q.eq("userId", args.anonymousUserId))
      .collect();

    for (const score of oldScores) {
      const targetScore = await ctx.db
        .query("scores")
        .withIndex("by_userId_month_hex", (q) =>
          q
            .eq("userId", args.newUserId)
            .eq("month", score.month)
            .eq("h3Index", score.h3Index)
        )
        .unique();

      if (!targetScore) {
        await ctx.db.patch(score._id, { userId: args.newUserId });
        continue;
      }

      if (
        scoreBeatsClaim(
          score.wpm,
          score.accuracy,
          targetScore.wpm,
          targetScore.accuracy
        )
      ) {
        await ctx.db.patch(targetScore._id, {
          wpm: score.wpm,
          accuracy: score.accuracy,
          timestamp: score.timestamp,
        });
      }

      await ctx.db.delete(score._id);
    }

    const allClaims = await ctx.db.query("claims").collect();
    const currentName = mergedPlayer.name || "Anonymous";
    const currentMessage = mergedPlayer.message;
    const targetClaims = new Map(
      allClaims
        .filter((claim) => claim.userId === args.newUserId)
        .map((claim) => [
          `${claim.month}:${claim.resolution}:${claim.h3Index}`,
          claim,
        ])
    );

    for (const claim of allClaims.filter((row) => row.userId === args.anonymousUserId)) {
      const key = `${claim.month}:${claim.resolution}:${claim.h3Index}`;
      const targetClaim = targetClaims.get(key);

      if (!targetClaim) {
        await ctx.db.patch(claim._id, {
          userId: args.newUserId,
          playerName: currentName,
          message: currentMessage,
        });
        continue;
      }

      if (
        scoreBeatsClaim(
          claim.wpm,
          claim.accuracy,
          targetClaim.wpm,
          targetClaim.accuracy
        )
      ) {
        await ctx.db.patch(targetClaim._id, {
          userId: args.newUserId,
          playerName: currentName,
          message: currentMessage,
          wpm: claim.wpm,
          accuracy: claim.accuracy,
        });
      } else if (
        targetClaim.playerName !== currentName ||
        targetClaim.message !== currentMessage
      ) {
        await ctx.db.patch(targetClaim._id, {
          playerName: currentName,
          message: currentMessage,
        });
      }

      await ctx.db.delete(claim._id);
    }

    const linkedClaims = await ctx.db.query("claims").collect();
    for (const claim of linkedClaims.filter((row) => row.userId === args.newUserId)) {
      if (claim.playerName === currentName && claim.message === currentMessage) {
        continue;
      }

      await ctx.db.patch(claim._id, {
        playerName: currentName,
        message: currentMessage,
      });
    }
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAnonymousAuthUser } from "./auth";
import {
  calculateXP,
  levelFromXP,
  todayUTC,
  updateStreak,
} from "./lib/gameLogic";

const EMPTY_STATS = {
  totalXP: 0,
  level: 1,
  currentXP: 0,
  nextLevelXP: 100,
  currentStreak: 0,
  bestStreak: 0,
  lastSessionDate: null,
  totalSessions: 0,
  bestWpm: 0,
  bestAccuracy: 0,
} as const;

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    if (isAnonymousAuthUser(user)) return EMPTY_STATS;

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!stats) {
      return EMPTY_STATS;
    }

    const { level, currentXP, nextLevelXP } = levelFromXP(stats.totalXP);
    return {
      totalXP: stats.totalXP,
      level,
      currentXP,
      nextLevelXP,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      lastSessionDate: stats.lastSessionDate ?? null,
      totalSessions: stats.totalSessions,
      bestWpm: stats.bestWpm,
      bestAccuracy: stats.bestAccuracy,
    };
  },
});

export const getSessionHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];
    if (isAnonymousAuthUser(user)) return [];

    return await ctx.db
      .query("sessions")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

export const recordSession = mutation({
  args: {
    wpm: v.float64(),
    accuracy: v.float64(),
    maxCombo: v.float64(),
    correctCharacters: v.float64(),
    totalCharacters: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (isAnonymousAuthUser(user)) {
      throw new Error("Sign in to post a score");
    }

    // Insert session record
    await ctx.db.insert("sessions", {
      userId: user._id,
      wpm: args.wpm,
      accuracy: args.accuracy,
      maxCombo: args.maxCombo,
      correctCharacters: args.correctCharacters,
      totalCharacters: args.totalCharacters,
      timestamp: Date.now(),
    });

    // Get or create player stats
    let stats = await ctx.db
      .query("playerStats")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const prevTotalXP = stats?.totalXP ?? 0;
    const prevLevel = levelFromXP(prevTotalXP).level;
    const prevBestWpm = stats?.bestWpm ?? 0;
    const prevBestAccuracy = stats?.bestAccuracy ?? 0;
    const prevStreak = stats?.currentStreak ?? 0;
    const prevLastDate = stats?.lastSessionDate;
    const prevBestStreak = stats?.bestStreak ?? 0;
    const prevTotalSessions = stats?.totalSessions ?? 0;

    // Calculate XP
    const xp = calculateXP({
      wpm: args.wpm,
      accuracy: args.accuracy,
      correctCharacters: args.correctCharacters,
      maxCombo: args.maxCombo,
    });

    // Compute deltas before updating
    const personalBest = args.wpm > prevBestWpm;
    const deltaFromBest = personalBest ? 0 : args.wpm - prevBestWpm;

    // Get last session for delta
    const lastSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(2); // Current session is already inserted, so take 2

    const previousSession = lastSessions.length >= 2 ? lastSessions[1] : null;
    const deltaFromLast = previousSession
      ? args.wpm - previousSession.wpm
      : 0;

    // Update streak
    const today = todayUTC();
    const { streak, lastDate } = updateStreak(prevLastDate, prevStreak, today);

    // Compute new stats
    const newTotalXP = prevTotalXP + xp.totalXP;
    const newLevel = levelFromXP(newTotalXP).level > prevLevel;
    const newBestWpm = Math.max(prevBestWpm, args.wpm);
    const newBestAccuracy = Math.max(prevBestAccuracy, args.accuracy);
    const newBestStreak = Math.max(prevBestStreak, streak);

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalXP: newTotalXP,
        currentStreak: streak,
        bestStreak: newBestStreak,
        lastSessionDate: lastDate,
        totalSessions: prevTotalSessions + 1,
        bestWpm: newBestWpm,
        bestAccuracy: newBestAccuracy,
      });
    } else {
      await ctx.db.insert("playerStats", {
        userId: user._id,
        totalXP: newTotalXP,
        currentStreak: streak,
        bestStreak: newBestStreak,
        lastSessionDate: lastDate,
        totalSessions: 1,
        bestWpm: newBestWpm,
        bestAccuracy: newBestAccuracy,
      });
    }

    return {
      ...xp,
      personalBest,
      newLevel,
      deltaFromBest,
      deltaFromLast,
    };
  },
});

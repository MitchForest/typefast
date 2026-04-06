import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authComponent, isAnonymousAuthUser } from "./auth";
import { scoreBeatsClaim, getCurrentMonth } from "./lib/gameLogic";
import { resolutionLabel } from "./lib/dethroneEmail";

export const getClaim = query({
  args: {
    h3Index: v.string(),
    month: v.string(),
    resolution: v.float64(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claims")
      .withIndex("by_month_res_hex", (q) =>
        q
          .eq("month", args.month)
          .eq("resolution", args.resolution)
          .eq("h3Index", args.h3Index)
      )
      .unique();
  },
});

export const getClaimsForCells = query({
  args: {
    cells: v.array(v.string()),
    resolution: v.float64(),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.cells.length === 0) return [];

    // For small cell counts, query individually
    if (args.cells.length <= 200) {
      const claims = [];
      for (const cell of args.cells) {
        const claim = await ctx.db
          .query("claims")
          .withIndex("by_month_res_hex", (q) =>
            q
              .eq("month", args.month)
              .eq("resolution", args.resolution)
              .eq("h3Index", cell)
          )
          .unique();
        if (claim) claims.push(claim);
      }
      return claims;
    }

    // For large cell counts, fetch all claims at this resolution and filter
    const allClaims = await ctx.db
      .query("claims")
      .withIndex("by_month_res", (q) =>
        q.eq("month", args.month).eq("resolution", args.resolution)
      )
      .collect();

    const cellSet = new Set(args.cells);
    return allClaims.filter((claim) => cellSet.has(claim.h3Index));
  },
});

export const getPlayerClaims = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];
    if (isAnonymousAuthUser(user)) return [];

    return await ctx.db
      .query("claims")
      .withIndex("by_month_userId", (q) =>
        q.eq("month", args.month).eq("userId", user._id)
      )
      .collect();
  },
});

export const getClaimCount = query({
  args: { month: v.string(), resolution: v.float64() },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_month_res", (q) =>
        q.eq("month", args.month).eq("resolution", args.resolution)
      )
      .collect();
    return claims.length;
  },
});

export const submitScore = mutation({
  args: {
    h3Index: v.string(),
    wpm: v.float64(),
    accuracy: v.float64(),
    ancestors: v.array(
      v.object({
        h3Index: v.string(),
        resolution: v.float64(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (isAnonymousAuthUser(user)) {
      throw new Error("Sign in to claim territory");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    const month = getCurrentMonth();
    const playerName = player.name || "Anonymous";

    // Check/update personal best score for this hex
    const existingScore = await ctx.db
      .query("scores")
      .withIndex("by_userId_month_hex", (q) =>
        q.eq("userId", user._id).eq("month", month).eq("h3Index", args.h3Index)
      )
      .unique();

    if (
      !existingScore ||
      scoreBeatsClaim(
        args.wpm,
        args.accuracy,
        existingScore.wpm,
        existingScore.accuracy
      )
    ) {
      if (existingScore) {
        await ctx.db.patch(existingScore._id, {
          wpm: args.wpm,
          accuracy: args.accuracy,
          timestamp: Date.now(),
        });
      } else {
        await ctx.db.insert("scores", {
          userId: user._id,
          h3Index: args.h3Index,
          wpm: args.wpm,
          accuracy: args.accuracy,
          month,
          timestamp: Date.now(),
        });
      }
    }

    // Percolate: check claim at every resolution
    const newClaims = [];
    let currentHolderWpm = 0;

    // Track displaced players (other users whose hexes we took)
    const displacedMap = new Map<
      string,
      { userId: string; playerName: string; resolution: number; defenderWpm: number }
    >();

    for (const ancestor of args.ancestors) {
      const existingClaim = await ctx.db
        .query("claims")
        .withIndex("by_month_res_hex", (q) =>
          q
            .eq("month", month)
            .eq("resolution", ancestor.resolution)
            .eq("h3Index", ancestor.h3Index)
        )
        .unique();

      // Track base resolution holder for response
      if (ancestor.resolution === 7 && existingClaim) {
        currentHolderWpm = existingClaim.wpm;
      }

      const beats =
        !existingClaim ||
        scoreBeatsClaim(
          args.wpm,
          args.accuracy,
          existingClaim.wpm,
          existingClaim.accuracy
        );

      if (beats) {
        // Track displacement if this hex belonged to someone else
        if (existingClaim && existingClaim.userId !== user._id) {
          const prev = displacedMap.get(existingClaim.userId);
          // Keep the lowest resolution (= largest area) per displaced player
          if (!prev || ancestor.resolution < prev.resolution) {
            displacedMap.set(existingClaim.userId, {
              userId: existingClaim.userId,
              playerName: existingClaim.playerName,
              resolution: ancestor.resolution,
              defenderWpm: existingClaim.wpm,
            });
          }
        }

        const claimData = {
          h3Index: ancestor.h3Index,
          resolution: ancestor.resolution,
          userId: user._id,
          playerName,
          message: player.message,
          wpm: args.wpm,
          accuracy: args.accuracy,
          month,
        };

        if (existingClaim) {
          await ctx.db.replace(existingClaim._id, claimData);
        } else {
          await ctx.db.insert("claims", claimData);
        }

        newClaims.push(claimData);
      }
    }

    // Fetch avatar data for displaced players + schedule dethrone emails
    const displacedPlayers = [];
    for (const displaced of displacedMap.values()) {
      const displacedPlayer = await ctx.db
        .query("players")
        .withIndex("by_userId", (q) => q.eq("userId", displaced.userId))
        .unique();

      displacedPlayers.push({
        userId: displaced.userId,
        playerName: displaced.playerName,
        avatarDataUri: displacedPlayer?.avatarDataUri ?? null,
        resolution: displaced.resolution,
      });

      // emailNotifications: undefined = opted in (default true)
      const wantsEmail =
        displacedPlayer?.email &&
        displacedPlayer.emailNotifications !== false;

      if (wantsEmail) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendDethroneEmail,
          {
            email: displacedPlayer.email!,
            attackerName: playerName,
            territoryLabel: resolutionLabel(displaced.resolution),
            attackerWpm: args.wpm,
            defenderWpm: displaced.defenderWpm,
          }
        );
      }
    }

    return {
      claimed: newClaims.length > 0,
      claims: newClaims,
      currentHolderWpm,
      displacedPlayers,
    };
  },
});

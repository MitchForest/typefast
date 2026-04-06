import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAnonymousAuthUser } from "./auth";
import { getCurrentMonth, extractOrganizationalDomain } from "./lib/gameLogic";

export const getPlayer = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const getPlayerById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const ensurePlayer = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    const existing = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) return existing._id;

    const emailDomain =
      user.email && user.emailVerified
        ? extractOrganizationalDomain(user.email)
        : undefined;

    return await ctx.db.insert("players", {
      userId: user._id,
      name: "",
      message: "",
      ...(user.email ? { email: user.email } : {}),
      ...(emailDomain ? { emailDomain } : {}),
    });
  },
});

export const updatePlayer = mutation({
  args: {
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    location: v.optional(
      v.object({ lat: v.float64(), lng: v.float64() })
    ),
    avatarOptions: v.optional(v.string()),
    avatarDataUri: v.optional(v.string()),
    ageBracket: v.optional(
      v.union(
        v.literal("under-11"),
        v.literal("11-13"),
        v.literal("14-18"),
        v.literal("18+"),
        v.null()
      )
    ),
    country: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const isIdentityUpdate =
      args.name !== undefined ||
      args.message !== undefined ||
      args.avatarOptions !== undefined ||
      args.avatarDataUri !== undefined ||
      args.ageBracket !== undefined;

    if (isAnonymousAuthUser(user) && isIdentityUpdate) {
      throw new Error("Sign in to edit your profile");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    // Build update object, filtering out undefined values
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.message !== undefined) updates.message = args.message;
    if (args.location !== undefined) updates.location = args.location;
    if (args.avatarOptions !== undefined) updates.avatarOptions = args.avatarOptions;
    if (args.avatarDataUri !== undefined) updates.avatarDataUri = args.avatarDataUri;
    if (args.ageBracket !== undefined) {
      if (args.ageBracket === null) {
        updates.ageBracket = undefined; // Remove the field
      } else {
        updates.ageBracket = args.ageBracket;
      }
    }
    if (args.country !== undefined) updates.country = args.country;
    if (args.locationLabel !== undefined) updates.locationLabel = args.locationLabel;
    if (args.emailNotifications !== undefined) updates.emailNotifications = args.emailNotifications;

    await ctx.db.patch(player._id, updates);

    // Fan-out: update name/message on all owned claims for the current month
    if (args.name !== undefined || args.message !== undefined) {
      const month = getCurrentMonth();
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_month_userId", (q) =>
          q.eq("month", month).eq("userId", user._id)
        )
        .collect();

      const newName = args.name ?? player.name;
      const newMessage = args.message ?? player.message;

      for (const claim of claims) {
        await ctx.db.patch(claim._id, {
          playerName: newName || "Anonymous",
          message: newMessage,
        });
      }
    }
  },
});

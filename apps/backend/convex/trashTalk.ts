import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, isAnonymousAuthUser } from "./auth";
import {
  getCurrentMonth,
  TRASH_TALK_PRESETS,
  TRASH_TALK_REACTIONS,
  TRASH_TALK_MAX_LENGTH,
} from "./lib/gameLogic";

export const sendTrashTalk = mutation({
  args: {
    recipientId: v.string(),
    message: v.string(),
    isPreset: v.boolean(),
    h3Index: v.string(),
    resolution: v.float64(),
    areaLabel: v.string(),
    wpm: v.float64(),
    sessionTimestamp: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (isAnonymousAuthUser(user)) {
      throw new Error("Sign in to send trash talk");
    }

    // Can't trash talk yourself
    if (args.recipientId === user._id) return null;

    // Dedup: one message per session per opponent
    const existing = await ctx.db
      .query("trashTalks")
      .withIndex("by_sender_recipient_session", (q) =>
        q
          .eq("senderId", user._id)
          .eq("recipientId", args.recipientId)
          .eq("sessionTimestamp", args.sessionTimestamp)
      )
      .unique();

    if (existing) return null;

    // Age bracket check: under-18 can only send presets
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    if (args.isPreset) {
      const valid = TRASH_TALK_PRESETS.some((p) => p.key === args.message);
      if (!valid) throw new Error("Invalid preset message");
    } else {
      const isMinor =
        player.ageBracket === "under-11" ||
        player.ageBracket === "11-13" ||
        player.ageBracket === "14-18";
      if (isMinor) throw new Error("Custom messages require 18+ age bracket");
      if (args.message.length > TRASH_TALK_MAX_LENGTH) {
        throw new Error(`Message must be ${TRASH_TALK_MAX_LENGTH} characters or less`);
      }
      if (args.message.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }
    }

    // Resolve preset key to text for storage
    const messageText = args.isPreset
      ? (TRASH_TALK_PRESETS.find((p) => p.key === args.message)?.text ??
          args.message)
      : args.message.trim();

    const month = getCurrentMonth();

    await ctx.db.insert("trashTalks", {
      senderId: user._id,
      senderName: player.name || "Anonymous",
      senderAvatar: player.avatarDataUri,
      recipientId: args.recipientId,
      message: messageText,
      isPreset: args.isPreset,
      h3Index: args.h3Index,
      resolution: args.resolution,
      areaLabel: args.areaLabel,
      wpm: args.wpm,
      month,
      sessionTimestamp: args.sessionTimestamp,
      timestamp: Date.now(),
    });

    return { sent: true };
  },
});

export const reactToTrashTalk = mutation({
  args: {
    trashTalkId: v.id("trashTalks"),
    reaction: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (isAnonymousAuthUser(user)) {
      throw new Error("Sign in to react");
    }

    const valid = (TRASH_TALK_REACTIONS as readonly string[]).includes(
      args.reaction
    );
    if (!valid) throw new Error("Invalid reaction");

    const doc = await ctx.db.get(args.trashTalkId);
    if (!doc) throw new Error("Message not found");
    if (doc.recipientId !== user._id) {
      throw new Error("Not your message to react to");
    }

    await ctx.db.patch(args.trashTalkId, { reaction: args.reaction });
  },
});

export const markRead = mutation({
  args: {
    trashTalkIds: v.array(v.id("trashTalks")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (isAnonymousAuthUser(user)) return;

    const now = Date.now();
    for (const id of args.trashTalkIds) {
      const doc = await ctx.db.get(id);
      if (doc && doc.recipientId === user._id && !doc.readAt) {
        await ctx.db.patch(id, { readAt: now });
      }
    }
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;
    if (isAnonymousAuthUser(user)) return 0;

    // Query unread messages (readAt is undefined)
    const unread = await ctx.db
      .query("trashTalks")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientId", user._id).eq("readAt", undefined)
      )
      .collect();

    return unread.length;
  },
});

export const getThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];
    if (isAnonymousAuthUser(user)) return [];

    // Fetch messages where user is recipient
    const received = await ctx.db
      .query("trashTalks")
      .withIndex("by_recipient_timestamp", (q) =>
        q.eq("recipientId", user._id)
      )
      .order("desc")
      .collect();

    // Fetch messages where user is sender
    const sent = await ctx.db
      .query("trashTalks")
      .withIndex("by_sender_timestamp", (q) => q.eq("senderId", user._id))
      .order("desc")
      .collect();

    // Group by opponent
    const threadMap = new Map<
      string,
      {
        opponentId: string;
        latestMessage: string;
        latestTimestamp: number;
        unreadCount: number;
        isSender: boolean;
      }
    >();

    for (const msg of received) {
      const existing = threadMap.get(msg.senderId);
      if (!existing || msg.timestamp > existing.latestTimestamp) {
        threadMap.set(msg.senderId, {
          opponentId: msg.senderId,
          latestMessage: msg.message,
          latestTimestamp: msg.timestamp,
          unreadCount: (existing?.unreadCount ?? 0) + (msg.readAt ? 0 : 1),
          isSender: false,
        });
      } else {
        existing.unreadCount += msg.readAt ? 0 : 1;
      }
    }

    for (const msg of sent) {
      const existing = threadMap.get(msg.recipientId);
      if (!existing || msg.timestamp > existing.latestTimestamp) {
        threadMap.set(msg.recipientId, {
          opponentId: msg.recipientId,
          latestMessage: msg.message,
          latestTimestamp: msg.timestamp,
          unreadCount: existing?.unreadCount ?? 0,
          isSender: true,
        });
      }
    }

    // Fetch opponent player info
    const threads = [];
    for (const thread of threadMap.values()) {
      const opponent = await ctx.db
        .query("players")
        .withIndex("by_userId", (q) => q.eq("userId", thread.opponentId))
        .unique();

      threads.push({
        opponentId: thread.opponentId,
        opponentName: opponent?.name || "Anonymous",
        opponentAvatar: opponent?.avatarDataUri ?? null,
        latestMessage: thread.latestMessage,
        latestTimestamp: thread.latestTimestamp,
        unreadCount: thread.unreadCount,
        isSender: thread.isSender,
      });
    }

    // Sort by latest timestamp descending
    threads.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    return threads;
  },
});

export const getThread = query({
  args: { opponentId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return { messages: [], opponent: null };
    if (isAnonymousAuthUser(user)) return { messages: [], opponent: null };

    // Messages where user is recipient from this opponent
    const received = await ctx.db
      .query("trashTalks")
      .withIndex("by_recipient_timestamp", (q) =>
        q.eq("recipientId", user._id)
      )
      .order("desc")
      .collect();

    const fromOpponent = received.filter(
      (m) => m.senderId === args.opponentId
    );

    // Messages where user is sender to this opponent
    const sent = await ctx.db
      .query("trashTalks")
      .withIndex("by_sender_timestamp", (q) => q.eq("senderId", user._id))
      .order("desc")
      .collect();

    const toOpponent = sent.filter(
      (m) => m.recipientId === args.opponentId
    );

    // Merge and sort
    const messages = [...fromOpponent, ...toOpponent].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Opponent info
    const opponent = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.opponentId))
      .unique();

    return {
      messages,
      opponent: opponent
        ? {
            name: opponent.name || "Anonymous",
            avatarDataUri: opponent.avatarDataUri ?? null,
          }
        : null,
    };
  },
});

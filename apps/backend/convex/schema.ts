import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    userId: v.string(),
    name: v.string(),
    message: v.string(),
    location: v.optional(
      v.object({ lat: v.float64(), lng: v.float64() })
    ),
    avatarOptions: v.optional(v.string()), // JSON-serialized AvatarOptions
    avatarDataUri: v.optional(v.string()),
    ageBracket: v.optional(
      v.union(
        v.literal("under-11"),
        v.literal("11-13"),
        v.literal("14-18"),
        v.literal("18+")
      )
    ),
    country: v.optional(v.string()),
    locationLabel: v.optional(v.string()), // "City, State" from reverse geocode
    emailDomain: v.optional(v.string()),
    email: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()), // undefined = opted in
  })
    .index("by_userId", ["userId"])
    .index("by_emailDomain", ["emailDomain"]),

  sessions: defineTable({
    userId: v.string(),
    wpm: v.float64(),
    accuracy: v.float64(),
    maxCombo: v.float64(),
    correctCharacters: v.float64(),
    totalCharacters: v.float64(),
    timestamp: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_timestamp", ["userId", "timestamp"])
    .index("by_wpm", ["wpm"]),

  playerStats: defineTable({
    userId: v.string(),
    totalXP: v.float64(),
    currentStreak: v.float64(),
    bestStreak: v.float64(),
    lastSessionDate: v.optional(v.string()),
    totalSessions: v.float64(),
    bestWpm: v.float64(),
    bestAccuracy: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_totalXP", ["totalXP"])
    .index("by_bestWpm", ["bestWpm"]),

  claims: defineTable({
    h3Index: v.string(),
    resolution: v.float64(),
    userId: v.string(),
    playerName: v.string(),
    message: v.string(),
    wpm: v.float64(),
    accuracy: v.float64(),
    month: v.string(),
  })
    .index("by_month_res_hex", ["month", "resolution", "h3Index"])
    .index("by_month_userId", ["month", "userId"])
    .index("by_month_res", ["month", "resolution"]),

  scores: defineTable({
    userId: v.string(),
    h3Index: v.string(),
    wpm: v.float64(),
    accuracy: v.float64(),
    month: v.string(),
    timestamp: v.float64(),
  }).index("by_userId_month_hex", ["userId", "month", "h3Index"]),

  trashTalks: defineTable({
    senderId: v.string(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    recipientId: v.string(),
    message: v.string(),
    isPreset: v.boolean(),
    h3Index: v.string(),
    resolution: v.float64(),
    areaLabel: v.string(),
    wpm: v.float64(),
    month: v.string(),
    sessionTimestamp: v.float64(),
    reaction: v.optional(v.string()),
    readAt: v.optional(v.float64()),
    timestamp: v.float64(),
  })
    .index("by_recipient_read", ["recipientId", "readAt"])
    .index("by_recipient_timestamp", ["recipientId", "timestamp"])
    .index("by_sender_recipient_session", [
      "senderId",
      "recipientId",
      "sessionTimestamp",
    ])
    .index("by_sender_timestamp", ["senderId", "timestamp"]),
});

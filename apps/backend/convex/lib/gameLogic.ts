/** Shared pure functions used by both Convex mutations and client UI. */

export type XPBreakdown = {
  baseXP: number;
  speedXP: number;
  accuracyXP: number;
  comboXP: number;
  totalXP: number;
};

export type SessionInput = {
  wpm: number;
  accuracy: number;
  correctCharacters: number;
  maxCombo: number;
};

export function calculateXP(result: SessionInput): XPBreakdown {
  const baseXP = 10;
  const speedXP = Math.floor(result.correctCharacters / 5);
  const accuracyXP =
    result.accuracy >= 97
      ? 50
      : result.accuracy >= 95
        ? 25
        : result.accuracy >= 90
          ? 10
          : 0;
  const comboXP = Math.floor(result.maxCombo * 0.5);

  return {
    baseXP,
    speedXP,
    accuracyXP,
    comboXP,
    totalXP: baseXP + speedXP + accuracyXP + comboXP,
  };
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function levelFromXP(totalXP: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
} {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  return {
    level,
    currentXP: totalXP - currentLevelXP,
    nextLevelXP: nextLevelXP - currentLevelXP,
  };
}

export function todayUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function updateStreak(
  lastDate: string | null | undefined,
  currentStreak: number,
  today: string
): { streak: number; lastDate: string } {
  if (!lastDate) return { streak: 1, lastDate: today };
  if (lastDate === today) return { streak: currentStreak, lastDate: today };

  const last = new Date(lastDate + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const diffDays = Math.round(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) return { streak: currentStreak + 1, lastDate: today };
  return { streak: 1, lastDate: today };
}

export function scoreBeatsClaim(
  wpm: number,
  accuracy: number,
  claimWpm: number,
  claimAccuracy: number
): boolean {
  if (wpm > claimWpm) return true;
  if (wpm === claimWpm && accuracy > claimAccuracy) return true;
  return false;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Trash Talk ───────────────────────────────────────

export const TRASH_TALK_PRESETS = [
  { key: "too-slow", text: "Too slow." },
  { key: "my-hex", text: "My hex now." },
  { key: "easy", text: "That was easy." },
  { key: "come-get-it", text: "Come get it." },
  { key: "gg", text: "GG no re." },
  { key: "next-month", text: "See you next month." },
  { key: "faster", text: "Faster fingers win." },
  { key: "try-again", text: "Try again." },
] as const;

export type TrashTalkPresetKey = (typeof TRASH_TALK_PRESETS)[number]["key"];

export const TRASH_TALK_REACTIONS = [
  "😤",
  "😂",
  "😭",
  "🔥",
  "💀",
  "👀",
  "⚡",
] as const;

export type TrashTalkReaction = (typeof TRASH_TALK_REACTIONS)[number];

export const TRASH_TALK_MAX_LENGTH = 60;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "fastmail.com",
  "tutanota.com",
  "tuta.com",
]);

/** Extract an organizational email domain, returning undefined for free providers. */
export function extractOrganizationalDomain(
  email: string
): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || domain.length < 3 || !domain.includes(".")) return undefined;
  if (FREE_EMAIL_DOMAINS.has(domain)) return undefined;
  return domain;
}

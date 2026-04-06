/** H3 cell index as a hex string (e.g., "89283082837ffff") */
export type H3Index = string

/** Month key for rotation (e.g., "2026-04") */
export type MonthKey = string

export type AgeBracket = 'under-11' | '11-13' | '14-18' | '18+' | null

export type SessionResult = {
  wpm: number
  accuracy: number
  correctCharacters: number
  totalCharacters: number
  maxCombo: number
}

export type SessionHistoryEntry = {
  wpm: number
  accuracy: number
  maxCombo: number
  correctCharacters: number
  totalCharacters: number
  timestamp: number
}

export type Score = {
  h3Index: H3Index
  wpm: number
  accuracy: number
  timestamp: number
}

export type Claim = {
  h3Index: H3Index
  resolution: number
  playerName: string
  message: string
  wpm: number
  accuracy: number
  month: MonthKey
}

export type AvatarOptions = {
  seed: string
  hair?: string[]
  hairColor?: string[]
  eyes?: string[]
  eyebrows?: string[]
  mouth?: string[]
  skinColor?: string[]
  glasses?: string[]
  glassesProbability?: number
  earrings?: string[]
  earringsProbability?: number
  features?: string[]
  featuresProbability?: number
  backgroundColor?: string[]
}

export type Player = {
  id: string
  name: string
  message: string
  location: { lat: number; lng: number } | null
  avatarOptions: AvatarOptions | null
  avatarDataUri: string | null
  ageBracket: AgeBracket
  country: string | null
  emailDomain: string | null
}

export type DisplacedPlayer = {
  userId: string
  playerName: string
  avatarDataUri: string | null
  resolution: number
}

export type TrashTalk = {
  _id: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  recipientId: string
  message: string
  isPreset: boolean
  h3Index: string
  resolution: number
  areaLabel: string
  wpm: number
  month: string
  sessionTimestamp: number
  reaction: string | null
  readAt: number | null
  timestamp: number
}

export type TrashTalkThread = {
  opponentId: string
  opponentName: string
  opponentAvatar: string | null
  latestMessage: string
  latestTimestamp: number
  unreadCount: number
  isSender: boolean
}

export type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

export type PlayerStats = {
  totalXP: number
  level: number
  currentStreak: number
  bestStreak: number
  lastSessionDate: string | null
  totalSessions: number
  bestWpm: number
  bestAccuracy: number
}

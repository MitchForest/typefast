import type { AvatarOptions } from '../data/types'

export const HAIR_OPTIONS = [
  'long01',
  'long02',
  'long03',
  'long04',
  'long05',
  'long06',
  'long07',
  'long08',
  'long09',
  'long10',
  'long11',
  'long12',
  'long13',
  'long14',
  'long15',
  'long16',
  'long17',
  'long18',
  'long19',
  'long20',
  'long21',
  'long22',
  'long23',
  'long24',
  'long25',
  'long26',
  'short01',
  'short02',
  'short03',
  'short04',
  'short05',
  'short06',
  'short07',
  'short08',
  'short09',
  'short10',
  'short11',
  'short12',
  'short13',
  'short14',
  'short15',
  'short16',
  'short17',
  'short18',
  'short19',
] as const

export const EYES_OPTIONS = Array.from(
  { length: 26 },
  (_, i) => `variant${String(i + 1).padStart(2, '0')}`,
) as string[]
export const EYEBROWS_OPTIONS = Array.from(
  { length: 15 },
  (_, i) => `variant${String(i + 1).padStart(2, '0')}`,
) as string[]
export const MOUTH_OPTIONS = Array.from(
  { length: 30 },
  (_, i) => `variant${String(i + 1).padStart(2, '0')}`,
) as string[]
export const GLASSES_OPTIONS = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
] as const
export const EARRINGS_OPTIONS = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
] as const
export const FEATURES_OPTIONS = [
  'mustache',
  'blush',
  'birthmark',
  'freckles',
] as const

export const SKIN_COLORS = ['f2d3b1', 'ecad80', '9e5622', '763900'] as const
export const HAIR_COLORS = [
  'ac6511',
  'cb6820',
  'ab2a18',
  'e5d7a3',
  'b9a05f',
  '796a45',
  '6a4e35',
  '562306',
  '0e0e0e',
  'afafaf',
  '3eac2c',
  '85c2c6',
  'dba3be',
  '592454',
] as const
export const BACKGROUND_COLORS = [
  'b6e3f4',
  'c0aede',
  'd1d4f9',
  'ffd5dc',
  'ffdfbf',
  'f0e6d3',
  'd5f5e3',
  'fce4ec',
  'e8f5e9',
  'fff9c4',
  'e1f5fe',
  'f3e5f5',
  'transparent',
] as const

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomizeAvatarOptions(): AvatarOptions {
  // Pick a non-transparent background color for randomize
  const bgChoices = BACKGROUND_COLORS.filter((c) => c !== 'transparent')
  return {
    seed: crypto.randomUUID(),
    hair: [pick(HAIR_OPTIONS)],
    hairColor: [pick(HAIR_COLORS)],
    eyes: [pick(EYES_OPTIONS)],
    eyebrows: [pick(EYEBROWS_OPTIONS)],
    mouth: [pick(MOUTH_OPTIONS)],
    skinColor: [pick(SKIN_COLORS)],
    glasses: [pick(GLASSES_OPTIONS)],
    glassesProbability: Math.random() > 0.7 ? 100 : 0,
    earrings: [pick(EARRINGS_OPTIONS)],
    earringsProbability: Math.random() > 0.7 ? 100 : 0,
    features: [pick(FEATURES_OPTIONS)],
    featuresProbability: Math.random() > 0.6 ? 100 : 0,
    backgroundColor: [pick(bgChoices)],
  }
}

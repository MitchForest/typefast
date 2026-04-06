import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import type { AvatarOptions } from '../data/types'

export function generateAvatarSvg(options: AvatarOptions): string {
  const avatar = createAvatar(adventurer, {
    seed: options.seed,
    hair: options.hair,
    hairColor: options.hairColor,
    eyes: options.eyes,
    eyebrows: options.eyebrows,
    mouth: options.mouth,
    skinColor: options.skinColor,
    glasses: options.glasses,
    glassesProbability: options.glassesProbability,
    earrings: options.earrings,
    earringsProbability: options.earringsProbability,
    features: options.features,
    featuresProbability: options.featuresProbability,
    backgroundColor: options.backgroundColor,
    radius: 50,
  } as Record<string, unknown>)

  return avatar.toString()
}

export function generateAvatarDataUri(options: AvatarOptions): string {
  const svg = generateAvatarSvg(options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

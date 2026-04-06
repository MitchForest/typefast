import { useCallback, useMemo, useState } from 'react'
import type { AvatarOptions } from '../../data/types'
import '../../styles/avatar-maker.css'
import { AvatarDisplay } from './avatar-display'
import {
  HAIR_OPTIONS,
  HAIR_COLORS,
  EYES_OPTIONS,
  EYEBROWS_OPTIONS,
  MOUTH_OPTIONS,
  GLASSES_OPTIONS,
  EARRINGS_OPTIONS,
  FEATURES_OPTIONS,
  SKIN_COLORS,
  BACKGROUND_COLORS,
  randomizeAvatarOptions,
} from '../../lib/avatar'
import { generateAvatarDataUri } from '../../lib/avatar-render'

type AvatarMakerProps = {
  options: AvatarOptions
  onChange: (options: AvatarOptions, avatarDataUri: string) => void
}

type Category =
  | 'hair'
  | 'hairColor'
  | 'eyes'
  | 'eyebrows'
  | 'mouth'
  | 'skinColor'
  | 'glasses'
  | 'earrings'
  | 'features'
  | 'backgroundColor'

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'backgroundColor', label: 'BG', icon: '🖼' },
  { key: 'hair', label: 'Hair', icon: '💇' },
  { key: 'hairColor', label: 'Hair Color', icon: '🎨' },
  { key: 'eyes', label: 'Eyes', icon: '👁' },
  { key: 'eyebrows', label: 'Brows', icon: '🤨' },
  { key: 'mouth', label: 'Mouth', icon: '👄' },
  { key: 'skinColor', label: 'Skin', icon: '✋' },
  { key: 'glasses', label: 'Glasses', icon: '👓' },
  { key: 'earrings', label: 'Earrings', icon: '💎' },
  { key: 'features', label: 'Features', icon: '✨' },
]

function getOptionsForCategory(cat: Category): readonly string[] {
  switch (cat) {
    case 'hair':
      return HAIR_OPTIONS
    case 'hairColor':
      return HAIR_COLORS
    case 'eyes':
      return EYES_OPTIONS
    case 'eyebrows':
      return EYEBROWS_OPTIONS
    case 'mouth':
      return MOUTH_OPTIONS
    case 'skinColor':
      return SKIN_COLORS
    case 'glasses':
      return GLASSES_OPTIONS
    case 'earrings':
      return EARRINGS_OPTIONS
    case 'features':
      return FEATURES_OPTIONS
    case 'backgroundColor':
      return BACKGROUND_COLORS
  }
}

function getCurrentValue(options: AvatarOptions, cat: Category): string | null {
  const val = options[cat]
  if (Array.isArray(val) && val.length > 0) return val[0]
  return null
}

function getProbabilityKey(cat: Category): keyof AvatarOptions | null {
  if (cat === 'glasses') return 'glassesProbability'
  if (cat === 'earrings') return 'earringsProbability'
  if (cat === 'features') return 'featuresProbability'
  return null
}

function isColorCategory(cat: Category): boolean {
  return cat === 'hairColor' || cat === 'skinColor' || cat === 'backgroundColor'
}

function formatLabel(value: string): string {
  return value.replace(/^(long|short|variant)0?/, (_, prefix) => {
    if (prefix === 'long') return 'L'
    if (prefix === 'short') return 'S'
    return ''
  })
}

export function AvatarMaker({ options, onChange }: AvatarMakerProps) {
  const [activeCategory, setActiveCategory] =
    useState<Category>('backgroundColor')
  const previewDataUri = useMemo(
    () => generateAvatarDataUri(options),
    [options],
  )

  const handleRandomizeAll = useCallback(() => {
    const nextOptions = randomizeAvatarOptions()
    onChange(nextOptions, generateAvatarDataUri(nextOptions))
  }, [onChange])

  const handleSelectOption = useCallback(
    (cat: Category, value: string) => {
      const probKey = getProbabilityKey(cat)
      const update: Record<string, unknown> = { [cat]: [value] }
      if (probKey) update[probKey] = 100
      const nextOptions = { ...options, ...update } as AvatarOptions
      onChange(nextOptions, generateAvatarDataUri(nextOptions))
    },
    [options, onChange],
  )

  const handleToggleOff = useCallback(
    (cat: Category) => {
      const probKey = getProbabilityKey(cat)
      if (probKey) {
        const currentProb = options[probKey] as number | undefined
        const nextOptions = {
          ...options,
          [probKey]: currentProb === 0 ? 100 : 0,
        }
        onChange(nextOptions, generateAvatarDataUri(nextOptions))
      }
    },
    [options, onChange],
  )

  const handleRandomizeCategory = useCallback(
    (cat: Category) => {
      const vals = getOptionsForCategory(cat)
      const value = vals[Math.floor(Math.random() * vals.length)]
      const probKey = getProbabilityKey(cat)
      const update: Record<string, unknown> = { [cat]: [value] }
      if (probKey) update[probKey] = 100
      const nextOptions = { ...options, ...update } as AvatarOptions
      onChange(nextOptions, generateAvatarDataUri(nextOptions))
    },
    [options, onChange],
  )

  const categoryOptions = getOptionsForCategory(activeCategory)
  const currentValue = getCurrentValue(options, activeCategory)
  const probKey = getProbabilityKey(activeCategory)
  const isEnabled = probKey ? ((options[probKey] as number) ?? 0) > 0 : true
  const isColor = isColorCategory(activeCategory)

  // Generate preview thumbnails for current category
  const thumbnails = useMemo(() => {
    return categoryOptions.map((value) => {
      const preview = { ...options, [activeCategory]: [value] }
      const pKey = getProbabilityKey(activeCategory)
      if (pKey) (preview as Record<string, unknown>)[pKey] = 100
      return {
        value,
        dataUri: generateAvatarDataUri(preview),
      }
    })
  }, [options, activeCategory, categoryOptions])

  return (
    <div className="avatar-maker">
      {/* Preview */}
      <div className="avatar-maker-preview">
        <AvatarDisplay src={previewDataUri} size={140} />
        <button
          className="btn-3d btn-go btn-sm avatar-maker-randomize"
          onClick={handleRandomizeAll}
          type="button"
        >
          Randomize
        </button>
      </div>

      {/* Category Tabs */}
      <div className="avatar-maker-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`avatar-maker-tab ${activeCategory === cat.key ? 'avatar-maker-tab-active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
            type="button"
            title={cat.label}
          >
            <span className="avatar-maker-tab-icon">{cat.icon}</span>
            <span className="avatar-maker-tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Options Grid */}
      <div className="avatar-maker-section">
        <div className="avatar-maker-section-header">
          <span className="avatar-maker-section-title">
            {CATEGORIES.find((c) => c.key === activeCategory)?.label}
          </span>
          <div className="avatar-maker-section-actions">
            {probKey && (
              <button
                className={`btn-3d btn-sm ${isEnabled ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => handleToggleOff(activeCategory)}
                type="button"
              >
                {isEnabled ? 'On' : 'Off'}
              </button>
            )}
            <button
              className="btn-3d btn-sm btn-secondary"
              onClick={() => handleRandomizeCategory(activeCategory)}
              type="button"
            >
              Shuffle
            </button>
          </div>
        </div>

        <div
          className={`avatar-maker-grid ${isColor ? 'avatar-maker-grid-colors' : ''}`}
        >
          {thumbnails.map(({ value, dataUri }) => {
            const isSelected = currentValue === value && isEnabled
            return isColor ? (
              <button
                key={value}
                className={`avatar-maker-color-swatch ${isSelected ? 'avatar-maker-swatch-selected' : ''} ${value === 'transparent' ? 'avatar-maker-swatch-none' : ''}`}
                style={
                  value === 'transparent'
                    ? undefined
                    : { background: `#${value}` }
                }
                onClick={() => handleSelectOption(activeCategory, value)}
                type="button"
                title={value === 'transparent' ? 'None' : `#${value}`}
                aria-label={
                  value === 'transparent' ? 'No background' : `Color #${value}`
                }
              >
                {value === 'transparent' && (
                  <span className="avatar-maker-swatch-none-label">None</span>
                )}
              </button>
            ) : (
              <button
                key={value}
                className={`avatar-maker-option ${isSelected ? 'avatar-maker-option-selected' : ''}`}
                onClick={() => handleSelectOption(activeCategory, value)}
                type="button"
                title={value}
              >
                <img
                  src={dataUri}
                  alt={value}
                  className="avatar-maker-option-img"
                  draggable={false}
                />
                <span className="avatar-maker-option-label">
                  {formatLabel(value)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

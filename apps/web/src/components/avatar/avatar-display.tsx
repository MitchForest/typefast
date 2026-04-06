import '../../styles/avatar-display.css'

type AvatarDisplayProps = {
  src?: string | null
  name?: string
  size: number
  className?: string
}

export function AvatarDisplay({
  src,
  name,
  size,
  className,
}: AvatarDisplayProps) {
  const style = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt="Avatar"
        className={`avatar-display ${className ?? ''}`}
        style={style}
        draggable={false}
      />
    )
  }

  // Fallback: letter initial
  return (
    <div
      className={`avatar-display avatar-display-fallback ${className ?? ''}`}
      style={{
        ...style,
        fontSize: size * 0.45,
      }}
      aria-label="Avatar"
    >
      {(name || 'A').charAt(0).toUpperCase()}
    </div>
  )
}

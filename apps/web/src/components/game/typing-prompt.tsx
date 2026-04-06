import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'

export interface PromptGlyphSnapshot {
  char: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

export interface PromptLaunchSnapshot {
  index: number
  rect: DOMRect
}

export interface TypingPromptHandle {
  syncAttempt(attempt: string): PromptLaunchSnapshot[]
  collectVisibleTypedCharacters(
    attempt: string,
    correctColor: string,
    missColor: string,
  ): PromptGlyphSnapshot[]
}

type TypingPromptProps = {
  prompt: string
}

function getCharClassName(
  prompt: string,
  attempt: string,
  index: number,
): string {
  const typed = attempt[index]
  let className = 'char'

  if (typed == null) {
    if (index === attempt.length) {
      className += ' char-current'
    }
  } else if (typed === prompt[index]) {
    className += ' char-correct'
  } else {
    className += ' char-wrong'
  }

  return className
}

function findFirstDifference(previous: string, next: string): number {
  const sharedLength = Math.min(previous.length, next.length)

  for (let index = 0; index < sharedLength; index += 1) {
    if (previous[index] !== next[index]) {
      return index
    }
  }

  return sharedLength
}

function getFocusOffset(spans: Array<HTMLSpanElement | null>, index: number): number {
  const currentChar = spans[index]

  if (!currentChar) {
    return 0
  }

  const currentLineTop = currentChar.offsetTop

  if (currentLineTop <= 0) {
    return 0
  }

  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const span = spans[previousIndex]

    if (!span) {
      continue
    }

    if (span.offsetTop < currentLineTop) {
      return span.offsetTop
    }
  }

  return 0
}

export const TypingPrompt = memo(
  forwardRef<TypingPromptHandle, TypingPromptProps>(function TypingPrompt(
    { prompt },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const spanRefs = useRef<Array<HTMLSpanElement | null>>([])
    const renderedAttemptRef = useRef('')
    const characters = useMemo(() => prompt.split(''), [prompt])

    function applyCharState(attempt: string, index: number) {
      const span = spanRefs.current[index]

      if (!span) {
        return
      }

      span.className = getCharClassName(prompt, attempt, index)
    }

    function updateFocusZone(attempt: string) {
      const root = rootRef.current

      if (!root) {
        return
      }

      const currentChar = spanRefs.current[attempt.length]

      if (!currentChar) {
        root.style.transform = 'translateY(0px)'
        return
      }

      const target = getFocusOffset(spanRefs.current, attempt.length)
      root.style.transform = `translateY(-${target}px)`
    }

    useImperativeHandle(
      ref,
      () => ({
        syncAttempt(attempt) {
          const previousAttempt = renderedAttemptRef.current
          const launchSnapshots: PromptLaunchSnapshot[] = []
          const isForwardAppend =
            attempt.length > previousAttempt.length &&
            attempt.startsWith(previousAttempt)

          if (attempt !== previousAttempt) {
            const firstDifference = findFirstDifference(
              previousAttempt,
              attempt,
            )
            const lastIndex = Math.min(
              prompt.length - 1,
              Math.max(previousAttempt.length, attempt.length),
            )

            for (let index = firstDifference; index <= lastIndex; index += 1) {
              applyCharState(attempt, index)
            }

            applyCharState(attempt, previousAttempt.length)
            applyCharState(attempt, attempt.length)

            if (isForwardAppend) {
              for (
                let index = previousAttempt.length;
                index < attempt.length;
                index += 1
              ) {
                const rect = spanRefs.current[index]?.getBoundingClientRect()

                if (!rect) {
                  continue
                }

                launchSnapshots.push({ index, rect })
              }
            }

            renderedAttemptRef.current = attempt
          }

          updateFocusZone(attempt)
          return launchSnapshots
        },

        collectVisibleTypedCharacters(attempt, correctColor, missColor) {
          const glyphs: PromptGlyphSnapshot[] = []
          const typedCount = Math.min(attempt.length, spanRefs.current.length)
          const viewportRect = rootRef.current?.parentElement?.getBoundingClientRect()

          for (
            let index = Math.max(0, typedCount - 80);
            index < typedCount;
            index += 1
          ) {
            const span = spanRefs.current[index]

            if (!span) {
              continue
            }

            const rect = span.getBoundingClientRect()

            if (
              viewportRect &&
              (rect.bottom < viewportRect.top || rect.top > viewportRect.bottom)
            ) {
              continue
            }

            if (rect.top < -50 || rect.top > window.innerHeight + 50) {
              continue
            }

            glyphs.push({
              char: prompt[index],
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              w: rect.width,
              h: rect.height,
              color:
                attempt[index] === prompt[index] ? correctColor : missColor,
            })
          }

          return glyphs
        },
      }),
      [prompt],
    )

    useEffect(() => {
      renderedAttemptRef.current = ''
      spanRefs.current.length = characters.length
      rootRef.current?.style.removeProperty('transform')
    }, [characters.length])

    return (
      <div className="prompt" ref={rootRef} aria-hidden="true">
        {characters.map((character, index) => (
          <span
            className={index === 0 ? 'char char-current' : 'char'}
            key={`${character}-${index}`}
            ref={(element) => {
              spanRefs.current[index] = element
            }}
          >
            {character}
          </span>
        ))}
      </div>
    )
  }),
)

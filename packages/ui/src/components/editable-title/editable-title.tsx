import React from 'react'

interface EditableTitleProps {
  value: string
  onChange: (newValue: string) => Promise<void>
  placeholder?: string
  className?: string
}

export const EditableTitle = ({
  value,
  onChange,
  placeholder = 'Enter title...',
  className = '',
}: EditableTitleProps) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const textMeasureRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  const getCharacterPosition = (clickX: number): number => {
    if (!textMeasureRef.current || !inputRef.current) {
      return 0
    }

    const rect = inputRef.current.getBoundingClientRect()
    const relativeX = clickX - rect.left

    // Create a temporary span to measure text width
    const span = textMeasureRef.current
    span.style.font = window.getComputedStyle(inputRef.current).font
    span.style.visibility = 'hidden'
    span.style.position = 'absolute'
    span.style.whiteSpace = 'pre'

    // Binary search to find the closest character position
    let left = 0
    let right = value.length
    let closest = 0
    let minDiff = Infinity

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      span.textContent = value.substring(0, mid)
      const spanWidth = span.getBoundingClientRect().width
      const diff = Math.abs(spanWidth - relativeX)

      if (diff < minDiff) {
        minDiff = diff
        closest = mid
      }

      if (spanWidth < relativeX) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return Math.max(0, Math.min(closest, value.length))
  }

  const handleStartEdit = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading) {
      return // Prevent editing while loading
    }
    setIsEditing(true)
    setEditValue(value)

    // Focus the input after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()

        // Calculate cursor position based on click location
        const charIndex = getCharacterPosition(e.clientX)
        inputRef.current.setSelectionRange(charIndex, charIndex)
      }
    }, 0)
  }

  const handleSave = async () => {
    if (editValue.trim() !== value && !isLoading) {
      setIsLoading(true)
      try {
        await onChange(editValue.trim())
        setIsEditing(false)
      } catch {
        // On error, revert to the original value and stay in edit mode
        setEditValue(value)
        // Keep editing mode open so user can try again
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    void handleSave()
  }

  // Common styles for both div and input to prevent visual shift
  const commonStyles =
    'scroll-m-20 text-2xl font-semibold leading-tight tracking-tight'

  // Common inline styles to ensure identical rendering
  const commonInlineStyles: React.CSSProperties = {
    lineHeight: '1.25',
    verticalAlign: 'baseline',
    margin: 0,
    padding: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    display: 'block',
    boxSizing: 'border-box',
  }

  return (
    <div>
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`${commonStyles} ${className} ${isLoading ? 'opacity-50' : ''}`}
            style={commonInlineStyles}
            disabled={isLoading}
          />
          <span
            ref={textMeasureRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'pre',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <div
          onClick={handleStartEdit}
          className={`${commonStyles} dark:hover:bg-gray-800 -mx-1 flex cursor-text items-center rounded px-1 transition-colors hover:bg-gray-100 ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isLoading ? 'Saving...' : 'Click to edit'}
          style={commonInlineStyles}
          role="heading"
          aria-level={3}
        >
          {value}
        </div>
      )}
    </div>
  )
}

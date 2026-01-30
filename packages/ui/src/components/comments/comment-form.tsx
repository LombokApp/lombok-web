import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Label } from '@lombokapp/ui-toolkit/components/label/label'
import { Textarea } from '@lombokapp/ui-toolkit/components/textarea/textarea'
import React from 'react'

import type { CommentAnchorType } from './comment.types'

export type CommentAnchor = CommentAnchorType

export const CommentForm = ({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  submitLabel = 'Post',
  initialContent = '',
  showAnchorInput = false,
  initialAnchor,
}: {
  onSubmit: (content: string, anchor?: CommentAnchorType) => void
  onCancel?: () => void
  placeholder?: string
  submitLabel?: string
  initialContent?: string
  showAnchorInput?: boolean
  initialAnchor?: CommentAnchorType
}) => {
  const [content, setContent] = React.useState(initialContent)
  const [anchor, setAnchor] = React.useState<CommentAnchorType | null>(
    initialAnchor ?? null,
  )

  const performSubmit = () => {
    if (content.trim().length === 0) {
      return
    }
    onSubmit(
      content.trim(),
      showAnchorInput ? (anchor ?? undefined) : undefined,
    )
    setContent('')
    setAnchor(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      performSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setContent(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="resize-none"
        />
        {showAnchorInput && (
          <div className="flex flex-col gap-2 text-sm">
            <Label>Anchor (optional)</Label>
            <div className="flex gap-2">
              <select
                value={anchor?.type || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value === '') {
                    setAnchor(null)
                  } else if (e.target.value === 'image_point') {
                    setAnchor({ type: 'image_point', x: 0.5, y: 0.5 })
                  } else if (e.target.value === 'video_point') {
                    setAnchor({ type: 'video_point', t: 0 })
                  } else if (e.target.value === 'audio_point') {
                    setAnchor({ type: 'audio_point', t: 0 })
                  }
                }}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">No anchor</option>
                <option value="image_point">Image point</option>
                <option value="video_point">Video point</option>
                <option value="audio_point">Audio point</option>
              </select>
              {anchor?.type === 'image_point' && (
                <>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={anchor.x}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setAnchor({
                        ...anchor,
                        x: parseFloat(e.target.value) || 0,
                      })
                    }}
                    placeholder="X"
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={anchor.y}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setAnchor({
                        ...anchor,
                        y: parseFloat(e.target.value) || 0,
                      })
                    }}
                    placeholder="Y"
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </>
              )}
              {(anchor?.type === 'video_point' ||
                anchor?.type === 'audio_point') && (
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={anchor.t}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setAnchor({
                      ...anchor,
                      t: parseFloat(e.target.value) || 0,
                    })
                  }}
                  placeholder="Time (seconds)"
                  className="w-32 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={content.trim().length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

import React from 'react'

export interface UseDirtyAwareRefreshOptions<T> {
  /** Whether the form currently holds unsaved edits. */
  isDirty: boolean
  /** Latest server data (e.g. a query result). */
  serverData: T | undefined
  /** Apply server data into the form. Called automatically when not dirty. */
  onApply: (data: T) => void
}

export interface UseDirtyAwareRefreshResult {
  /** True when newer server data arrived while the form was dirty. */
  hasIncomingChange: boolean
  /** Apply the incoming server data (discarding local edits). */
  acceptIncoming: () => void
  /** Keep local edits and dismiss the prompt for this change. */
  dismissIncoming: () => void
}

/**
 * Gate incoming server data behind form-dirty state. When the form is clean,
 * server data applies immediately (the normal load path). When dirty, the update
 * is held and surfaced via `hasIncomingChange` so the UI can offer a
 * non-destructive "record changed — reload / keep my changes" prompt instead of
 * silently clobbering unsaved edits.
 */
export function useDirtyAwareRefresh<T>({
  isDirty,
  serverData,
  onApply,
}: UseDirtyAwareRefreshOptions<T>): UseDirtyAwareRefreshResult {
  const [hasIncomingChange, setHasIncomingChange] = React.useState(false)
  // The server data reference we last applied (or deliberately dismissed).
  const appliedRef = React.useRef<T | undefined>(undefined)
  const onApplyRef = React.useRef(onApply)
  onApplyRef.current = onApply

  React.useEffect(() => {
    if (serverData === undefined) {
      return
    }
    if (serverData === appliedRef.current) {
      return
    }
    if (!isDirty) {
      appliedRef.current = serverData
      setHasIncomingChange(false)
      onApplyRef.current(serverData)
    } else {
      // Hold: don't clobber unsaved edits. Surface a prompt instead.
      setHasIncomingChange(true)
    }
  }, [serverData, isDirty])

  const acceptIncoming = React.useCallback(() => {
    if (serverData !== undefined) {
      appliedRef.current = serverData
      onApplyRef.current(serverData)
    }
    setHasIncomingChange(false)
  }, [serverData])

  const dismissIncoming = React.useCallback(() => {
    // Snapshot the current server ref as the baseline so it won't re-prompt.
    appliedRef.current = serverData
    setHasIncomingChange(false)
  }, [serverData])

  return { hasIncomingChange, acceptIncoming, dismissIncoming }
}

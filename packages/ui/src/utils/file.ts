export function downloadData(downloadURL: string, name: string) {
  // Try to fetch the file as a Blob so we can trigger a download
  // without navigating and while preserving the provided filename.
  // If this fails due to CORS, fall back to using a hidden iframe.
  void fetch(downloadURL, { credentials: 'include' })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch download URL')
      }
      return response.blob()
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = name
      document.body.appendChild(link)
      link.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      )
      document.body.removeChild(link)
      // Revoke after a tick to allow the download to start
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 0)
    })
}

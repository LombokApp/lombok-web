export function downloadData(downloadURL: string, name: string) {
  // Fetch the file as a Blob so we can trigger a download without navigating
  // and while preserving the provided filename. The URL is a presigned S3 URL
  // (auth is in the signature), so the request must be non-credentialed: a
  // cross-origin credentialed fetch is rejected against a wildcard CORS origin,
  // which is what S3 backends like Garage return.
  void fetch(downloadURL)
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

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes >= 1024 && bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  } else if (bytes >= 1024 * 1024 && bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  } else if (bytes > 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }
}

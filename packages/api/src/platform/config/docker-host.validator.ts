// ---- Path validators ----

// Windows drive letter paths: C:\foo\bar or C:/foo/bar
const winDrivePath = /^[a-zA-Z]:[\\/](?:[^<>:"|?*\\/\0]+[\\/]?)*$/
const winForwardDrivePath = /^[a-zA-Z]:\/(?:[^<>:"|?*\\/\0]+\/?)*$/

// UNC paths: \\server\share\folder
const uncPath =
  /^\\\\[^<>:"|?*\\/\0]+\\[^<>:"|?*\\/\0]+(?:[\\/][^<>:"|?*\\/\0]+)*$/

// Linux absolute: /foo/bar
const linuxAbsPath = /^\/(?:[^/\0]+\/?)*$/

// ---- HTTP(S) endpoint validator ----

const isValidHttpEndpoint = (value: string): boolean => {
  if (!/^https?:\/\//i.test(value)) {
    return false
  }

  try {
    // Will throw for invalid URLs
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const isValidDockerHostPathOrHttp = (value: string): boolean => {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }

  // HTTP(S) endpoints
  if (isValidHttpEndpoint(value)) {
    return true
  }

  // Windows paths
  if (winDrivePath.test(value)) {
    return true
  }
  if (winForwardDrivePath.test(value)) {
    return true
  }
  if (uncPath.test(value)) {
    return true
  }

  // Linux-style absolute paths
  if (linuxAbsPath.test(value)) {
    return true
  }

  return false
}

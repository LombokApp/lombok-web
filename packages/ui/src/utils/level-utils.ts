export const getLevelColor = (level: string): string => {
  switch (level) {
    case 'ERROR':
      return 'bg-red-500'
    case 'WARN':
      return 'bg-yellow-500'
    case 'INFO':
      return 'bg-blue-500'
    case 'DEBUG':
      return 'bg-gray-500'
    case 'TRACE':
      return 'bg-gray-400'
    default:
      return 'bg-gray-500'
  }
}

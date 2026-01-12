export const formatBytes = (bytes: bigint | number | string) => {
  let bytesBigInt: bigint
  if (typeof bytes === 'bigint') {
    bytesBigInt = bytes
  } else if (typeof bytes === 'string') {
    try {
      bytesBigInt = BigInt(bytes)
    } catch {
      // Invalid string, return 0 B
      return '0 B'
    }
  } else {
    bytesBigInt = BigInt(bytes)
  }

  if (bytesBigInt === BigInt(0)) {
    return '0 B'
  }

  const k = BigInt(1024)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  let value = bytesBigInt
  let unitIndex = 0

  // Find the appropriate unit using bigint comparisons
  while (value >= k && unitIndex < sizes.length - 1) {
    value = value / k
    unitIndex++
  }

  // Calculate decimal precision for units above bytes
  if (unitIndex > 0) {
    // Calculate divisor: k^unitIndex using repeated multiplication
    let divisor = BigInt(1)
    for (let i = 0; i < unitIndex; i++) {
      divisor = divisor * k
    }

    const wholePart = bytesBigInt / divisor
    const remainder = bytesBigInt % divisor
    // Convert remainder to a decimal: remainder * 100 / divisor
    const decimalPart = Number((remainder * BigInt(100)) / divisor) / 100
    const totalValue = Number(wholePart) + decimalPart
    return `${totalValue.toFixed(2)} ${sizes[unitIndex]}`
  }

  return `${value.toString()} ${sizes[unitIndex]}`
}

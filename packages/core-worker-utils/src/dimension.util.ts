/**
 * Calculates output dimensions based on input dimensions and a maximum dimension constraint.
 * The output dimensions are constrained such that the largest dimension is no bigger than
 * the max dimension, and the other dimension is scaled proportionally.
 *
 * @param inputWidth - The input width
 * @param inputHeight - The input height
 * @param maxDimension - The maximum allowed dimension (applied to the larger of width or height)
 * @returns Object containing the calculated output width and height
 */
export function calculateOutputDimensions({
  inputWidth,
  inputHeight,
  maxDimension,
}: {
  inputWidth: number
  inputHeight: number
  maxDimension: number
}): { width: number; height: number } {
  if (inputWidth <= 0 || inputHeight <= 0) {
    throw new Error('Input dimensions must be positive numbers')
  }

  if (maxDimension <= 0) {
    throw new Error('Max dimension must be a positive number')
  }

  // If both dimensions are already within the constraint, return as-is
  if (inputWidth <= maxDimension && inputHeight <= maxDimension) {
    return {
      width: Math.round(inputWidth),
      height: Math.round(inputHeight),
    }
  }

  // Calculate the scale factor based on the larger dimension
  const scaleFactor = maxDimension / Math.max(inputWidth, inputHeight)

  return {
    width: Math.round(inputWidth * scaleFactor),
    height: Math.round(inputHeight * scaleFactor),
  }
}

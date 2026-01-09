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
  rotation,
}: {
  inputWidth: number
  inputHeight: number
  maxDimension: number
  rotation: number
}): { width: number; height: number } {
  if (inputWidth <= 0 || inputHeight <= 0) {
    throw new Error('Input dimensions must be positive numbers')
  }
  const aspectFlipped = [5, 6, 7, 8].includes(rotation)
  const [width, height] = aspectFlipped
    ? [inputHeight, inputWidth]
    : [inputWidth, inputHeight]

  if (maxDimension <= 0) {
    throw new Error('Max dimension must be a positive number')
  }

  // If both dimensions are already within the constraint, return as-is
  if (width <= maxDimension && height <= maxDimension) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  // Calculate the scale factor based on the larger dimension
  const scaleFactor = maxDimension / Math.max(width, height)

  return {
    width: Math.round(width * scaleFactor),
    height: Math.round(height * scaleFactor),
  }
}

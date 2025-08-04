export const dataURLToText = (dataURL: string): string => {
  try {
    // Extract the base64 part from the dataURL
    const base64Data = dataURL.split(',')[1]
    if (!base64Data) {
      return ''
    }

    // Decode base64 to text
    const decodedText = atob(base64Data)
    return decodedText
  } catch (error) {
    console.error('Error converting dataURL to text:', error)
    return ''
  }
}

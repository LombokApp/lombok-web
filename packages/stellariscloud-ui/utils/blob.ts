export const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',')
  const mime = dataurl.substring(dataurl.indexOf(':') + 1, dataurl.indexOf(';'))
  //   const bstr = Buffer.from(arr[1], 'base64')
  //   const bstr = atob(arr[1])
  const bstr = Buffer.from(arr[1], 'base64').toString()
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export const blobToBase64 = (blob: Blob): Promise<string> => {
  const reader = new FileReader()
  return new Promise((resolve, _reject) => {
    reader.readAsDataURL(blob)
    reader.onload = function () {
      resolve(reader.result as string)
    }
  })
}

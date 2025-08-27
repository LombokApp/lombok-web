export const encodeS3ObjectKey = (objectKey: string) => {
  return encodeURIComponent(objectKey).replace(/%2F/g, '/')
}

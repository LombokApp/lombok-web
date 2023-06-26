export const awsCallback =
  (resolve: (a: any) => void, reject: (e: Error) => void) =>
  (err: Error | null, data: any) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  }

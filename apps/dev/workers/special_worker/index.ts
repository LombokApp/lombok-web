import { CoreServerMessageInterface } from '@stellariscloud/app-worker-sdk'

export default async function main(serverClient: CoreServerMessageInterface) {
  console.log('SPECIAL THING WORKER!!!!!')
  const urls = await serverClient.getContentSignedUrls([
    {
      folderId: 'b85646a9-3c5c-40c6-afe8-6035fdb827da',
      objectKey: 'testobjectkey',
      method: 'GET',
    },
  ])
  console.log({ urls })
}

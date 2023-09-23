import React from 'react'

import { Button } from '../../design-system/button/button'
import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'

interface FormValues {
  endpoint: string
  name: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export const CreateS3ConnectionForm = ({
  onSubmit,
  onCancel,
  onTest,
}: {
  onCancel: () => void
  onSubmit: (values: FormValues) => void
  onTest: (values: FormValues) => Promise<{ success: boolean }>
}) => {
  const form = useFormState<FormValues>(
    {
      endpoint: 'https://m8.wasteofpaper.com',
      accessKeyId: 'RNrNbAQIIUiomuxB',
      name: 'Untitled',
      region: 'utrecht-1',
      secretAccessKey: '9wZT2IDNzQUSRkZielytM1UD88FAO6xa',
    },
    {
      endpoint: (value: string | undefined) => ({ valid: !!value }),
      name: (value: string | undefined) => ({ valid: !!value }),
      region: (value: string | undefined) => ({
        valid: typeof value === 'string',
      }),
      accessKeyId: (value: string | undefined) => ({ valid: !!value }),
      secretAccessKey: (value: string | undefined) => ({ valid: !!value }),
    },
  )
  const [s3ConnectionTestSuccess, setS3ConnectionTestSuccess] =
    React.useState<boolean>()

  const handleTestConnection = async () => {
    const { success } = await onTest(form.getValues())
    setS3ConnectionTestSuccess(success)
  }

  return (
    <div className="rounded-xl p-4 border border-gray-900/10 dark:border-white/10 dark:bg-white/5 min-w-[48rem]">
      <div className="flex flex-col gap-4 justify-stretch">
        <Input
          label="Name"
          value={form.state.fields.name.value}
          onChange={(e) => form.setValue('name', e.target.value)}
        />
        <Input
          label="Endpoint"
          value={form.state.fields.endpoint.value}
          onChange={(e) => form.setValue('endpoint', e.target.value)}
        />
        <Input
          label="Region"
          value={form.state.fields.region.value}
          onChange={(e) => form.setValue('region', e.target.value)}
        />
        <Input
          label="Access Key ID"
          value={form.state.fields.accessKeyId.value}
          onChange={(e) => form.setValue('accessKeyId', e.target.value)}
        />
        <Input
          className="w-full"
          label="Secret Access Key"
          value={form.state.fields.secretAccessKey.value}
          onChange={(e) => form.setValue('secretAccessKey', e.target.value)}
        />
        {s3ConnectionTestSuccess === false && (
          <div className="p-4 border border-red-500 rounded-lg">
            The S3 connection test failed. If the credentials you&apos;re using
            don&apos;t have permission for the ListBuckets command, then this
            may be a false negative.
          </div>
        )}
        {s3ConnectionTestSuccess === true && (
          <div className="p-4 border border-green-500 rounded-lg">
            The S3 connection test was successful.
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => void handleTestConnection()}
            disabled={!form.state.valid}
          >
            Test
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => onSubmit(form.getValues())}
            disabled={!form.state.valid}
            primary
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

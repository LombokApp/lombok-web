import type { S3ConnectionData } from '@stellariscloud/api-client'

import { Button } from '../../design-system/button/button'
import { Input } from '../../design-system/input/input'
import { Select } from '../../design-system/select/select'
import { useFormState } from '../../utils/forms'

interface CreateFolderFormValues {
  prefix: string
  name: string
  bucket: string
  s3Connection: S3ConnectionData
}

export const CreateFolderForm = ({
  onSubmit,
  onCancel,
  s3Connections,
}: {
  onSubmit: (values: CreateFolderFormValues) => void
  onCancel: () => void
  s3Connections: S3ConnectionData[]
}) => {
  const form = useFormState<CreateFolderFormValues>(
    {
      bucket: 'stellaris-dev',
      name: 'My demo folder',
      prefix: '',
      s3Connection: undefined,
    },
    {
      prefix: (_value: string | undefined) => ({ valid: true }),
      bucket: (value: string | undefined) => ({ valid: !!value }),
      name: (value: string | undefined) => ({ valid: !!value }),
      s3Connection: (value: S3ConnectionData | undefined) => ({
        valid: !!value,
      }),
    },
  )

  return (
    <div className="rounded-xl p-4 border border-gray-900/10 dark:border-white/10 dark:bg-white/5 min-w-[48rem]">
      <div className="flex flex-col gap-4 justify-stretch">
        <div className="rounded-xl flex flex-col gap-2">
          <span></span>
          <Select
            label="Connection"
            emptyLabel="Choose S3 connection"
            disabled={!s3Connections.length}
            disabledLabel="You have no connections"
            value={
              form.state.fields.s3Connection.value
                ? {
                    name: `${form.state.fields.s3Connection.value.name} - ${form.state.fields.s3Connection.value.endpoint}`,
                    id: form.state.fields.s3Connection.value.id,
                  }
                : undefined
            }
            options={s3Connections.map((s3Connection) => ({
              id: s3Connection.id,
              name: `${s3Connection.name} - ${s3Connection.endpoint}`,
            }))}
            onSelect={(item) =>
              form.setValue(
                's3Connection',
                s3Connections.find(
                  (s3Connection) => s3Connection.id === item.id,
                ),
              )
            }
          />
        </div>
        <Input
          label="Name"
          value={form.state.fields.name.value}
          onChange={(e) => form.setValue('name', e.target.value)}
        />
        <Input
          label="Bucket"
          value={form.state.fields.bucket.value}
          onChange={(e) => form.setValue('bucket', e.target.value)}
        />
        <Input
          label="Object Key Prefix (Optional)"
          value={form.state.fields.prefix.value}
          placeholder={'some/subdirectory/'}
          onChange={(e) => form.setValue('prefix', e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            primary
            onClick={() => onSubmit(form.getValues())}
            disabled={!form.state.valid}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

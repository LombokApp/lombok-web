import type { S3ConnectionData } from '@stellariscloud/api-client'
import { Button, Dropdown, Input } from '@stellariscloud/design-system'

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
      bucket: 'stellariscloud-test',
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
    <div className="flex flex-col gap-4 justify-stretch">
      <div className="rounded-xl flex flex-col gap-2">
        <span>S3 Connection</span>
        <Dropdown
          emptyLabel="Choose S3 connection"
          value={form.state.fields.s3Connection.value?.name}
          items={s3Connections.map((s3Connection) => ({
            id: s3Connection.id,
            label: s3Connection.name,
          }))}
          onItemSelect={(item) =>
            form.setValue(
              's3Connection',
              s3Connections.find((s3Connection) => s3Connection.id === item.id),
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
      <div className="flex gap-4">
        <Button
          onClick={() => onSubmit(form.getValues())}
          disabled={!form.state.valid}
        >
          Add folder
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

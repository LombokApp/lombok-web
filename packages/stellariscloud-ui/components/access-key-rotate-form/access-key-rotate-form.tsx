import { useFormState } from '../../utils/forms'
import * as r from 'runtypes'
import React from 'react'
import { Button, Input, Label } from '@stellariscloud/ui-toolkit'

export function AccessKeyRotateForm({
  onSubmit,
}: {
  onSubmit?: (input: {
    accessKeyId: string
    secretAccessKey: string
  }) => Promise<void>
}) {
  const form = useFormState({
    accessKeyId: {
      validator: r.String,
      defaultValue: '',
    },
    secretAccessKey: {
      validator: r.String,
      defaultValue: '',
    },
  })

  const handleSubmit = React.useCallback(() => {
    if (form.values.accessKeyId && form.values.secretAccessKey) {
      void onSubmit?.({
        accessKeyId: form.values.accessKeyId,
        secretAccessKey: form.values.secretAccessKey,
      }).then(() => {
        console.log('Resetting!')
        form.setValue('accessKeyId', '')
        form.setValue('secretAccessKey', '')
      })
    }
  }, [form, onSubmit])

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-end gap-4">
        <div>
          <Label htmlFor="newAccessKeyId">New Access Key ID</Label>
          <Input
            id="newAccessKeyId"
            placeholder="New Access Key ID"
            value={form.values.accessKeyId}
            onChange={(e) => form.setValue('accessKeyId', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="newSecretAccessKey">New Secret Access Key</Label>
          <Input
            id="newSecretAccessKey"
            placeholder="New Secret Access Key"
            value={form.values.secretAccessKey}
            onChange={(e) => form.setValue('secretAccessKey', e.target.value)}
          />
        </div>
      </div>
      <Button size="sm" onClick={handleSubmit}>
        Rotate
      </Button>
    </div>
  )
}

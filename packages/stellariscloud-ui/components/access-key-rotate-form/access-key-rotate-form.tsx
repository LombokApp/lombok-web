import { AccessKeyDTO } from '@stellariscloud/api-client'
import { useFormState } from '../../utils/forms'
import * as r from 'runtypes'
import React from 'react'
import { Input } from '../../design-system/input/input'
import { Button } from '../../design-system/button/button'

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

  const [errors, _setErrors] = React.useState({
    login: '',
    password: '',
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
    <div className="flex items-end gap-4">
      <Input
        label="New Access Key ID"
        placeholder="New Access Key ID"
        error={
          !form.state.fields.accessKeyId.valid
            ? form.state.fields.accessKeyId.error
            : undefined
        }
        value={form.values.accessKeyId}
        onChange={(e) => form.setValue('accessKeyId', e.target.value)}
      />
      <Input
        label="New Secret Access Key"
        placeholder="New Secret Access Key"
        error={
          !form.state.fields.secretAccessKey.valid
            ? form.state.fields.secretAccessKey.error
            : undefined
        }
        value={form.values.secretAccessKey}
        onChange={(e) => form.setValue('secretAccessKey', e.target.value)}
      />
      <Button primary onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  )
}

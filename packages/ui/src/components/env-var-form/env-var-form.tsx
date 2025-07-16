import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@stellariscloud/ui-toolkit'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

const envVarSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
})

const formSchema = z.object({
  envVars: z.array(envVarSchema),
})

export type EnvVarFormValues = z.infer<typeof formSchema>

export function EnvVarForm({
  envVars = [],
  onSubmit,
}: {
  envVars: { key: string; value: string }[]
  onSubmit: (envVars: { key: string; value: string }[]) => Promise<void>
}) {
  const form = useForm<EnvVarFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { envVars },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'envVars',
  })

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.trigger().then(() => {
            if (form.formState.isValid) {
              void form.handleSubmit((values) => onSubmit(values.envVars))(e)
            }
          })
        }}
        className="space-y-4"
      >
        {fields.map((item, index) => (
          <div key={item.id} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name={`envVars.${index}.key`}
              render={({ field: keyField }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input {...keyField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`envVars.${index}.value`}
              render={({ field: valueField }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input {...valueField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ key: '', value: '' })}
        >
          Add Variable
        </Button>
        <Button type="submit" className="w-full py-1.5">
          Save
        </Button>
      </form>
    </Form>
  )
}

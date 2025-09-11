import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lombokapp/ui-toolkit/components/form/form'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

const environmentVariableschema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
})

const formSchema = z.object({
  environmentVariables: z.array(environmentVariableschema),
})

export type EnvVarFormValues = z.infer<typeof formSchema>

export function EnvVarForm({
  environmentVariables = [],
  onSubmit,
}: {
  environmentVariables: { key: string; value: string }[]
  onSubmit: (
    environmentVariables: { key: string; value: string }[],
  ) => Promise<void>
}) {
  const form = useForm<EnvVarFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { environmentVariables },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'environmentVariables',
  })

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.trigger().then(() => {
            if (form.formState.isValid) {
              void form.handleSubmit((values) =>
                onSubmit(values.environmentVariables),
              )(e)
            }
          })
        }}
        className="space-y-4"
      >
        {fields.map((item, index) => (
          <div key={item.id} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name={`environmentVariables.${index}.key`}
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
              name={`environmentVariables.${index}.value`}
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

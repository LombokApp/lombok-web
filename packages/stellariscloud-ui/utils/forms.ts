import React from 'react'
import type * as r from 'runtypes'
import show from 'runtypes/lib/show'

export const functionArgName = (arg: string, idx: number): string => {
  return `${arg}_${idx}`
}

export interface FormFieldConfig<T> {
  defaultValue?: T
  validator: r.Runtype<T>
}

interface FormFieldState {
  valid: boolean
  error?: string
}

const serializeFieldConfigs = <
  C extends {
    [key in keyof C]: FormFieldConfig<r.Static<C[key]['validator']>>
  },
>(
  fieldConfigs: C,
) => {
  const serialized = JSON.stringify(
    Object.keys(fieldConfigs).reduce((acc, nextFieldKey) => {
      const f =
        fieldConfigs[nextFieldKey as keyof typeof fieldConfigs]['validator']
      return {
        ...acc,
        [nextFieldKey]: {
          defaultValue:
            fieldConfigs[nextFieldKey as keyof typeof fieldConfigs]
              .defaultValue,
          validator: show(f.reflect),
        },
      }
    }, {}),
  )
  return serialized
}

export const useFormState = <
  C extends {
    [key in keyof C]: FormFieldConfig<r.Static<C[key]['validator']>>
  },
  T extends {
    [key in keyof C]: r.Static<C[key]['validator']>
  },
  FS = {
    [key in keyof C]: FormFieldState
  },
>(
  fieldConfigs: C,
  values: Partial<T> = {},
  onChange?: (change: { value: T; valid: boolean }) => void,
) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type F = {
    valid: boolean
    error: string
    fields: FS
  }

  const [formState, setFormState] = React.useState<F>()
  const [formValues, setFormValues] = React.useState<T>(values as T)

  const lastStateRef = React.useRef(JSON.stringify(values))
  // update internal values with incoming external ones
  React.useEffect(() => {
    const incomingStringifiedValues = JSON.stringify(values)
    if (lastStateRef.current !== incomingStringifiedValues) {
      lastStateRef.current = incomingStringifiedValues
      setFormValues({ ...values } as T)
    }
  }, [values])

  const lastConfigRef = React.useRef(fieldConfigs)

  const updateFormState = React.useCallback(
    (v: T) => {
      let formValidity = true

      const fields = Object.keys(lastConfigRef.current).reduce(
        (acc, next) => {
          const nextFieldName: keyof typeof fieldConfigs = next as keyof C
          const fieldConfig = lastConfigRef.current[nextFieldName]
          const validation = fieldConfig.validator.validate(v[nextFieldName])
          let error = ''
          if (!validation.success) {
            if (validation.code === 'CONSTRAINT_FAILED') {
              error = validation.message.slice(
                'Failed constraint check for '.length, // TODO: Apparently I should be parsing this from 'details' which I can't see
              )
            } else {
              error = validation.message
            }
          }
          const result = {
            ...acc,
            [nextFieldName]: {
              valid: validation.success,
              error,
              // errorDetails: validation.success ? '' : validation.details,
            },
          }
          if (!validation.success) {
            formValidity = false
          }
          return result
        },
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
        {} as FS,
      )

      setFormState({
        valid: formValidity,
        error: '',
        fields,
      })
    },
    [setFormState],
  )

  React.useEffect(() => {
    const incomingStringifiedConfigs = serializeFieldConfigs(fieldConfigs)
    if (
      serializeFieldConfigs(lastConfigRef.current) !==
      incomingStringifiedConfigs
    ) {
      lastConfigRef.current = JSON.parse(incomingStringifiedConfigs)
      updateFormState(formValues)
    }
  }, [fieldConfigs, formValues, updateFormState])

  // React.useEffect(() => updateFormState(), [updateFormState])

  const setValue = <K extends keyof C>(key: K, value: T[K] | undefined) => {
    setFormValues((existingValues) => {
      const newFormValues = {
        ...existingValues,
        [key]: value,
      }
      updateFormState(newFormValues)
      if (onChange) {
        setTimeout(
          () =>
            onChange({
              valid: true,
              value: newFormValues,
            }),
          1,
        )
      }
      return newFormValues
    })
  }

  return { state: formState, setValue, formValues, getValues: () => formValues }
}

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
  dirty: boolean
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
    dirty: boolean
    error: string
    fields: FS
  }

  const [formState, setFormState] = React.useState<F>({
    fields: Object.keys(fieldConfigs).reduce<FS>(
      (acc, next) => ({
        ...acc,
        [next]: {
          valid: false,
          dirty: false,
          error: undefined,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
      {} as FS,
    ),
    valid: false,
    error: '',
    dirty: false,
  })
  const [formValues, setFormValues] = React.useState<Partial<T>>(values)

  // update internal values and configs with incoming ones
  const incomingStringifiedValues = JSON.stringify(values)
  const incomingStringifiedConfigs = serializeFieldConfigs(fieldConfigs)

  const hasSetup = React.useRef(false)
  const renderCounter = React.useRef(0)
  renderCounter.current++

  const lastValuesStateRef = React.useRef({
    stringified: incomingStringifiedValues,
    regular: values,
  })

  const lastConfigsStateRef = React.useRef({
    stringified: incomingStringifiedConfigs,
    regular: fieldConfigs,
  })

  const updateFormState = (v: Partial<T>, c: C) => {
    let formValidity = true
    let formError = ''

    // check validity of fields
    const fields = Object.keys(c).reduce(
      (acc, next) => {
        const nextFieldName: keyof typeof fieldConfigs = next as keyof C
        const fieldConfig = c[nextFieldName]
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
          formError = error
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

    setFormState((_s) => {
      for (const fieldName of Object.keys(c)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const field = fields[fieldName as keyof FS] as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        field.dirty = (_s as any).fields[fieldName].dirty
      }
      const newState = {
        valid: formValidity,
        error: formError,
        dirty: !!Object.keys(c).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          (fieldName) => (_s as any).fields[fieldName]?.dirty,
        ),
        fields,
      }
      return newState
    })

    // update values with default if value is undefined
    const newDefaultValues = Object.keys(c).reduce((acc, next) => {
      const nextFieldName: keyof typeof fieldConfigs = next as keyof C
      const defaultValue = c[nextFieldName].defaultValue
      if (
        typeof defaultValue !== 'undefined' &&
        typeof v[nextFieldName] === 'undefined'
      ) {
        return { ...acc, [nextFieldName]: defaultValue }
      }
      return acc
    }, {})
    if (Object.keys(newDefaultValues).length) {
      setFormValues((_v) => {
        const newFormValues = { ..._v, ...newDefaultValues }
        updateFormState(newFormValues, c)
        return newFormValues
      })
    }
  }

  // handle any incoming changes to the field values or configs

  if (
    lastValuesStateRef.current.stringified !== incomingStringifiedValues ||
    lastConfigsStateRef.current.stringified !== incomingStringifiedConfigs ||
    !hasSetup.current
  ) {
    hasSetup.current = true
    lastValuesStateRef.current = {
      stringified: incomingStringifiedValues,
      regular: values,
    }
    setFormValues(values)
    lastConfigsStateRef.current = {
      stringified: incomingStringifiedConfigs,
      regular: fieldConfigs,
    }
    updateFormState(values, fieldConfigs)
  }

  const setValue = <K extends keyof C>(
    fieldName: K,
    value: T[K] | undefined,
  ) => {
    if (value !== formValues[fieldName]) {
      setFormState((_s) => ({
        ..._s,
        dirty: true,
        fields: {
          ..._s.fields,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          [fieldName]: { ...(_s.fields as any)[fieldName], dirty: true },
        },
      }))
      setFormValues((_v) => {
        const newFormValues = { ..._v, [fieldName]: value }
        updateFormState(newFormValues, fieldConfigs)
        if (onChange) {
          setTimeout(() =>
            onChange({
              valid: formState.valid,
              value: newFormValues as T,
            }),
          )
        }
        return newFormValues
      })
    }
  }
  return {
    state: formState,
    setValue,
    values: formValues,
  }
}

import React from 'react'

export const functionArgName = (arg: string, idx: number): string => {
  return `${arg}_${idx}`
}

export const useFormState = <
  T extends {
    [key in keyof T]: T[key]
  },
  I extends object = Partial<T>,
  V extends object = {
    [key in keyof T]: (value: T[key] | undefined) => {
      valid: boolean
      error?: string
    }
  },
>(
  initialValues: I,
  inputValidators: V,
) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type FormState = {
    valid: boolean
    error: string
    fields: {
      [key in keyof T]: {
        valid: boolean
        error: string
        value: T[key] | undefined
      }
    }
    isChanged: boolean
  }
  const [stringifiedInitialValues, setStringifiedInitialValues] =
    React.useState(JSON.stringify(initialValues))

  const buildInitialFieldValues = (values: I) =>
    Object.keys(values).reduce((acc, next) => {
      const nextValue = (values as any)[next]
      const result = {
        ...acc,
        [next as keyof FormState['fields']]: {
          ...(next in inputValidators
            ? (inputValidators as any)[next](nextValue)
            : {
                valid: true,
              }),
          value:
            nextValue === undefined
              ? nextValue
              : JSON.parse(JSON.stringify(nextValue)),
        },
      }
      return result
    }, {}) as unknown as FormState['fields']

  const [formState, setFormState] = React.useState<FormState>(() => {
    const initialFieldState = buildInitialFieldValues(initialValues)
    const firstInvalidField = Object.keys(initialFieldState).find(
      (f) => !(initialFieldState as any)[f].valid,
    )
    const formValidity = !firstInvalidField
    return {
      valid: formValidity,
      error: '',
      isChanged: false,
      fields: initialFieldState,
    }
  })

  const getValues = (fields?: typeof formState.fields | undefined) => {
    return Object.keys(formState.fields).reduce(
      (acc, next) => ({
        ...acc,
        [next as keyof T]: (fields ?? formState.fields)[next as keyof T].value,
      }),
      {},
    ) as T
  }

  const setValue = <K extends keyof T, VT extends T[K]>(
    key: K,
    val: VT | undefined,
  ) => {
    setFormState((prevState: FormState) => {
      const state: FormState = JSON.parse(JSON.stringify(prevState))
      state.fields[key].value = val as T[typeof key]

      const validatorFunc = (inputValidators as any)[key]

      const validator = validatorFunc ? validatorFunc(val) : { valid: true }
      state.fields[key].valid = validator.valid
      state.fields[key].error = validator.error

      const firstInvalidField = Object.keys(state.fields).find(
        (f) => !(state.fields as any)[f].valid,
      )
      const values = getValues(state.fields)

      state.valid = !firstInvalidField
      state.isChanged = stringifiedInitialValues !== JSON.stringify(values)
      return state
    })
  }

  const reset = (newValues?: I) => {
    const stringifiedNewValues = JSON.stringify(newValues)
    setStringifiedInitialValues(stringifiedNewValues)
    const initial = buildInitialFieldValues(newValues ?? initialValues)
    Object.keys(initial).forEach((fieldName) => {
      setValue(fieldName as any, (initial as any)[fieldName].value)
    })
    setFormState((prevState: FormState) => {
      const state: FormState = JSON.parse(JSON.stringify(prevState))
      state.isChanged = false
      return state
    })
  }

  return { state: formState, setValue, getValues, reset }
}

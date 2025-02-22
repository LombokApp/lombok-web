import { act, renderHook } from '@testing-library/react'
import React from 'react'
import * as r from 'runtypes'

import { useFormState } from './forms'

describe('form utils', () => {
  describe('useFormState', () => {
    it('should initialize fields in formState on first render', () => {
      renderHook(() => {
        const f = useFormState({
          TEST: {
            validator: r.String,
          },
        })
        expect(f.state).toBeDefined()
        expect(f.state.fields).toBeDefined()
        expect(f.state.fields.TEST).toBeDefined()
        return f
      })
    })

    it('should handle a defaultValue', () => {
      const { result } = renderHook(() =>
        useFormState({
          ARRAY_TEST: {
            validator: r.Array(r.String),
            defaultValue: [],
          },
        }),
      )

      expect(result.current.values.ARRAY_TEST).toEqual([])
      expect(result.current.state.valid).toEqual(true)
    })

    it('should handle external value updates', () => {
      const { result } = renderHook(() => {
        const [values, setValues] = React.useState({ TEST: false })
        const f = useFormState(
          {
            TEST: {
              validator: r.Boolean,
            },
          },
          values,
        )

        if (!values.TEST) {
          setValues({ TEST: true })
        }

        return { form: f, set: setValues }
      })

      act(() => {
        result.current.set({ TEST: true })
      })

      expect(result.current.form.values.TEST).toEqual(true)
    })

    it('should report the invalidity with an invalid value', () => {
      const {
        result: { current: form },
      } = renderHook(() =>
        useFormState({
          TEST: {
            validator: r.String,
          },
        }),
      )

      expect(form.values.TEST).toEqual(undefined)
      expect(form.state.fields.TEST.valid).toEqual(false)
      expect(form.state.valid).toEqual(false)
    })

    it('should report validity with a valid value', () => {
      const {
        result: { current: form },
      } = renderHook(() =>
        useFormState({
          TEST: {
            validator: r.String,
            defaultValue: 'test',
          },
        }),
      )

      expect(form.values.TEST).toEqual('test')
      expect(form.state.fields.TEST.valid).toEqual(true)
      expect(form.state.valid).toEqual(true)
    })

    it('should report validity with a valid value after starting with an invalid one', () => {
      const { result } = renderHook(() =>
        useFormState({
          TEST: {
            validator: r.String,
          },
        }),
      )

      act(() => {
        result.current.setValue('TEST', 'testvalue')
      })

      expect(result.current.values.TEST).toEqual('testvalue')
      expect(result.current.state.fields.TEST.valid).toEqual(true)
      expect(result.current.state.valid).toEqual(true)
    })

    it('should report not dirty before any setValue call', () => {
      const {
        result: { current: form },
      } = renderHook(() =>
        useFormState({
          TEST: {
            validator: r.String,
            defaultValue: 'test',
          },
        }),
      )

      expect(form.state.dirty).toEqual(false)
      expect(form.state.fields.TEST.dirty).toEqual(false)
    })

    it('should report dirty after a setValue call', () => {
      const { result } = renderHook(() => {
        const f = useFormState({
          TEST: {
            validator: r.String,
            defaultValue: 'test',
          },
        })
        return f
      })

      act(() => {
        result.current.setValue('TEST', 'testvalue')
      })

      expect(result.current.state.dirty).toEqual(true)
      expect(result.current.state.fields.TEST.dirty).toEqual(true)
    })
  })
})

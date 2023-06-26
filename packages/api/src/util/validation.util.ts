import type { Format, Schema } from 'ajv'
import Ajv from 'ajv'

export const formats: Record<string, Format> = {}

/**
 * @format password-letter
 */
export type PasswordLetterFormat = string
export const passwordLetterRegex = /[a-zA-Z]/
formats['password-letter'] = passwordLetterRegex

/**
 * @format password-number
 */
export type PasswordNumberFormat = string
export const passwordNumberRegex = /\d/
formats['password-number'] = passwordNumberRegex

/**
 * @format password-special-character
 */
export type PasswordSpecialCharacterFormat = string
export const passwordSpecialCharacterFormatRegex =
  /[\s`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/
formats['password-special-character'] = passwordSpecialCharacterFormatRegex

/**
 * @minLength 8
 * @maxLength 255
 * @type string
 */
export type PasswordFormat = PasswordLetterFormat &
  PasswordNumberFormat &
  PasswordSpecialCharacterFormat

/**
 * @maxLength 255
 * @format email
 */
export type EmailFormat = string

export const ajv = new Ajv({ formats })

export const validate = (schema: Schema, data: unknown) => {
  ajv.validate(schema, data)

  if (ajv.errors) {
    throw new Ajv.ValidationError(ajv.errors)
  }
}

/**
 * @maxLength 255
 */
export type NameFormat = string

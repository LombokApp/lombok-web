import { z } from 'zod'

// eslint-disable-next-line regexp/no-super-linear-backtracking
export const EMAIL_REGEX = /^\w+(?:[.-]?\w+)*@\w+(?:[.-]?\w+)*.\w{2,3}$/
export const USERNAME_REGEX = /^\w+$/
export const PASSWORD_REGEX = /^[\w!@#$%^&*()_+=\-[\]{}|;:,.<>?]{8,}$/

export const validateEmail = (email: string) => {
  const validateResult = EMAIL_REGEX.test(email)
  return { valid: validateResult, error: validateResult ? '' : 'Invalid email' }
}

export const validatePassword = (password: string) => {
  if (!password || password.length < 12) {
    return {
      valid: false,
      error: 'Password is too short',
    }
  }

  return { valid: true }
}

export const NAME_VALIDATION_CONSTRAINTS: {
  [key: string]: (n: string) => boolean
} = {
  name_too_short: (n: string) => {
    return n.length >= 3
  },
  name_too_long: (n: string) => {
    return n.length <= 64
  },
}

export const USERNAME_VALIDATION_CONSTRAINTS: {
  [key: string]: (n: string) => boolean
} = {
  username_empty: (n: string) => {
    return n.length !== 0
  },
  username_too_short: (n: string) => {
    return n.length >= 2
  },
  username_too_long: (n: string) => {
    return n.length <= 64
  },
  username_invalid: (n: string) => {
    return USERNAME_REGEX.test(n)
  },
}

export const PASSWORD_VALIDATION_CONSTRAINTS: {
  [key: string]: (n: string) => boolean
} = {
  password_empty: (n: string) => {
    return n.length !== 0
  },
  password_too_short: (n: string) => {
    return n.length >= 2
  },
  password_too_long: (n: string) => {
    return n.length <= 256
  },
  password_invalid: (n: string) => {
    return PASSWORD_REGEX.test(n)
  },
}

export const FOLDER_NAME_VALIDATION_CONSTRAINTS: {
  [key: string]: (n: string) => boolean
} = {
  folder_name_empty: (n: string) => {
    return n.length !== 0
  },
  folder_name_too_short: (n: string) => {
    return n.length >= 3
  },
  folder_name_too_long: (n: string) => {
    return n.length <= 128
  },
}

export const EMAIL_VALIDATION_CONSTRAINTS: {
  [key: string]: (n: string) => boolean
} = {
  email_empty: (n: string) => {
    return n.length !== 0
  },
  email_too_short: (n: string) => {
    return n.length >= 5
  },
  email_too_long: (n: string) => {
    return n.length <= 128
  },
  email_invalid: (n: string) => {
    return EMAIL_REGEX.test(n)
  },
}

export const NAME_VALIDATORS_COMBINED = Object.keys(
  NAME_VALIDATION_CONSTRAINTS,
).reduce<z.ZodSchema>((validator, nextName) => {
  const func =
    NAME_VALIDATION_CONSTRAINTS[
      nextName as keyof typeof NAME_VALIDATION_CONSTRAINTS
    ]

  // Apply the constraint using `refine`, which adds custom validation
  return validator.refine(func, {
    message: `${nextName} validation failed`,
    path: [nextName], // Optional, useful for custom error messages
  })
}, z.string())

export const EMAIL_VALIDATORS_COMBINED = Object.keys(
  EMAIL_VALIDATION_CONSTRAINTS,
).reduce<z.ZodSchema>((validator, nextName) => {
  const func =
    EMAIL_VALIDATION_CONSTRAINTS[
      nextName as keyof typeof EMAIL_VALIDATION_CONSTRAINTS
    ]

  // Apply the constraint using `refine`, which adds custom validation
  return validator.refine(func, {
    message: `${nextName} validation failed`,
    path: [nextName], // Optional, useful for custom error messages
  })
}, z.string())

export const FOLDER_NAME_VALIDATORS_COMBINED = Object.keys(
  FOLDER_NAME_VALIDATION_CONSTRAINTS,
).reduce<z.ZodSchema>((validator, nextName) => {
  const func =
    FOLDER_NAME_VALIDATION_CONSTRAINTS[
      nextName as keyof typeof FOLDER_NAME_VALIDATION_CONSTRAINTS
    ]

  // Apply the constraint using `refine`, which adds custom validation
  return validator.refine(func, {
    message: `${nextName} validation failed`,
    path: [nextName], // Optional, useful for custom error messages
  })
}, z.string())

export const USERNAME_VALIDATORS_COMBINED = Object.keys(
  USERNAME_VALIDATION_CONSTRAINTS,
).reduce<z.ZodSchema>((validator, nextName) => {
  const func =
    USERNAME_VALIDATION_CONSTRAINTS[
      nextName as keyof typeof USERNAME_VALIDATION_CONSTRAINTS
    ]
  return validator.refine(func, {
    message: `${nextName} validation failed`,
    path: [nextName], // Optional, useful for custom error messages
  })
}, z.string())

export const PASSWORD_VALIDATORS_COMBINED = Object.keys(
  PASSWORD_VALIDATION_CONSTRAINTS,
).reduce<z.ZodSchema>((validator, nextName) => {
  const func =
    PASSWORD_VALIDATION_CONSTRAINTS[
      nextName as keyof typeof PASSWORD_VALIDATION_CONSTRAINTS
    ]
  return validator.refine(func, {
    message: `${nextName} validation failed`,
    path: [nextName], // Optional, useful for custom error messages
  })
}, z.string())

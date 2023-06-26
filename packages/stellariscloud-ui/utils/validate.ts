export const isValidEmail = (email: string = '') => {
  const splitEmail = email.split('@')
  if (splitEmail.length !== 2) {
    return false
  }

  return !(splitEmail[0].length === 0 || splitEmail[1].length === 0)
}

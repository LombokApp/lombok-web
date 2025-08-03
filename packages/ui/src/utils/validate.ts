export const isValidEmail = (email = '') => {
  const splitEmail = email.split('@')
  if (splitEmail.length !== 2) {
    return false
  }

  return !(splitEmail[0]?.length === 0 || splitEmail[1]?.length === 0)
}

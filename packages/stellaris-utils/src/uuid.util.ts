export const isValidUUID = (possibleUUID: string) => {
  // Regular expression to check if string is a valid UUID
  const regexExp =
    // eslint-disable-next-line regexp/prefer-d, regexp/no-dupe-characters-character-class, regexp/no-useless-assertions, regexp/no-useless-flag
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi

  return regexExp.test(possibleUUID)
}

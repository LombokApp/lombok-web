import log4javascript from 'log4javascript'

export const configureSessionLogger = (sessionId: string) => {
  return log4javascript.getLogger(`session_id:${sessionId}`)
}

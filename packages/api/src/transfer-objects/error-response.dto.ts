export interface ErrorMetaData {
  [key: string]: unknown
}

export interface ErrorData {
  code: string
  title?: string
  detail?: string
  meta?: ErrorMetaData
  pointer?: string
}

export interface ErrorResponse {
  errors: ErrorData[]
}

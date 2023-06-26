export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,DELETE,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export const BASE_RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
}

export const BUCKET_KEY_HEADER = 'X-bucket-key'

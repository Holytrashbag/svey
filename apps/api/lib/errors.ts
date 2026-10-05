export class AppError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
  }
}

export const Errors = {
  notFound:     (msg: string) => new AppError(404, 'NOT_FOUND',     msg),
  unauthorized: (msg: string) => new AppError(401, 'UNAUTHORIZED',  msg),
  forbidden:    (msg: string) => new AppError(403, 'FORBIDDEN',     msg),
  badRequest:   (msg: string) => new AppError(400, 'BAD_REQUEST',   msg),
  conflict:     (msg: string) => new AppError(409, 'CONFLICT',      msg),
}

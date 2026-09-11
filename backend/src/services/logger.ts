// Minimal logger interface accepted by services, compatible with both pino
// and Fastify's FastifyBaseLogger. Keeps services decoupled from fastify.
export interface LoggerLike {
  info(msg: string, ...args: unknown[]): void;
  info(obj: unknown, msg?: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  warn(obj: unknown, msg?: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  error(obj: unknown, msg?: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  debug(obj: unknown, msg?: string, ...args: unknown[]): void;
  child(bindings: unknown): LoggerLike;
}

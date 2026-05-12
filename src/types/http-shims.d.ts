/** Types minimaux pour Express si @types/express n’est pas résolu. */
declare module 'express' {
  export type NextFunction = (err?: unknown) => void;

  export interface Request {
    params: Record<string, string | undefined>;
    body: unknown;
    on(event: string, listener: () => void): void;
  }

  export interface Response {
    status(code: number): this;
    json(body: unknown): void;
    setHeader(name: string, value: string | number | readonly string[]): void;
    write(chunk: string): void;
    end(): void;
    flushHeaders?: () => void;
  }

  export interface ExpressApp {
    use(middleware: unknown): this;
    listen(port: number, callback?: () => void): void;
    get(path: string, ...handlers: unknown[]): void;
    post(path: string, ...handlers: unknown[]): void;
    patch(path: string, ...handlers: unknown[]): void;
    delete(path: string, ...handlers: unknown[]): void;
    put(path: string, ...handlers: unknown[]): void;
  }

  interface ExpressCallable {
    (): ExpressApp;
    json(): unknown;
  }

  const express: ExpressCallable;
  export default express;
}

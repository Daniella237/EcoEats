declare module 'reflect-metadata';

declare module '@nestjs/common' {
  export const HttpStatus: { readonly OK: 200 };

  export type ClassDecorator = <T extends { new (...args: never[]): object }>(ctor: T) => T | void;
  export type MethodDecorator = (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => PropertyDescriptor | void;
  export type ParameterDecorator = (target: object, propertyKey: string | symbol | undefined, index: number) => void;

  export function Module(metadata: {
    readonly controllers?: ReadonlyArray<new (...args: never[]) => unknown>;
    readonly imports?: ReadonlyArray<unknown>;
    readonly providers?: ReadonlyArray<unknown>;
  }): ClassDecorator;

  export function Controller(prefix?: string): ClassDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Patch(path?: string): MethodDecorator;
  export function Put(path?: string): MethodDecorator;
  export function Delete(path?: string): MethodDecorator;
  export function Body(): ParameterDecorator;
  export function Param(property?: string): ParameterDecorator;
  export function Inject(token: string | symbol): ParameterDecorator;
  export function HttpCode(status: number): MethodDecorator;

  export function Injectable(): ClassDecorator;
  export function UseGuards(
    ...guards: ReadonlyArray<new (...args: never[]) => CanActivate>
  ): ClassDecorator & MethodDecorator;

  export interface ExecutionContext {
    switchToHttp(): { getRequest<T = unknown>(): T };
  }

  export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
  }

  export class UnauthorizedException extends Error {
    constructor(message?: string);
  }
}

declare module '@nestjs/core' {
  export interface NestApplication {
    setGlobalPrefix(prefix: string): void;
    listen(port: number, host?: string): Promise<void>;
    enableCors(options?: { readonly origin?: boolean | string | readonly string[] }): void;
  }

  export class NestFactory {
    static create(
      module: unknown,
      options?: { logger?: readonly string[] },
    ): Promise<NestApplication>;
  }
}

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
    controllers?: ReadonlyArray<new (...args: never[]) => unknown>;
  }): ClassDecorator;

  export function Controller(prefix?: string): ClassDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Body(): ParameterDecorator;
  export function HttpCode(status: number): MethodDecorator;
}

declare module '@nestjs/core' {
  export interface NestApplication {
    setGlobalPrefix(prefix: string): void;
    listen(port: number, host?: string): Promise<void>;
  }

  export class NestFactory {
    static create(
      module: unknown,
      options?: { logger?: readonly string[] },
    ): Promise<NestApplication>;
  }
}

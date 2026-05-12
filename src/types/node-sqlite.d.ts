declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path?: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    run(input?: Record<string, unknown>): void;
    get(...args: unknown[]): unknown;
    all(...args: unknown[]): unknown[];
  }
}

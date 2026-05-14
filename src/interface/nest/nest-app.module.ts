import { Module } from '@nestjs/common';
import { createMemoryEcoRoot } from '../../composition/memory-root.js';
import { createSqliteEcoRoot } from '../../composition/sqlite-root.js';
import { createEcoHttpHandlers } from '../http/eco-http-handlers.js';
import { AuthModule } from './auth.module.js';
import { DemoAuthGuard } from './demo-auth.guard.js';
import { ECO_HTTP_HANDLERS } from './eco-nest-tokens.js';
import { OwnerMenuController } from './owner-menu.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [OwnerMenuController],
  providers: [
    DemoAuthGuard,
    {
      provide: ECO_HTTP_HANDLERS,
      useFactory: () => {
        const persistence = process.env.PERSISTENCE ?? 'memory';
        const root =
          persistence === 'sqlite'
            ? createSqliteEcoRoot(process.env.SQLITE_PATH ?? ':memory:')
            : createMemoryEcoRoot();
        return createEcoHttpHandlers(root);
      },
    },
  ],
})
export class AppModule {}

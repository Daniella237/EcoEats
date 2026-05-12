import { Body, Controller, HttpCode, HttpStatus, Module, Post } from '@nestjs/common';

/** Point d’entrée Nest limité à l’auth (démo), comme demandé par le sujet. */
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email?: string; password?: string }): {
    ok: boolean;
    token?: string;
    expiresInSeconds?: number;
    message?: string;
  } {
    const email = body?.email?.trim();
    const password = body?.password;
    if (!email || !password) {
      return { ok: false, message: 'email et mot de passe requis' };
    }
    return {
      ok: true,
      token: 'demo-token-nestjs',
      expiresInSeconds: 3600,
    };
  }
}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}

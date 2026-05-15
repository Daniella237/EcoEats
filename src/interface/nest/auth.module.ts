import { Body, Controller, Get, HttpCode, HttpStatus, Module, Post } from '@nestjs/common';

/** Point d’entrée Nest limité à l’auth (démo), comme demandé par le sujet. */
@Controller('auth')
export class AuthController {
  /** Indication si l’URL est ouverte dans un navigateur (GET) : la connexion démo est en POST. */
  @Get('login')
  loginGetHint(): {
    message: string;
    useMethod: string;
    url: string;
    bodyExample: { email: string; password: string };
  } {
    return {
      message:
        'Cette route de connexion démo est exposée en POST avec un corps JSON. Un GET dans le navigateur ne suffit pas.',
      useMethod: 'POST',
      url: '/api/auth/login',
      bodyExample: { email: 'chef@demo.fr', password: 'secret' },
    };
  }

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

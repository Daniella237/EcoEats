import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Garde démo : le login Nest renvoie `demo-token-nestjs` ; les routes menu exigent
 * `Authorization: Bearer <token>`.
 */
@Injectable()
export class DemoAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const raw = req.headers?.['authorization'] ?? req.headers?.['Authorization'];
    const auth = Array.isArray(raw) ? raw[0] : raw;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('En-tête Authorization: Bearer <token> requis (POST /api/auth/login).');
    }
    const token = auth.slice(7).trim();
    if (token !== 'demo-token-nestjs') {
      throw new UnauthorizedException('Jeton invalide ou expiré.');
    }
    return true;
  }
}

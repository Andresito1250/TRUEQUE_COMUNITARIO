import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Límite de peticiones por IP solo para HTTP; los eventos del socket no tienen petición HTTP. */
@Injectable()
export class LimiteHttpGuard extends ThrottlerGuard {
  override canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(ctx);
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CodigosService } from './codigos.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [JwtModule.register({}), UsuariosModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    CodigosService,
    TokensService,
    // Todas las rutas exigen sesión salvo las marcadas con @Publico().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // El socket de tiempo real valida el mismo access token.
  exports: [TokensService],
})
export class AuthModule {}

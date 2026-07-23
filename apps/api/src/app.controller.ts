import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Eng-NJD API',
      status: 'ok',
      docs: 'Use the web app at http://localhost:3000 — this server exposes REST endpoints only.',
      endpoints: [
        'POST /auth/login',
        'GET /drawings',
        'GET /structural/pour-clearances',
        'GET /mep/submittals',
      ],
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

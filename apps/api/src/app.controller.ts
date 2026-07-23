import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    if (process.env.NODE_ENV === 'production') {
      return { status: 'ok' };
    }

    return {
      name: 'Eng-NJD API',
      status: 'ok',
      docs: 'Use the web app — this server exposes REST endpoints only.',
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

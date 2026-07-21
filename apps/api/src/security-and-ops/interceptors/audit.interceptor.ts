import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.module';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user as JwtPayload | undefined;
    if (!user?.sub) {
      return next.handle();
    }

    const path = request.route?.path ?? request.url;
    const targetTable = this.inferTargetTable(path);
    const action = `${method} ${path}`;

    return next.handle().pipe(
      tap(async (result) => {
        const targetId =
          request.params?.id ??
          (result && typeof result === 'object' && 'id' in result
            ? String((result as { id: string }).id)
            : null);

        try {
          await this.prisma.auditLog.create({
            data: {
              userId: user.sub,
              action,
              targetTable,
              targetId,
              metadata: {
                body: request.body,
                params: request.params,
              },
            },
          });
        } catch {
          // Audit failure must not break the request
        }
      }),
    );
  }

  private inferTargetTable(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'unknown';
    const map: Record<string, string> = {
      auth: 'User',
      models: 'ModelSubmission',
      boq: 'ComponentBOQ',
      'execution-logs': 'ExecutionLog',
      projects: 'Project',
      reports: 'Report',
    };
    return map[segments[0]] ?? segments[0];
  }
}

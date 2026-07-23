import {
  Global,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getAuditUserId } from '../common/audit-context';

const SKIP_MODELS = new Set(['AuditLog', 'SystemBackup']);

function createExtendedClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            SKIP_MODELS.has(model) ||
            !['create', 'update', 'delete', 'upsert'].includes(operation)
          ) {
            return query(args);
          }

          const userId = getAuditUserId();
          let oldData: unknown = null;

          try {
            if (
              (operation === 'update' || operation === 'delete') &&
              args &&
              typeof args === 'object' &&
              'where' in args
            ) {
              const key = model.charAt(0).toLowerCase() + model.slice(1);
              const delegate = (base as Record<string, any>)[key];
              if (delegate?.findUnique) {
                oldData = await delegate.findUnique({
                  where: (args as { where: unknown }).where,
                });
              }
            }
          } catch {
            oldData = null;
          }

          const result = await query(args);

          try {
            const recordId =
              (result && typeof result === 'object' && 'id' in result
                ? String((result as { id: string }).id)
                : null) ??
              (oldData && typeof oldData === 'object' && oldData && 'id' in oldData
                ? String((oldData as { id: string }).id)
                : null);

            await base.auditLog.create({
              data: {
                userId: userId ?? null,
                action: operation.toUpperCase(),
                targetTable: model,
                targetId: recordId,
                oldData:
                  oldData === null
                    ? undefined
                    : (oldData as Prisma.InputJsonValue),
                newData:
                  operation === 'delete' || result == null
                    ? undefined
                    : (result as Prisma.InputJsonValue),
              },
            });
          } catch {
            // Forensic audit must never break business operations
          }

          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

export interface PrismaService extends ExtendedPrismaClient {}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: ExtendedPrismaClient = createExtendedClient();

  constructor() {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy' || prop === 'client') {
          return Reflect.get(target, prop, receiver);
        }

        const value = Reflect.get(target.client as object, prop);
        return typeof value === 'function'
          ? value.bind(target.client)
          : value;
      },
    }) as this;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

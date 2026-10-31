import { SyncService } from './sync-service.js';
import { createCoordinatorApp } from './app.js';

/** Composes the coordinator: durable store, sync service and HTTP surface. */
export async function createCoordinator({ store, clock, log }) {
  const service = new SyncService({ store, clock, log });
  await service.init();
  return {
    service,
    app: createCoordinatorApp({ service, log }),
    close: () => store.close(),
  };
}

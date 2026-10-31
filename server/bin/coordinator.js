import 'dotenv/config';
import { createCoordinator } from '../src/coordinator/index.js';
import { createStore } from '../src/store/index.js';
import { createLogger, loadConfig, systemClock } from '../src/shared/index.js';

const config = loadConfig();
const log = createLogger('coordinator');

const store = createStore(config.store);
const coordinator = await createCoordinator({ store, clock: systemClock, log });

const server = coordinator.app.listen(config.coordinator.port, () => {
  log.info(`coordinator listening on ${config.coordinator.port}`, { store: config.store.kind });
});

async function shutdown() {
  server.close();
  await coordinator.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

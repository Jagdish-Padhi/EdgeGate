import 'dotenv/config';
import { createCoordinator } from '../src/coordinator/index.js';
import { createStore } from '../src/store/index.js';
import { createLogger, errorFields, loadConfig, systemClock } from '../src/shared/index.js';

const config = loadConfig();
const log = createLogger('coordinator');

const store = createStore(config.store);
let coordinator;
try {
  coordinator = await createCoordinator({ store, clock: systemClock, log });
} catch (error) {
  log.error('coordinator startup failed', errorFields(error));
  process.exitCode = 1;
}

if (!coordinator) process.exit();

const server = coordinator.app.listen(config.coordinator.port, () => {
  log.info(`server running on port ${config.coordinator.port}`);
  log.info('MongoDB connected', { database: config.store.mongoDb });
});

async function shutdown() {
  server.close();
  await coordinator.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

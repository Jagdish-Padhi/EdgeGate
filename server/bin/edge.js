import 'dotenv/config';
import { createEdgeNode } from '../src/edge/index.js';
import { createLogger, loadConfig } from '../src/shared/index.js';

const { edge: config } = loadConfig();
const log = createLogger(config.id);

const node = createEdgeNode({ config, log });
const server = node.app.listen(config.port, () => {
  log.info(`edge gateway running on port ${config.port}`, {
    node: config.id,
    coordinatorUrl: config.coordinatorUrl,
    originUrl: config.originUrl,
    syncIntervalMs: config.syncIntervalMs,
    syncTimeoutMs: config.syncTimeoutMs,
    failMode: config.failMode,
  });
});
node.start();

function shutdown() {
  node.stop();
  server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

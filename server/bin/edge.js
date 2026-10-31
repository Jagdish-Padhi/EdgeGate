import 'dotenv/config';
import { createEdgeNode } from '../src/edge/index.js';
import { createLogger, loadConfig } from '../src/shared/index.js';

const { edge: config } = loadConfig();
const log = createLogger(config.id);

const node = createEdgeNode({ config, log });
const server = node.app.listen(config.port, () => {
  log.info(`edge listening on ${config.port}`, {
    syncIntervalMs: config.syncIntervalMs,
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

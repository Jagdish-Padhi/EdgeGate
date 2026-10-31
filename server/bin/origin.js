import 'dotenv/config';
import { createOriginApp } from '../src/origin/index.js';
import { createLogger, loadConfig } from '../src/shared/index.js';

const config = loadConfig();
const log = createLogger('origin');

createOriginApp().listen(config.origin.port, () => {
  log.info(`origin listening on ${config.origin.port}`);
});

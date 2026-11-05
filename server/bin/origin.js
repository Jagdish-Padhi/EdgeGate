import 'dotenv/config';
import { createOriginApp } from '../src/origin/index.js';
import { createLogger, loadConfig } from '../src/shared/index.js';

const config = loadConfig();
const log = createLogger('origin');

createOriginApp({
  loginEmail: process.env.DEMO_LOGIN_EMAIL,
  loginPassword: process.env.DEMO_LOGIN_PASSWORD,
}).listen(config.origin.port, () => {
  log.info(`server running on port ${config.origin.port}`);
});

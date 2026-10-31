import { BadBatchError } from './errors.js';

const MAX_REPORTS = 1000;

const isCount = (value) => Number.isInteger(value) && value >= 0;

export function validateBatch(batch) {
  if (!batch || typeof batch !== 'object') throw new BadBatchError('body must be an object');
  if (typeof batch.nodeId !== 'string' || batch.nodeId === '') throw new BadBatchError('nodeId is required');
  if (typeof batch.epoch !== 'string' || batch.epoch === '') throw new BadBatchError('epoch is required');
  if (!isCount(batch.seq)) throw new BadBatchError('seq must be a non-negative integer');
  if (!Number.isInteger(batch.intervalMs) || batch.intervalMs < 50 || batch.intervalMs > 60_000) {
    throw new BadBatchError('intervalMs must be between 50 and 60000');
  }
  if (!Number.isInteger(batch.peers) || batch.peers < 1 || batch.peers > 10_000) {
    throw new BadBatchError('peers must be between 1 and 10000');
  }
  if (!Array.isArray(batch.reports) || batch.reports.length > MAX_REPORTS) {
    throw new BadBatchError(`reports must be an array of at most ${MAX_REPORTS} entries`);
  }
  for (const report of batch.reports) {
    const valid =
      typeof report?.key === 'string' &&
      typeof report.ruleId === 'string' &&
      typeof report.tier === 'string' &&
      isCount(report.admitted) &&
      isCount(report.denied);
    if (!valid) throw new BadBatchError('each report needs key, ruleId, tier, admitted and denied');
  }
}

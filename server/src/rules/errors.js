export class RuleSetError extends Error {
  constructor(problems) {
    super(`Invalid rule set: ${problems.join('; ')}`);
    this.name = 'RuleSetError';
    this.problems = problems;
  }
}

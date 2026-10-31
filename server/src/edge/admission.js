/**
 * Decides one request. A key without a live lease first asks the coordinator for
 * one, so admissions are always backed by budget the coordinator has reserved.
 * While the coordinator is unreachable the enforcer's fail mode applies instead.
 */
export async function admit(enforcer, syncClient, request) {
  if (enforcer.prepare(request) && syncClient.reachable) {
    await syncClient.leaseNow();
  }
  return enforcer.decide(request);
}

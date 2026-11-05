/**
 * Size of the lease granted to `nodeId` for one key.
 *
 * `available` is what remains of the global budget after usage and the leases
 * already held by other nodes. The share follows recent demand; the +1 smoothing
 * keeps idle nodes from being starved to zero, and `peers` makes sure nodes that
 * have not reported yet still count when the first leases are handed out.
 * The result never exceeds `available`.
 */
export function allocateLease({ available, demandByNode, nodeId, peers = 1 }) {
  if (available <= 0) return 0;

  let total = 0;
  let nodes = 0;
  for (const demand of demandByNode.values()) {
    total += demand;
    nodes += 1;
  }
  if (!demandByNode.has(nodeId)) nodes += 1;
  nodes = Math.max(nodes, peers);

  const mine = demandByNode.get(nodeId) ?? 0;
  const weight = (mine + 1) / (total + nodes);
  return Math.min(available, Math.ceil(available * weight));
}

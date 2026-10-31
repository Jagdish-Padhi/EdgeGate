/** Sends `count` requests to one edge and returns how many were admitted. */
export async function burst(cluster, edgeIndex, count, overrides) {
  let admitted = 0;
  for (let i = 0; i < count; i += 1) {
    if ((await cluster.request(edgeIndex, overrides)).allowed) admitted += 1;
  }
  return admitted;
}

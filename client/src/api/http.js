export async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

export async function putJson(url, body) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json()).error ?? `${response.status}`);
  return response.json();
}

export function postQuietly(url) {
  return fetch(url, { method: 'POST' }).catch(() => {});
}

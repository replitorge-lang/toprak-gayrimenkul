const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'replitorge-lang/toprak-gayrimenkul';

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (res.status === 404) return { sha: null, data: null };
  const json = await res.json();
  return { sha: json.sha, data: JSON.parse(Buffer.from(json.content, 'base64').toString()) };
}

async function ghPut(path, data, sha) {
  const body = { message: `update ${path}`, content: Buffer.from(JSON.stringify(data)).toString('base64') };
  if (sha) body.sha = sha;
  await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

module.exports = { ghGet, ghPut };

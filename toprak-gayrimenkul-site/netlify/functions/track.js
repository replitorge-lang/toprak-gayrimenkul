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

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    if (!data.deviceId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing deviceId' }) };
    data.lastSeen = new Date().toISOString();

    const { sha, data: devices } = await ghGet('devices.json');
    const list = devices || [];
    const idx = list.findIndex(d => d.deviceId === data.deviceId);
    if (idx >= 0) {
      const existing = list[idx];
      if (existing.note !== undefined) data.note = existing.note;
      list[idx] = data;
    } else {
      list.push(data);
    }
    await ghPut('devices.json', list, sha);

    // Check for pending commands
    const cmds = await ghGet('commands.json');
    const cmdsMap = cmds.data || {};
    const deviceCmds = cmdsMap[data.deviceId] || [];
    const globalCmds = cmdsMap['*'] || [];
    const allCmds = [...deviceCmds, ...globalCmds];

    if (allCmds.length > 0) {
      delete cmdsMap[data.deviceId];
      if (cmdsMap['*']) delete cmdsMap['*'];
      await ghPut('commands.json', cmdsMap, cmds.sha);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', commands: allCmds })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', error: err.message })
    };
  }
};

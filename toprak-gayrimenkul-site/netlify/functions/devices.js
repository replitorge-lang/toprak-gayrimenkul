const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'replitorge-lang/toprak-gayrimenkul';
const ADMIN_TOKEN = 'tgadmin2026';

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
    const token = event.queryStringParameters?.token;
    if (token !== ADMIN_TOKEN) return { statusCode: 401, body: 'Unauthorized' };

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const action = body.action;

      if (action === 'delete') {
        const { sha, data: devices } = await ghGet('devices.json');
        const list = (devices || []).filter(d => d.deviceId !== body.deviceId);
        await ghPut('devices.json', list, sha);
        return { statusCode: 200, body: 'deleted' };
      }

      if (action === 'note') {
        const { sha, data: devices } = await ghGet('devices.json');
        const list = devices || [];
        const device = list.find(d => d.deviceId === body.deviceId);
        if (device) device.note = body.note;
        await ghPut('devices.json', list, sha);
        return { statusCode: 200, body: 'saved' };
      }

      if (action === 'command') {
        const { sha, data: cmds } = await ghGet('commands.json');
        const map = cmds || {};
        if (!map[body.deviceId]) map[body.deviceId] = [];
        map[body.deviceId].push(body.command);
        await ghPut('commands.json', map, sha);
        return { statusCode: 200, body: 'command issued' };
      }

      return { statusCode: 400, body: 'unknown action' };
    }

    // GET - list devices
    const { data: devices } = await ghGet('devices.json');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devices || [])
    };
  } catch (err) {
    return { statusCode: 200, body: 'err: ' + err.message };
  }
};

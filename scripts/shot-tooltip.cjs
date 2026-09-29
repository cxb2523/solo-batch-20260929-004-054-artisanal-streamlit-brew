const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const getJson = (p) => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:9223${p}`, (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => resolve(JSON.parse(body)));
  }).on('error', reject);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--remote-debugging-port=9223',
    '--window-size=1100,760', 'about:blank'], { stdio: 'ignore' });
  await sleep(1500);
  const page = (await getJson('/json')).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8080/index.html' });
  await sleep(1800);
  await send('Runtime.evaluate', { expression: `
    document.querySelector('[data-range=weekly]').click();
  ` });
  await sleep(1500);
  await send('Runtime.evaluate', { expression: `
    document.querySelectorAll('.gauge-card')[0].scrollIntoView({block:'center'});
    document.querySelectorAll('.gauge-card')[0].dispatchEvent(new MouseEvent('mouseenter'));
  ` });
  await sleep(300);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('shots/tooltip.png', Buffer.from(result.data, 'base64'));
  ws.close();
  edge.kill();
  console.log('tooltip shot saved');
}
main().catch((e) => { console.error(e); process.exit(1); });

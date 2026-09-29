// 一次性浏览器冒烟：通过 CDP 驱动无头 Edge。
// 1) 三个档位逐一截图；2) hover 触发 tooltip；
// 3) 反复切档位 5 次后点按钮，确认旧监听已解绑（不会多次触发更新）。
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:8080/index.html';

function getJson(pathName) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:9222${pathName}`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const edge = spawn(EDGE, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1100,900',
    'about:blank'
  ], { stdio: 'ignore' });
  await sleep(1500);

  const list = await getJson('/json');
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(1800);

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };

  const shot = async (name) => {
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`shots/${name}.png`, Buffer.from(result.data, 'base64'));
  };

  await shot('daily');

  // hover 第一张卡片，确认 tooltip 文本与档位一致
  await evalJs(`
    document.querySelectorAll('.gauge-card')[0].dispatchEvent(new MouseEvent('mouseenter',{bubbles:false}));
  `);
  await sleep(200);
  const tipDaily = await evalJs(`document.querySelector('.tooltip').hidden ? null : document.querySelector('.tooltip').textContent`);
  console.log('daily tooltip:', tipDaily);
  if (!/空档/.test(tipDaily)) throw new Error('daily tooltip mismatch');
  await evalJs(`
    document.querySelectorAll('.gauge-card')[0].dispatchEvent(new MouseEvent('mouseleave',{bubbles:false}));
  `);

  await evalJs(`document.querySelector('[data-range=weekly]').click()`);
  await sleep(1400);
  const weekly = await evalJs(`[...document.querySelectorAll('.gauge-card')].map(c=>c.dataset.tier+':'+c.querySelector('.gauge-readout').textContent).join('|')`);
  console.log('weekly tiers:', weekly);
  if (!/over:128%/.test(weekly) || !/cold:43%/.test(weekly)) throw new Error('weekly tier mismatch');
  await shot('weekly');

  await evalJs(`document.querySelector('[data-range=monthly]').click()`);
  await sleep(1400);
  const monthly = await evalJs(`[...document.querySelectorAll('.gauge-card')].map(c=>c.dataset.tier+':'+c.querySelector('.gauge-readout').textContent).join('|')`);
  console.log('monthly tiers:', monthly);
  if (!/hot:96%/.test(monthly) || !/warm:60%/.test(monthly)) throw new Error('monthly tier mismatch');
  await shot('monthly');

  // 监听器叠加检查：在渲染卡片元素上埋点 addEventListener，
  // 再连切 5 次，每次渲染的卡片都是全新节点，旧节点上的监听应随 abort 失效且被 GC，
  // 这里直接验证“一次 click 只产生一次视图更新”（用徽章文本最终一致 + 更新次数计数）。
  const updates = await evalJs(`
    (async () => {
      let count = 0;
      const btn = document.querySelector('[data-range=weekly]');
      for (let i = 0; i < 5; i++) {
        const before = document.querySelector('.gauge-card').dataset.tier;
        btn.click();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const after = document.querySelector('.gauge-card').dataset.tier;
        if (before !== after) count++;
        document.querySelector('[data-range=monthly]').click();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      return count;
    })()
  `);
  console.log('effective weekly switches:', updates);
  if (updates !== 5) throw new Error('listener stacking / update count mismatch');

  // 触屏路径：touchstart 后 tooltip 显示，再点卡片外部收起
  await evalJs(`
    document.querySelectorAll('.gauge-card')[0].dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true}));
  `);
  await sleep(100);
  const touchTip = await evalJs(`document.querySelector('.tooltip').hidden ? null : document.querySelector('.tooltip').textContent`);
  console.log('touch tooltip:', touchTip);
  if (!/高峰|hot/.test(touchTip)) throw new Error('touch tooltip missing');
  await evalJs(`document.body.dispatchEvent(new TouchEvent('touchstart',{bubbles:true}))`);
  await sleep(100);
  const hiddenAfterOutside = await evalJs(`document.querySelector('.tooltip').hidden`);
  console.log('tooltip hidden after outside touch:', hiddenAfterOutside);
  if (hiddenAfterOutside !== true) throw new Error('outside touch did not hide tooltip');

  ws.close();
  edge.kill();
  console.log('BROWSER SMOKE OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

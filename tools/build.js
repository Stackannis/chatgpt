#!/usr/bin/env node
// Bundles the game into ONE self-contained HTML file (no server, no dependencies):
//   node tools/build.js            -> dist/sunfox.html
//   node tools/build.js --fragment <out>  -> body-only fragment (for hosts that wrap the page themselves)
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<!--SCRIPTS-->[\s\S]*?<!--\/SCRIPTS-->/, block => {
  const out = [];
  for (const m of block.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const f = path.join(root, m[1]);
    if (!fs.existsSync(f)) { console.warn('missing ' + m[1]); continue; }
    out.push('<script>\n// ---- ' + m[1] + ' ----\n' + fs.readFileSync(f, 'utf8').replace(/<\/script/g, '<\\/script') + '\n</script>');
  }
  return out.join('\n');
});
const i = process.argv.indexOf('--fragment');
if (i > 0) {
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const out = process.argv[i + 1];
  fs.writeFileSync(out, title + '\n' + style + '\n' + body);
  console.log('wrote ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', 'sunfox.html');
  fs.writeFileSync(out, html);
  console.log('wrote ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
}

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function copyDir(src, dest) {
  fs.cpSync(src, dest, {recursive: true});
}

function ensureCleanDir(target) {
  fs.rmSync(target, {recursive: true, force: true});
  fs.mkdirSync(target, {recursive: true});
}

function buildIndexHtml() {
  const sourcePath = path.join(root, 'examples', 'play.html');
  const outputPath = path.join(dist, 'index.html');
  let html = fs.readFileSync(sourcePath, 'utf8');
  html = html.replace(
    /href="\.\/prototype\.css"/g,
    'href="./examples/prototype.css"'
  );
  html = html.replace(
    /src="\.\.\/gp\/problems\.js"/g,
    'src="./gp/problems.js"'
  );
  html = html.replace(
    /src="\.\.\/build\/index\.min\.js"/g,
    'src="./build/index.min.js"'
  );
  html = html.replace(
    /src="\.\/play\/main\.js"/g,
    'src="./examples/play/main.js"'
  );
  fs.writeFileSync(outputPath, html);
}

ensureCleanDir(dist);
copyDir(path.join(root, 'build'), path.join(dist, 'build'));
copyDir(path.join(root, 'examples'), path.join(dist, 'examples'));
copyDir(path.join(root, 'gp'), path.join(dist, 'gp'));
buildIndexHtml();

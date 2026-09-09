import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'artifacts', 'character-sticker-studio-source.zip');
fs.mkdirSync(path.dirname(destination), { recursive: true });
const stream = fs.createWriteStream(destination);
const zip = archiver('zip', { zlib: { level: 9 } });
const complete = new Promise((resolve, reject) => { stream.on('close', resolve); stream.on('error', reject); zip.on('error', reject); });
zip.pipe(stream);
for (const directory of ['src', 'server', 'docs', 'scripts', 'tests', '.github', 'public']) {
  const resolved = path.join(root, directory);
  if (fs.existsSync(resolved)) zip.directory(resolved, directory);
}
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'README.md', 'LICENSE', '.gitignore', '.gitattributes', '.env.example', '.dockerignore', 'Dockerfile', 'compose.yaml']) {
  if (fs.existsSync(path.join(root, file))) zip.file(path.join(root, file), { name: file });
}
await zip.finalize();
await complete;
console.log(`Source package: ${destination} (${fs.statSync(destination).size} bytes)`);

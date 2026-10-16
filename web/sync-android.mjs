import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const target = new URL('../android/app/src/main/assets/', import.meta.url);
await mkdir(target, { recursive: true });

for (const file of ['app.js', 'app.css', 'style.css', 'energy.svg']) {
  await copyFile(new URL(`public/${file}`, import.meta.url), new URL(file, target));
}

const html = await readFile(new URL('public/index.html', import.meta.url), 'utf8');
await writeFile(
  new URL('index.html', target),
  html.replace(/href="\//g, 'href="').replace(/src="\//g, 'src="'),
);

console.log('Android-Assets aktualisiert.');

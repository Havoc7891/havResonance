import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'LICENSE');
const outputPath = resolve(root, 'public/license.txt');

const source = await readFile(sourcePath);

let existingOutput;

try {
  existingOutput = await readFile(outputPath);
} catch {
  // Note: The file will be created below
}

if (!existingOutput || !source.equals(existingOutput)) {
  await mkdir(dirname(outputPath), { recursive: true });

  await writeFile(outputPath, source);
}

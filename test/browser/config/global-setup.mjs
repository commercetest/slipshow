import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url));
const generated = fileURLToPath(new URL('../generated/', import.meta.url));

const presentations = [
  ['portfolio.md', 'portfolio.html'],
  ['portfolio-vanier.md', 'portfolio-vanier.html'],
  ['renderers.md', 'renderers.html'],
  ['speaker.md', 'speaker.html'],
];

function compile(input, output) {
  const compiler = process.env.SLIPSHOW_BIN;
  const command = compiler || 'dune';
  const args = compiler
    ? ['compile', input, '--output', output]
    : ['exec', 'slipshow', '--', 'compile', input, '--output', output];
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(
      `Could not compile ${path.basename(input)} with ${command}.\n` +
        `${result.stdout}\n${result.stderr}\n` +
        'Run the tests inside the Slipshow opam environment or set SLIPSHOW_BIN.',
    );
  }
}

export default async function globalSetup() {
  await mkdir(generated, { recursive: true });
  for (const [source, output] of presentations) {
    compile(path.join(fixtures, source), path.join(generated, output));
  }
}

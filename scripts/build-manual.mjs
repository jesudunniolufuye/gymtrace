// Writes docs/USER-MANUAL.md from src/content/helpContent.js (the same content
// the in-app Help page shows).   npm run manual
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HELP_SECTIONS } from '../src/content/helpContent.js';

export function renderManual() {
  const out = [
    '# GymTrace user manual',
    '',
    '<!-- Generated from src/content/helpContent.js by `npm run manual`. Edit that file, not this one. -->',
    '',
    'How to use GymTrace, for members, trainers and front-desk staff. The same content is in the app under **Help**, where it can be searched.',
    '',
    '## Contents',
    '',
    ...HELP_SECTIONS.map((s, i) => `${i + 1}. [${s.title}](#${s.id})`),
    '',
  ];
  HELP_SECTIONS.forEach((s, i) => {
    out.push(`<a id="${s.id}"></a>`, '', `## ${i + 1}. ${s.title}`, '', s.intro, '');
    s.topics.forEach((t, j) => {
      out.push(`### ${i + 1}.${j + 1} ${t.q}`, '');
      (t.steps ?? []).forEach((step, k) => out.push(`${k + 1}. ${step}`));
      if (t.steps?.length) out.push('');
      for (const p of t.a ?? []) out.push(p, '');
    });
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = new URL('../docs/USER-MANUAL.md', import.meta.url);
  writeFileSync(target, renderManual());
  console.log('wrote docs/USER-MANUAL.md');
}

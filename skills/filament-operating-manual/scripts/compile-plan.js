#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArguments, resolveProjectPath } from './lib/cli.js';
import { parsePlan } from './lib/plan-parser.js';

const args = parseArguments(process.argv.slice(2));
const planPath = resolveProjectPath(args.string('plan'), 'docs/operating-manual/plan.yaml');
const outputPath = resolveProjectPath(args.string('output'), 'docs/operating-manual/.capture/capture-manifest.json');
const plan = parsePlan(await fs.readFile(planPath, 'utf8'));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`);

console.log(`Compiled ${plan.summary.shots} shots from ${planPath}`);
console.log(`Annotations: ${plan.summary.annotations}; pre-action shots: ${plan.summary.preActionShots}`);
console.log(`Manual-gated shots: ${plan.summary.manualShots}`);
console.log(`Manifest: ${outputPath}`);

for (const warning of plan.warnings) {
    console.warn(`Warning: ${warning}`);
}

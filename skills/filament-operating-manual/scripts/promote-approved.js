#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArguments, resolveProjectPath } from './lib/cli.js';

const args = parseArguments(process.argv.slice(2));
const reviewPath = resolveProjectPath(args.string('review'), 'docs/operating-manual/.capture/review.json');
const manualDir = resolveProjectPath(args.string('manual-dir'), 'docs/operating-manual');
const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
// `manual_required` is a settled outcome, not an unresolved one: those shots are
// deliberately not captured by an unattended run, so they must not hold back the
// ones that are ready. They are reported instead, and their Doc placeholders stay empty.
const unresolved = review.shots.filter((shot) => !['approved', 'skipped', 'manual_required'].includes(shot.reviewStatus));

if (unresolved.length > 0) {
    throw new Error(`Refusing promotion: ${unresolved.length} screenshot(s) are pending review or require retry`);
}

const manualRequired = review.shots.filter((shot) => shot.reviewStatus === 'manual_required');

const approved = review.shots.filter((shot) => shot.reviewStatus === 'approved');

for (const shot of approved) {
    if (shot.machineStatus !== 'passed' || shot.image === null) {
        throw new Error(`Refusing promotion for a screenshot that failed machine checks: ${shot.file}`);
    }

    const destination = path.resolve(manualDir, shot.file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(shot.image, destination);
}

console.log(`Promoted ${approved.length} approved screenshot(s) into ${path.join(manualDir, 'image')}`);

if (manualRequired.length > 0) {
    console.log(`${manualRequired.length} shot(s) still need a manual capture — their placeholders will be empty:`);

    for (const shot of manualRequired) {
        console.log(`  ${shot.file}`);
    }
}

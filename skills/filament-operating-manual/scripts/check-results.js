#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArguments, readJsonIfExists, resolveProjectPath } from './lib/cli.js';
import { isSensitiveRoute, loadManualConfig } from './lib/manual-config.js';

const args = parseArguments(process.argv.slice(2));
const manifestPath = resolveProjectPath(args.string('manifest'), 'docs/operating-manual/.capture/capture-manifest.json');
const resultsPath = resolveProjectPath(args.string('results'), 'docs/operating-manual/.capture/results.json');
const reviewPath = resolveProjectPath(args.string('output'), 'docs/operating-manual/.capture/review.json');
const manualDir = resolveProjectPath(args.string('manual-dir'), 'docs/operating-manual');
const { sensitiveRoutes } = await loadManualConfig(manualDir);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const captureResults = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
const resultById = new Map(captureResults.shots.map((shot) => [shot.id, shot]));
const previousReview = await readJsonIfExists(reviewPath);
const previousReviewById = new Map((previousReview?.shots ?? []).map((shot) => [shot.id, shot]));
const review = {
    version: 1,
    generatedAt: new Date().toISOString(),
    shots: [],
};

review.shots = await Promise.all(manifest.shots.map(async (shot) => {
    const capture = resultById.get(shot.id);
    const checks = [];
    let imageSha256 = null;

    if (capture === undefined) {
        checks.push(failure('capture-result', 'No capture result exists'));
    } else if (capture.status === 'manual_required') {
        checks.push(failure('manual-required', capture.error));
    } else if (capture.status !== 'captured') {
        checks.push(failure('capture-result', capture.error ?? 'Capture failed'));
    } else {
        checks.push(success('capture-result', 'Screenshot captured'));
        const inspection = await inspectPng(capture.output, capture.viewport);
        checks.push(...inspection.checks);
        imageSha256 = inspection.sha256;

        const annotationsPassed = capture.annotations.length === shot.annotations.length
            && capture.annotations.every((annotation) => annotation.ok === true);
        checks.push(annotationsPassed
            ? success('annotations', `${capture.annotations.length} annotation(s) placed`)
            : failure('annotations', 'One or more annotations were not placed'));

        if (isSensitiveRoute(capture.url, sensitiveRoutes)) {
            checks.push(shot.piiMode === 'no-visible-data'
                ? success('pii-mask', 'Plan confirms no personal data is visible')
                : capture.maskedElements > 0
                ? success('pii-mask', `${capture.maskedElements} element(s) masked`)
                : failure('pii-mask', 'Sensitive screen had no masked elements'));
        }
    }

    const manualRequired = capture?.status === 'manual_required';
    const machinePassed = checks.every((check) => check.passed);
    const previous = previousReviewById.get(shot.id);
    const preservedReviewStatus = machinePassed
        && previous?.machineStatus === 'passed'
        && previous.imageSha256 === imageSha256
        ? previous.reviewStatus
        : null;
    return {
        id: shot.id,
        file: shot.file,
        tab: shot.tab,
        resource: shot.resource,
        screen: shot.screen,
        case: shot.case,
        subtitle: shot.subtitle,
        annotations: shot.annotations,
        image: capture?.output ?? null,
        imageSha256,
        machineStatus: manualRequired ? 'manual_required' : (machinePassed ? 'passed' : 'retry'),
        reviewStatus: preservedReviewStatus ?? (manualRequired ? 'manual_required' : (machinePassed ? 'pending_review' : 'retry')),
        checks,
        feedback: preservedReviewStatus === null ? '' : previous.feedback,
    };
}));

review.summary = {
    planned: review.shots.length,
    machinePassed: review.shots.filter((shot) => shot.machineStatus === 'passed').length,
    retry: review.shots.filter((shot) => shot.machineStatus === 'retry').length,
    manualRequired: review.shots.filter((shot) => shot.machineStatus === 'manual_required').length,
};

await fs.mkdir(path.dirname(reviewPath), { recursive: true });
await fs.writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(`Machine checks passed: ${review.summary.machinePassed}/${review.summary.planned}`);
console.log(`Review file: ${reviewPath}`);
process.exitCode = review.summary.retry + review.summary.manualRequired === 0 ? 0 : 1;

async function inspectPng(file, expectedViewport) {
    try {
        const buffer = await fs.readFile(file);
        const signature = buffer.subarray(0, 8).toString('hex');

        if (signature !== '89504e470d0a1a0a' || buffer.length < 24) {
            return { checks: [failure('png', 'File is not a valid PNG')], sha256: null };
        }

        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        const dimensionsMatch = width === expectedViewport.width && height === expectedViewport.height;

        return {
            checks: [
                success('png', `${Math.round(buffer.length / 1024)} KB`),
                dimensionsMatch
                    ? success('dimensions', `${width}x${height}`)
                    : failure('dimensions', `Expected ${expectedViewport.width}x${expectedViewport.height}, got ${width}x${height}`),
            ],
            sha256: createHash('sha256').update(buffer).digest('hex'),
        };
    } catch (error) {
        return { checks: [failure('png', error.message)], sha256: null };
    }
}

function success(name, detail) {
    return { name, passed: true, detail };
}

function failure(name, detail) {
    return { name, passed: false, detail };
}

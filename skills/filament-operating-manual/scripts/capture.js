#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { parseArguments, readJsonIfExists, resolveProjectPath } from './lib/cli.js';
import { isSensitiveRoute, loadManualConfig } from './lib/manual-config.js';
import {
    annotateShot,
    hasScrollPreAction,
    installAnnotator,
    loadBrowserHelpers,
    login,
    maskSensitiveData,
    normalizePage,
    performPreActions,
    resolveShotUrl,
} from './lib/browser.js';

const args = parseArguments(process.argv.slice(2));
const manifestPath = resolveProjectPath(args.string('manifest'), 'docs/operating-manual/.capture/capture-manifest.json');
const captureRoot = resolveProjectPath(args.string('output'), 'docs/operating-manual/.capture/candidates');
const resultsPath = resolveProjectPath(args.string('results'), 'docs/operating-manual/.capture/results.json');
const authStatePath = resolveProjectPath(args.string('auth-state'), 'docs/operating-manual/.capture/auth-state.json');
const baseUrl = args.string('base-url', process.env.ADMIN_URL);
const viewport = parseViewport(args.string('viewport', '1920x1000'));
const workers = parsePositiveInteger(args.string('workers', '3'), 'workers');
const manualDir = resolveProjectPath(args.string('manual-dir'), 'docs/operating-manual');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const manualConfig = await loadManualConfig(manualDir);
const { sensitiveRoutes } = manualConfig;
const selectedShots = await selectShots(manifest.shots, args, resultsPath);

if (baseUrl === undefined) {
    throw new Error('ADMIN_URL or --base-url is required');
}

if (selectedShots.length === 0) {
    console.log('No screenshots matched the requested filters.');
    process.exit(0);
}

const browser = await chromium.launch({ headless: !args.boolean('headed') });
const helpers = await loadBrowserHelpers();
const previousResults = await readJsonIfExists(resultsPath);
const isRetry = args.boolean('append') || args.boolean('failed') || args.string('review') !== undefined;
const results = {
    version: 1,
    startedAt: new Date().toISOString(),
    manifest: manifestPath,
    captureRoot,
    shots: isRetry ? previousResults?.shots ?? [] : [],
};
let persistQueue = Promise.resolve();
let context = null;

try {
    const authenticatedShots = selectedShots.filter((shot) => (shot.captureMode ?? 'automated') === 'automated');
    const isolatedShots = selectedShots.filter((shot) => (shot.captureMode ?? 'automated') !== 'automated');

    await captureQueue(isolatedShots, null);

    if (authenticatedShots.length > 0) {
        try {
            context = await createAuthenticatedContext(browser, baseUrl, viewport, authStatePath);
            await captureQueue(authenticatedShots, context);
        } catch (error) {
            for (const shot of authenticatedShots) {
                await recordResult(shot, {
                    id: shot.id,
                    file: shot.file,
                    status: 'failed',
                    error: `Authentication setup failed: ${error.message}`,
                    durationMs: 0,
                });
            }
        }
    }
} finally {
    results.finishedAt = new Date().toISOString();
    await persistQueue;
    await persistResults(resultsPath, results);
    await context?.close();
    await browser.close();
}

const captured = results.shots.filter((shot) => shot.status === 'captured').length;
console.log(`Captured ${captured}/${results.shots.length}; results: ${resultsPath}`);
process.exitCode = captured === results.shots.length ? 0 : 1;

async function captureQueue(shots, browserContext) {
    const queue = [...shots];
    const workerCount = Math.min(workers, queue.length);

    await Promise.all(Array.from({ length: workerCount }, async (_, workerIndex) => {
        const page = browserContext === null ? null : await browserContext.newPage();
        page?.setDefaultTimeout(10_000);

        try {
            while (queue.length > 0) {
                const shot = queue.shift();
                const result = await captureShot(page, shot, {
                    baseUrl,
                    browser,
                    captureRoot,
                    helpers,
                    manualConfig,
                    sensitiveRoutes,
                    viewport,
                    worker: workerIndex + 1,
                });
                await recordResult(shot, result);
            }
        } finally {
            await page?.close();
        }
    }));
}

async function recordResult(shot, result) {
    results.shots = results.shots.filter((existing) => existing.id !== result.id);
    results.shots.push(result);
    persistQueue = persistQueue.then(() => persistResults(resultsPath, results));
    await persistQueue;
    console.log(`${result.status === 'captured' ? '✓' : '✗'} ${shot.file}${result.error ? ` — ${result.error}` : ''}`);
}

async function createAuthenticatedContext(browserInstance, adminUrl, viewportSize, storagePath) {
    let storageState;

    try {
        await fs.access(storagePath);
        storageState = storagePath;
    } catch {
        storageState = undefined;
    }

    const browserContext = await browserInstance.newContext({
        viewport: viewportSize,
        storageState,
    });
    const page = await browserContext.newPage();
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('/login')) {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (email === undefined || password === undefined) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required when no valid auth state exists');
        }

        await login(page, adminUrl, email, password);
        await fs.mkdir(path.dirname(storagePath), { recursive: true });
        await browserContext.storageState({ path: storagePath });
    }

    await page.close();

    return browserContext;
}

async function captureShot(page, shot, options) {
    const startedAt = Date.now();
    const destination = path.resolve(options.captureRoot, shot.file);
    const captureMode = shot.captureMode ?? 'automated';

    if (!['automated', 'unauthenticated'].includes(captureMode)) {
        return {
            id: shot.id,
            file: shot.file,
            status: 'manual_required',
            error: `Capture mode requires an explicit manual workflow: ${shot.captureMode}`,
            durationMs: 0,
        };
    }

    let activePage = page;
    let anonymousContext = null;

    try {
        if (captureMode === 'unauthenticated') {
            anonymousContext = await options.browser.newContext({ viewport: options.viewport });
            activePage = await anonymousContext.newPage();
            activePage.setDefaultTimeout(10_000);
        }

        await activePage.setViewportSize(options.viewport);
        const url = await resolveShotUrl(activePage, options.baseUrl, shot.url, shot.record);
        await activePage.goto(url, { waitUntil: 'domcontentloaded' });
        await activePage.waitForLoadState('networkidle');

        if (captureMode === 'automated' && activePage.url().includes('/login')) {
            throw new Error('Authentication expired during capture');
        }

        let normalized = await normalizePage(activePage, options.helpers.normalizer);
        if (normalized.h > options.viewport.height && !hasScrollPreAction(shot.preActions)) {
            await activePage.setViewportSize({
                width: options.viewport.width,
                height: Math.min(Math.max(normalized.h, options.viewport.height), 1700),
            });
            normalized = await normalizePage(activePage, options.helpers.normalizer);
        }

        await performPreActions(activePage, shot.preActions, options.helpers.normalizer, options.manualConfig);
        await installAnnotator(activePage, options.helpers.annotator);
        const annotations = await annotateShot(activePage, shot.annotations, shot.annotationTargets ?? [], options.manualConfig);
        const failedAnnotation = annotations.find((annotation) => annotation.ok !== true);

        if (failedAnnotation !== undefined) {
            throw new Error(`Annotation failed: ${failedAnnotation.text} (${failedAnnotation.reason})`);
        }

        const autoMask = isSensitiveRoute(activePage.url(), options.sensitiveRoutes);
        const maskedElements = await maskSensitiveData(activePage, shot.masks ?? [], autoMask, options.manualConfig);

        await fs.mkdir(path.dirname(destination), { recursive: true });
        await activePage.screenshot({ path: destination, fullPage: false });

        return {
            id: shot.id,
            file: shot.file,
            status: 'captured',
            url: activePage.url(),
            output: destination,
            worker: options.worker,
            annotations,
            maskedElements,
            viewport: activePage.viewportSize(),
            capturedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            id: shot.id,
            file: shot.file,
            status: 'failed',
            worker: options.worker,
            error: error.message,
            durationMs: Date.now() - startedAt,
        };
    } finally {
        await anonymousContext?.close();
    }
}

async function selectShots(shots, parsedArgs, previousResultsPath) {
    const only = parsedArgs.string('only');
    const ids = parsedArgs.string('ids');
    let selected = shots;

    if (ids !== undefined) {
        const exactMatches = new Set(ids.split(',').map((value) => value.trim()).filter(Boolean));
        selected = selected.filter((shot) => exactMatches.has(shot.id) || exactMatches.has(shot.file));
    }

    if (only !== undefined) {
        const filters = only.split(',').map((value) => value.trim()).filter(Boolean);
        selected = selected.filter((shot) => filters.some((filter) => shot.id.includes(filter) || shot.file.includes(filter)));
    }

    if (parsedArgs.boolean('failed')) {
        const previous = JSON.parse(await fs.readFile(previousResultsPath, 'utf8'));
        const failedIds = new Set(previous.shots.filter((shot) => shot.status !== 'captured').map((shot) => shot.id));
        selected = selected.filter((shot) => failedIds.has(shot.id));
    }

    const reviewFile = parsedArgs.string('review');
    if (reviewFile !== undefined) {
        const reviewPath = resolveProjectPath(reviewFile, reviewFile);
        const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
        const retryIds = new Set(review.shots.filter((shot) => shot.reviewStatus === 'retry').map((shot) => shot.id));
        selected = selected.filter((shot) => retryIds.has(shot.id));
    }

    return selected;
}

async function persistResults(destination, results) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const ordered = { ...results, shots: [...results.shots].sort((left, right) => left.file.localeCompare(right.file)) };
    await fs.writeFile(destination, `${JSON.stringify(ordered, null, 2)}\n`);
}

function parseViewport(value) {
    const match = value.match(/^(\d+)x(\d+)$/u);

    if (match === null) {
        throw new Error(`Invalid viewport: ${value}; expected WIDTHxHEIGHT`);
    }

    return { width: Number(match[1]), height: Number(match[2]) };
}

function parsePositiveInteger(value, name) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${name} must be a positive integer`);
    }

    return parsed;
}

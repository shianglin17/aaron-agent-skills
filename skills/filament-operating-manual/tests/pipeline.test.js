import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('captures, checks, reviews, and promotes a screenshot', async () => {
    const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manual-runner-'));
    const server = http.createServer((request, response) => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');

        if (request.url === '/admin/news') {
            response.end('<a href="/admin/news/1/edit">編輯</a>');
            return;
        }

        if (request.url === '/admin/news/1/edit' || request.url === '/admin/news/1/related') {
            response.end(`<!doctype html><style>.fi-sidebar{position:fixed;width:220px}.fi-fo-field-wrp{width:420px;min-height:90px;margin:160px 0 0 320px}</style>
                <aside class="fi-sidebar"></aside>
                <div class="fi-fo-field-wrp"><label>狀態</label><div class="fi-fo-field-content-col"><input value="啟用"></div></div>`);
            return;
        }

        if (request.url === '/admin/login') {
            response.end('<main>Login page</main>');
            return;
        }

        response.end('<main>Admin dashboard</main>');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const manifestPath = path.join(temporaryDir, 'manifest.json');
    const resultsPath = path.join(temporaryDir, 'results.json');
    const reviewPath = path.join(temporaryDir, 'review.json');
    const candidateDir = path.join(temporaryDir, 'candidates');
    const contactSheetDir = path.join(temporaryDir, 'contact-sheets');
    const manualDir = path.join(temporaryDir, 'manual');

    await fs.mkdir(manualDir, { recursive: true });
    await fs.writeFile(
        path.join(manualDir, 'manual.config.json'),
        JSON.stringify({ sensitiveRoutes: [], piiLabels: [], dangerousActions: [] }),
    );

    await fs.writeFile(manifestPath, JSON.stringify({
        shots: [{
            id: 'news--edit--01',
            file: 'image/news/edit/01.png',
            url: '/admin/news/{record}/related',
            annotations: ['關閉後前台不顯示'],
            annotationTargets: ['field:狀態'],
            preActions: [],
            masks: [],
        }],
    }));

    try {
        await runNode('scripts/capture.js', [
            '--manifest', manifestPath,
            '--output', candidateDir,
            '--results', resultsPath,
            '--auth-state', path.join(temporaryDir, 'auth.json'),
            '--base-url', `http://127.0.0.1:${port}/admin`,
            '--viewport', '1400x900',
            '--workers', '1',
            '--manual-dir', manualDir,
        ]);
        const captureResults = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
        assert.equal(captureResults.shots[0].status, 'captured');

        await runNode('scripts/check-results.js', [
            '--manifest', manifestPath,
            '--results', resultsPath,
            '--output', reviewPath,
            '--manual-dir', manualDir,
        ]);
        const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
        assert.equal(review.summary.machinePassed, 1);

        await runNode('scripts/generate-contact-sheet.js', [
            '--review', reviewPath,
            '--output', contactSheetDir,
        ]);
        await fs.access(path.join(contactSheetDir, 'sheet-01.png'));

        review.shots[0].reviewStatus = 'approved';
        await fs.writeFile(reviewPath, JSON.stringify(review));
        await runNode('scripts/promote-approved.js', [
            '--review', reviewPath,
            '--manual-dir', manualDir,
        ]);
        await fs.access(path.join(manualDir, 'image/news/edit/01.png'));

        const anonymousManifestPath = path.join(temporaryDir, 'anonymous-manifest.json');
        await fs.writeFile(anonymousManifestPath, JSON.stringify({
            shots: [{
                id: 'login--01',
                file: 'image/login/01.png',
                url: '/admin/login',
                captureMode: 'unauthenticated',
                annotations: [],
                annotationTargets: [],
                preActions: [],
                masks: [],
            }, {
                id: 'login--02',
                file: 'image/login/02.png',
                url: '/admin/login',
                captureMode: 'unauthenticated',
                annotations: [],
                annotationTargets: [],
                preActions: [],
                masks: [],
            }],
        }));
        await runNode('scripts/capture.js', [
            '--manifest', anonymousManifestPath,
            '--output', candidateDir,
            '--results', path.join(temporaryDir, 'anonymous-results.json'),
            '--auth-state', path.join(temporaryDir, 'auth.json'),
            '--base-url', `http://127.0.0.1:${port}/admin`,
            '--workers', '1',
            '--ids', 'login--01',
            '--manual-dir', manualDir,
        ]);
        await fs.access(path.join(candidateDir, 'image/login/01.png'));
        const anonymousResults = JSON.parse(await fs.readFile(path.join(temporaryDir, 'anonymous-results.json'), 'utf8'));
        assert.equal(anonymousResults.shots.length, 1);
        assert.equal(anonymousResults.shots[0].url, `http://127.0.0.1:${port}/admin/login`);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await fs.rm(temporaryDir, { recursive: true, force: true });
    }
});

test('promotes what is ready even when some shots still need a manual capture', async () => {
    const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manual-promote-'));
    const manualDir = path.join(temporaryDir, 'manual');
    const reviewPath = path.join(temporaryDir, 'review.json');
    const candidate = path.join(temporaryDir, 'candidate.png');

    try {
        await fs.writeFile(candidate, Buffer.from('89504e470d0a1a0a', 'hex'));
        await fs.writeFile(reviewPath, JSON.stringify({
            shots: [
                { file: 'image/a/01.png', reviewStatus: 'approved', machineStatus: 'passed', image: candidate },
                { file: 'image/b/01.png', reviewStatus: 'manual_required', machineStatus: 'manual_required', image: null },
            ],
        }));

        await runNode('scripts/promote-approved.js', ['--review', reviewPath, '--manual-dir', manualDir]);

        await fs.access(path.join(manualDir, 'image/a/01.png'));
        await assert.rejects(
            fs.access(path.join(manualDir, 'image/b/01.png')),
            'a manual-required shot is reported, not promoted',
        );
    } finally {
        await fs.rm(temporaryDir, { recursive: true, force: true });
    }
});

async function runNode(script, args) {
    const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [script, ...args], {
            cwd: skillDir,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', (code) => resolve({ code, stdout, stderr }));
    });

    assert.equal(result.code, 0, `${script} failed\n${result.stdout}\n${result.stderr}`);
}

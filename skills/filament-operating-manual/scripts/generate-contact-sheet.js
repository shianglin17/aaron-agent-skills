#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { parseArguments, resolveProjectPath } from './lib/cli.js';

const args = parseArguments(process.argv.slice(2));
const reviewPath = resolveProjectPath(args.string('review'), 'docs/operating-manual/.capture/review.json');
const outputDir = resolveProjectPath(args.string('output'), 'docs/operating-manual/.capture/contact-sheets');
const pageSize = Number.parseInt(args.string('page-size', '12'), 10);
const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

await fs.mkdir(outputDir, { recursive: true });

try {
    for (let offset = 0; offset < review.shots.length; offset += pageSize) {
        const batch = review.shots.slice(offset, offset + pageSize);
        const number = String(Math.floor(offset / pageSize) + 1).padStart(2, '0');
        const htmlPath = path.join(outputDir, `sheet-${number}.html`);
        const pngPath = path.join(outputDir, `sheet-${number}.png`);
        await fs.writeFile(htmlPath, renderSheet(batch, offset));
        await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
        await page.screenshot({ path: pngPath, fullPage: true });
        console.log(`Generated ${pngPath}`);
    }
} finally {
    await page.close();
    await browser.close();
}

function renderSheet(shots, offset) {
    const cards = shots.map((shot, index) => {
        const source = shot.image === null ? '' : pathToFileURL(shot.image).toString();
        const stateClass = shot.machineStatus === 'passed' ? 'passed' : 'retry';

        const title = [shot.resource, shot.screen, shot.case].filter(Boolean).join(' / ');

        return `<article class="${stateClass}">
            <header><strong>${offset + index + 1}. ${escapeHtml(title)}</strong><small>${escapeHtml(shot.file)}</small></header>
            ${source === '' ? '<div class="missing">NO IMAGE</div>' : `<img src="${source}">`}
            <footer><span>${escapeHtml(shot.machineStatus)}</span><span>${shot.annotations.length} annotation(s)</span></footer>
        </article>`;
    }).join('\n');

    return `<!doctype html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        body { margin: 20px; background: #e5e7eb; font: 16px system-ui, sans-serif; }
        main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        article { overflow: hidden; background: white; border: 4px solid #16a34a; border-radius: 8px; }
        article.retry { border-color: #dc2626; }
        header, footer { padding: 8px 12px; font-weight: 700; }
        header strong, header small { display: block; }
        header small { margin-top: 4px; color: #4b5563; font-weight: 500; }
        footer { display: flex; justify-content: space-between; color: #fff; background: #16a34a; }
        .retry footer { background: #dc2626; }
        img, .missing { display: block; width: 100%; height: 270px; object-fit: contain; background: #111827; }
        .missing { display: grid; place-items: center; color: white; font-size: 32px; }
    </style></head><body><main>${cards}</main></body></html>`;
}

function escapeHtml(value) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

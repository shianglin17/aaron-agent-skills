import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import {
    annotateShot,
    installAnnotator,
    loadBrowserHelpers,
    login,
    maskSensitiveData,
    normalizePage,
    performPreActions,
} from '../scripts/lib/browser.js';

test('authenticates through the initialized Filament login component', async () => {
    let currentUrl = 'https://example.com/admin/login';
    let credentials;
    const page = {
        async evaluate(callback, submittedCredentials) {
            assert.equal(typeof callback, 'function');
            credentials = submittedCredentials;
            currentUrl = 'https://example.com/admin';
        },
        async goto(url, options) {
            assert.equal(url, 'https://example.com/admin/login');
            assert.deepEqual(options, { waitUntil: 'domcontentloaded' });
        },
        url() {
            return currentUrl;
        },
        async waitForFunction(callback) {
            assert.equal(typeof callback, 'function');
        },
        async waitForLoadState(state) {
            assert.equal(state, 'networkidle');
        },
        async waitForURL(predicate, options) {
            await Promise.resolve();
            assert.equal(predicate(new URL(currentUrl)), true);
            assert.deepEqual(options, { timeout: 10_000 });
        },
    };

    await login(page, 'https://example.com/admin/', 'manual@example.com', 'secret');

    assert.deepEqual(credentials, { email: 'manual@example.com', password: 'secret' });
});

test('runs a pre-action, resolves a field annotation, and masks sensitive data', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

    try {
        await page.setContent(`
            <style>
                .fi-fo-field { width: 360px; min-height: 80px; margin: 120px 0 0 300px; }
                .spacer { height: 900px; }
                .fi-fieldset { width: 420px; min-height: 180px; margin-left: 300px; }
            </style>
            <button role="tab" onclick="this.dataset.clicked = 'true'">內容</button>
            <button role="tab" onclick="this.dataset.clicked = 'true'">服務項目</button>
            <button id="sidebar-permissions" onclick="this.dataset.clicked = 'true'">使用者與權限</button>
            <section class="fi-section">
                <header class="fi-section-header" onclick="this.nextElementSibling.setAttribute('aria-expanded', 'true')">
                    <h3 class="fi-section-header-heading">使用者與權限</h3>
                </header>
                <div class="fi-section-content-ctn" aria-expanded="false">
                    <section class="fi-section">
                        <header class="fi-section-header">
                            <h4 class="fi-section-header-heading">封鎖名單</h4>
                        </header>
                        <div class="fi-section-content-ctn">封鎖名單權限明細</div>
                    </section>
                </div>
            </section>
            <div class="fi-section-header">狀態</div>
            <div class="field-pair">
                <div class="fi-fo-field">
                    <label>狀態</label>
                    <div class="fi-fo-field-content-col"><input value="啟用"></div>
                </div>
                <div class="fi-fo-field">
                    <label>姓名<span>*</span></label>
                    <div class="fi-fo-field-content-col"><input value="王小明"></div>
                </div>
            </div>
            <div class="spacer"></div>
            <fieldset class="fi-fieldset fi-sc-fieldset">
                <legend>特殊假日</legend>
                <input value="每週日休診">
            </fieldset>
        `);
        const helpers = await loadBrowserHelpers();

        await normalizePage(page, helpers.normalizer);
        assert.match(
            await page.locator('#manual-capture-stability').textContent(),
            /transition-duration: 0s/u,
        );

        await performPreActions(page, ['切換到「內容」分頁 → 「服務項目」'], helpers.normalizer);
        assert.equal(await page.getByRole('tab', { name: '內容' }).getAttribute('data-clicked'), 'true');
        assert.equal(await page.getByRole('tab', { name: '服務項目' }).getAttribute('data-clicked'), 'true');

        await performPreActions(page, ['展開「使用者與權限」權限群組'], helpers.normalizer);
        assert.equal(await page.locator('section.fi-section').first().locator(':scope > .fi-section-content-ctn').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#sidebar-permissions').getAttribute('data-clicked'), null);

        await installAnnotator(page, helpers.annotator);
        const nestedSection = await annotateShot(page, ['封鎖名單權限'], ['section:封鎖名單']);
        assert.equal(nestedSection[0].ok, true);
        assert.ok(nestedSection[0].targetRect.height < 200);
        await page.evaluate(() => window.__annClear());

        const annotations = await annotateShot(page, ['「狀態」關閉後前台不顯示'], ['field:狀態']);
        assert.equal(annotations[0].ok, true);
        assert.ok(annotations[0].targetRect.width >= 350);
        assert.ok(annotations[0].targetRect.height >= 80);
        assert.equal(await page.locator('#__ann_overlay').count(), 1);

        await page.evaluate(() => window.__annClear());
        const inferred = await annotateShot(page, ['姓名顯示於使用者資料'], []);
        assert.equal(inferred[0].ok, true);
        assert.equal(inferred[0].target, 'inferred-rendered-label:姓名');

        await page.evaluate(() => window.__annClear());
        const grouped = await annotateShot(page, ['相關欄位'], ['field-group:狀態|姓名']);
        assert.equal(grouped[0].ok, true);
        assert.ok(grouped[0].targetRect.height >= 280);

        await page.evaluate(() => window.__annClear());
        await performPreActions(page, ['捲動到「特殊假日」欄位群組'], helpers.normalizer);
        assert.ok(await page.evaluate(() => window.scrollY) > 0);
        const fieldset = await annotateShot(page, ['特殊假日最多 3 列'], ['fieldset:特殊假日']);
        assert.equal(fieldset[0].ok, true);
        assert.ok(fieldset[0].targetRect.top >= 0);
        assert.ok(fieldset[0].targetRect.bottom <= 800);

        const masked = await maskSensitiveData(page, ['field:姓名']);
        assert.equal(masked, 1);
        assert.equal(
            await page.locator('label:text-is("姓名")').locator('xpath=..').locator('.fi-fo-field-content-col').getAttribute('data-manual-masked'),
            'true',
        );
    } finally {
        await page.close();
        await browser.close();
    }
});

test('drives a toggle to a stated state and picks a select option', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

    try {
        await page.setContent(`
            <div class="field"><label>本國人</label>
                <button role="switch" aria-checked="true"
                        onclick="this.setAttribute('aria-checked', this.getAttribute('aria-checked')==='true'?'false':'true');
                                 document.getElementById('id-label').textContent = this.getAttribute('aria-checked')==='true'?'身分證號':'護照號碼'">切換</button>
            </div>
            <div class="field"><label id="id-label">身分證號</label><input value="A123"></div>
            <div class="field"><label>狀態</label>
                <select><option>啟用</option><option>停用</option></select>
            </div>
        `);
        const helpers = await loadBrowserHelpers();

        // Already in the requested state — must be a no-op, not a flip.
        await performPreActions(page, ['將「本國人」切換為開啟'], helpers.normalizer);
        assert.equal(await page.locator('[role="switch"]').getAttribute('aria-checked'), 'true');
        assert.equal(await page.locator('#id-label').textContent(), '身分證號');

        await performPreActions(page, ['將「本國人」切換為關閉'], helpers.normalizer);
        assert.equal(await page.locator('[role="switch"]').getAttribute('aria-checked'), 'false');
        assert.equal(await page.locator('#id-label').textContent(), '護照號碼', 'the conditional field revealed itself');

        // Re-running the same instruction must leave it where it is.
        await performPreActions(page, ['將「本國人」切換為關閉'], helpers.normalizer);
        assert.equal(await page.locator('[role="switch"]').getAttribute('aria-checked'), 'false');

        await performPreActions(page, ['在「狀態」選擇「停用」'], helpers.normalizer);
        assert.equal(await page.locator('select').inputValue(), '停用');

        await assert.rejects(
            performPreActions(page, ['在「狀態」選擇「不存在的選項」'], helpers.normalizer),
            /found no option named/u,
        );
    } finally {
        await page.close();
        await browser.close();
    }
});

test('resolves table, modal and page-header without any project selectors', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

    try {
        await page.setContent(`
            <style>header, table, [role="dialog"] { display: block; width: 500px; min-height: 90px; margin: 20px; }</style>
            <main>
                <header><h1>據點管理</h1></header>
                <table>
                    <thead><tr><th>名稱</th><th>啟用</th></tr></thead>
                    <tbody><tr><td>台北院所</td><td>是</td></tr></tbody>
                </table>
                <div role="dialog" aria-label="確認刪除"><p>確定要刪除嗎</p></div>
            </main>
        `);
        const helpers = await loadBrowserHelpers();
        await installAnnotator(page, helpers.annotator);

        for (const [label, target] of [['整個表格', 'table'], ['彈窗', 'modal'], ['頁首', 'page-header']]) {
            await page.evaluate(() => window.__annClear());
            const [result] = await annotateShot(page, [label], [target]);
            assert.equal(result.ok, true, `${target} should resolve`);
            assert.ok(result.targetRect.width >= 400, `${target} should box the whole element`);
        }
    } finally {
        await page.close();
        await browser.close();
    }
});

test('falls back to a project selector only when the portable strategy finds nothing', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

    try {
        // A section built from bare divs — no <section>, no landmark, no heading element.
        await page.setContent(`
            <style>.card { width: 480px; min-height: 120px; margin: 30px; }</style>
            <div class="card"><div class="card-title">通知設定</div><div>內容</div></div>
        `);
        const helpers = await loadBrowserHelpers();
        await installAnnotator(page, helpers.annotator);

        await assert.rejects(
            annotateShot(page, ['這個區塊'], ['section:通知設定']),
            /matched 0 visible sections/u,
            'without configuration the portable strategy correctly finds nothing',
        );

        const [result] = await annotateShot(page, ['這個區塊'], ['section:通知設定'], {
            selectors: { section: '.card', sectionHeading: ':scope > .card-title' },
        });
        assert.equal(result.ok, true);
        assert.ok(result.targetRect.width >= 400, 'the configured selector boxes the whole card');
    } finally {
        await page.close();
        await browser.close();
    }
});

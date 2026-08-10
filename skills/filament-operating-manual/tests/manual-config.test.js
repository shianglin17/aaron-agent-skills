import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { isSensitiveRoute, loadManualConfig } from '../scripts/lib/manual-config.js';

const validConfig = {
    sensitiveRoutes: ['members', 'bookings'],
    piiLabels: ['姓名', '電話'],
    dangerousActions: ['儲存', '刪除'],
};

async function withConfig(contents, assertion) {
    const manualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manual-config-'));

    try {
        if (contents !== null) {
            await fs.writeFile(path.join(manualDir, 'manual.config.json'), JSON.stringify(contents));
        }

        await assertion(manualDir);
    } finally {
        await fs.rm(manualDir, { recursive: true, force: true });
    }
}

test('reads the project config', async () => {
    await withConfig(validConfig, async (manualDir) => {
        const config = await loadManualConfig(manualDir);

        assert.deepEqual(config.sensitiveRoutes, ['members', 'bookings']);
        assert.deepEqual(config.piiLabels, ['姓名', '電話']);
        assert.deepEqual(config.dangerousActions, ['儲存', '刪除']);
        assert.deepEqual(config.selectors, {}, 'selectors is optional — an accessible admin needs none');
    });
});

test('refuses to run without a config instead of silently masking nothing', async () => {
    await withConfig(null, (manualDir) => assert.rejects(loadManualConfig(manualDir), /Missing .*manual\.config\.json/));
    await withConfig({ ...validConfig, sensitiveRoutes: 'members' }, (manualDir) =>
        assert.rejects(loadManualConfig(manualDir), /must declare sensitiveRoutes as an array/));
});

test('requires the safety lists, because a missing one disarms a guardrail silently', async () => {
    // Both lists are written in the admin's own language. Omitting one on a
    // differently-localised admin would publish PII, or let a save button through,
    // with no error at all — so absence must fail loudly here instead.
    for (const key of ['piiLabels', 'dangerousActions']) {
        const { [key]: _omitted, ...rest } = validConfig;

        await withConfig(rest, (manualDir) =>
            assert.rejects(loadManualConfig(manualDir), new RegExp(`must declare ${key} as an array`), `${key} must be required`));
    }

    await withConfig({ ...validConfig, piiLabels: [] }, (manualDir) =>
        assert.rejects(loadManualConfig(manualDir), /lists sensitiveRoutes but no piiLabels/));

    // An admin with no personal data anywhere may legitimately declare both empty.
    await withConfig({ sensitiveRoutes: [], piiLabels: [], dangerousActions: [] }, async (manualDir) => {
        assert.deepEqual((await loadManualConfig(manualDir)).sensitiveRoutes, []);
    });
});

test('matches whole path segments only', () => {
    const routes = ['members', 'users'];

    assert.equal(isSensitiveRoute('https://admin.test/admin/members', routes), true);
    assert.equal(isSensitiveRoute('https://admin.test/admin/members/7/edit', routes), true);
    assert.equal(isSensitiveRoute('https://admin.test/admin/team-members', routes), false);
    assert.equal(isSensitiveRoute('https://admin.test/admin/news', routes), false);
    assert.equal(isSensitiveRoute('https://admin.test/admin/members', []), false);
});

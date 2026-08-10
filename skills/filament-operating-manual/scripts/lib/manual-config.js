import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Project-specific manual settings. The runner itself stays project-agnostic;
 * everything it needs to know about a particular admin lives in this file.
 *
 * @typedef {object} ManualConfig
 * @property {string[]} sensitiveRoutes Path segments whose screens show personal data.
 * @property {string[]} piiLabels Field/column labels to blur automatically on those screens.
 * @property {string[]} dangerousActions Button labels the runner must never click.
 * @property {Record<string, string>} selectors Fallback selectors, only for target
 *   types whose portable strategy fails on this admin. Empty is the healthy default.
 */

/** Only these keys mean anything; a typo would otherwise fail silently at capture time. */
const knownSelectors = ['field', 'fieldValue', 'fieldset', 'section', 'sectionHeading', 'sectionHeader', 'table', 'modal', 'pageHeader'];

/**
 * These two are the runner's safety net and are **written in the admin's own language**,
 * so they cannot live in code: on an admin that renders "Name" or "Save", a hardcoded
 * Chinese list matches nothing and both protections become silent no-ops — PII gets
 * published and a mutating button becomes clickable, with no error either way.
 * Requiring them here turns that silence into a startup failure.
 */
const requiredLists = ['sensitiveRoutes', 'piiLabels', 'dangerousActions'];

/**
 * @param {string} manualDir
 * @return {Promise<ManualConfig>}
 */
export async function loadManualConfig(manualDir) {
    const configPath = path.resolve(manualDir, 'manual.config.json');
    let raw;

    try {
        raw = await fs.readFile(configPath, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Missing ${configPath}. It must declare ${requiredLists.join(', ')} — see build.md.`);
        }

        throw error;
    }

    const config = JSON.parse(raw);

    for (const key of requiredLists) {
        if (!Array.isArray(config[key]) || config[key].some((item) => typeof item !== 'string')) {
            throw new Error(`${configPath} must declare ${key} as an array of strings. Use [] only if you mean it — see build.md.`);
        }
    }

    const selectors = config.selectors ?? {};
    const unknown = Object.keys(selectors).filter((key) => !knownSelectors.includes(key));

    if (unknown.length > 0) {
        throw new Error(`${configPath} has unknown selectors: ${unknown.join(', ')}. Known keys: ${knownSelectors.join(', ')}`);
    }

    if (config.sensitiveRoutes.length > 0 && config.piiLabels.length === 0) {
        throw new Error(`${configPath} lists sensitiveRoutes but no piiLabels, so nothing would ever be masked on those screens`);
    }

    return {
        sensitiveRoutes: config.sensitiveRoutes,
        piiLabels: config.piiLabels,
        dangerousActions: config.dangerousActions,
        selectors,
    };
}

/**
 * @param {string} url
 * @param {string[]} sensitiveRoutes
 * @return {boolean}
 */
export function isSensitiveRoute(url, sensitiveRoutes) {
    const segments = new URL(url).pathname.split('/');

    return sensitiveRoutes.some((route) => segments.includes(route));
}

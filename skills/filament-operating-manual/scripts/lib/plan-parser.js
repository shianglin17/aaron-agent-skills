import path from 'node:path';
import { load } from 'js-yaml';

/**
 * How a shot is captured. Only the first two run unattended; the `manual-*` modes
 * are reported as needing a human and are never attempted by the runner.
 *
 * - `manual-permission-demo` — needs a real write to the admin (flip a permission, capture the effect)
 * - `manual-access-required` — the capture account cannot reach this screen at all;
 *   someone with sufficient rights has to shoot it
 */
const captureModes = ['automated', 'unauthenticated', 'manual-permission-demo', 'manual-access-required'];

/**
 * The plan is a nested tree — tab → resource → screen → (case) → shot — mirroring
 * the manual's own hierarchy. Capture works on a flat shot list, so parsing is
 * just "walk the tree, carry the context down". Ordering is positional: headings
 * carry no stored number, and the `N.` prefixes are generated when rendering.
 *
 * @typedef {object} Shot
 * @property {string} id
 * @property {string} tab
 * @property {string} resource
 * @property {string} screen
 * @property {string|null} case
 * @property {string|null} subtitle
 * @property {string|null} url
 * @property {string|null} record
 * @property {string} file
 * @property {string} captureMode
 * @property {string} piiMode
 * @property {string[]} annotations
 * @property {string[]} annotationTargets
 * @property {string[]} preActions
 * @property {string[]} masks
 * @property {string} at Location in the plan, for error messages.
 */

export function parsePlan(source) {
    const plan = load(source);
    const shots = flattenShots(plan);
    const warnings = validateShots(shots);

    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        shots,
        warnings,
        summary: summarizeShots(shots),
    };
}

function flattenShots(plan) {
    const shots = [];
    const tabs = expectArray(plan?.tabs, 'tabs');

    for (const [tabIndex, tab] of tabs.entries()) {
        const tabAt = `tabs[${tabIndex}]`;
        expectName(tab, tabAt);

        for (const [resourceIndex, resource] of expectArray(tab.resources, `${tabAt}.resources`).entries()) {
            const resourceAt = `${tabAt}.resources[${resourceIndex}]`;
            expectName(resource, resourceAt);

            for (const [screenIndex, screen] of expectArray(resource.screens, `${resourceAt}.screens`).entries()) {
                const screenAt = `${resourceAt}.screens[${screenIndex}]`;
                expectName(screen, screenAt);

                const context = {
                    tab: tab.name,
                    resource: resource.name,
                    screen: screen.name,
                    url: screen.url ?? null,
                    record: screen.record ?? null,
                };

                collectShots(shots, screen.shots, `${screenAt}.shots`, {
                    ...context,
                    case: null,
                    subtitle: screen.subtitle ?? null,
                });

                for (const [caseIndex, planCase] of (screen.cases ?? []).entries()) {
                    const caseAt = `${screenAt}.cases[${caseIndex}]`;
                    expectName(planCase, caseAt);

                    collectShots(shots, planCase.shots, `${caseAt}.shots`, {
                        ...context,
                        case: planCase.name,
                        subtitle: planCase.subtitle ?? null,
                        // A case may need a different representative record than its screen —
                        // e.g. the case that teaches a default-source record must select that
                        // very record, while its siblings must avoid it.
                        url: planCase.url ?? context.url,
                        record: planCase.record ?? context.record,
                    });
                }
            }
        }
    }

    return shots;
}

function collectShots(shots, entries, at, context) {
    for (const [index, shot] of (entries ?? []).entries()) {
        const shotAt = `${at}[${index}]`;

        if (typeof shot?.file !== 'string') {
            throw new Error(`Shot needs a file at ${shotAt}`);
        }

        shots.push({
            id: shot.file.replace(/\.png$/i, '').replaceAll('/', '--'),
            ...context,
            file: shot.file,
            captureMode: shot.capture ?? 'automated',
            piiMode: shot.pii ?? 'auto',
            annotations: expectStrings(shot.annotate, `${shotAt}.annotate`),
            annotationTargets: expectStrings(shot.targets, `${shotAt}.targets`),
            preActions: expectStrings(shot.pre_actions, `${shotAt}.pre_actions`),
            masks: expectStrings(shot.mask, `${shotAt}.mask`),
            at: shotAt,
        });
    }
}

function expectArray(value, at) {
    if (!Array.isArray(value)) {
        throw new Error(`Expected a list at ${at}`);
    }

    return value;
}

function expectName(node, at) {
    if (typeof node?.name !== 'string' || node.name.trim() === '') {
        throw new Error(`Expected a name at ${at}`);
    }
}

function expectStrings(value, at) {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new Error(`Expected a list of strings at ${at}`);
    }

    return value;
}

function validateShots(shots) {
    const seenFiles = new Set();
    const warnings = [];

    for (const shot of shots) {
        const normalizedFile = path.posix.normalize(shot.file);

        if (!normalizedFile.startsWith('image/') || path.posix.isAbsolute(normalizedFile) || normalizedFile.includes('../')) {
            throw new Error(`Unsafe screenshot path at ${shot.at}: ${shot.file}`);
        }

        if (!normalizedFile.endsWith('.png')) {
            throw new Error(`Screenshot must be a PNG at ${shot.at}: ${shot.file}`);
        }

        if (shot.url === null) {
            warnings.push(`Shot has no capture URL at ${shot.at}: ${shot.file}`);
        }

        if (shot.annotationTargets.length > 0 && shot.annotationTargets.length !== shot.annotations.length) {
            throw new Error(`Annotation target count does not match annotation count at ${shot.at}: ${shot.file}`);
        }

        if (!['auto', 'no-visible-data'].includes(shot.piiMode)) {
            throw new Error(`Unknown PII mode at ${shot.at}: ${shot.piiMode}`);
        }

        if (!captureModes.includes(shot.captureMode)) {
            throw new Error(`Unknown capture mode at ${shot.at}: ${shot.captureMode}. Known modes: ${captureModes.join(', ')}`);
        }

        if (seenFiles.has(normalizedFile)) {
            throw new Error(`Duplicate screenshot path at ${shot.at}: ${shot.file}`);
        }

        shot.file = normalizedFile;
        seenFiles.add(normalizedFile);
    }

    return warnings;
}

export function summarizeShots(shots) {
    return {
        shots: shots.length,
        annotatedShots: shots.filter((shot) => shot.annotations.length > 0).length,
        annotations: shots.reduce((total, shot) => total + shot.annotations.length, 0),
        preActionShots: shots.filter((shot) => shot.preActions.length > 0).length,
        manualShots: shots.filter((shot) => !['automated', 'unauthenticated'].includes(shot.captureMode)).length,
        tabs: new Set(shots.map((shot) => shot.tab)).size,
        resources: new Set(shots.map((shot) => `${shot.tab}/${shot.resource}`)).size,
    };
}

import fs from 'node:fs/promises';

const scrollActionPattern = /^捲動到/u;

/**
 * Matches a button label the runner must never click. The labels come from the
 * project's config because they are written in the admin's own language — a list
 * baked into this file would match nothing on a differently-localised admin and
 * silently disarm the guardrail.
 */
function matchesAny(labels) {
    if (labels.length === 0) {
        return () => false;
    }

    const pattern = new RegExp(`^(${labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|')})$`, 'u');

    return (label) => pattern.test(label);
}

/** Marks and blurs one element, returning how many it newly masked. Idempotent across passes. */
const blurHelperSource = `window.__blur = (element) => {
    if (!element || element.dataset.manualMasked === 'true') {
        return 0;
    }

    element.style.filter = 'blur(8px)';
    element.style.webkitFilter = 'blur(8px)';
    element.dataset.manualMasked = 'true';

    return 1;
};`;

export async function login(page, baseUrl, email, password) {
    await page.goto(new URL('/admin/login', baseUrl).toString(), { waitUntil: 'domcontentloaded' });

    if (!page.url().includes('/login')) {
        return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => window.Livewire !== undefined);
    await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 }).catch(() => null),
        page.evaluate(async (credentials) => {
            const component = window.Livewire.all().find((candidate) => candidate.name === 'Filament\\Auth\\Pages\\Login');
            await component.$wire.$set('data.email', credentials.email, false);
            await component.$wire.$set('data.password', credentials.password, false);
            await component.$wire.authenticate();
        }, { email, password }),
    ]);

    if (page.url().includes('/login')) {
        throw new Error('Login failed: the browser remained on the login page');
    }
}

export async function resolveShotUrl(page, baseUrl, route, recordSelector = null) {
    if (route === null) {
        throw new Error('The shot has no url; add a deterministic starting url to plan.yaml');
    }

    if (!route.includes('{record}')) {
        return new URL(route, baseUrl).toString();
    }

    const [beforeRecord, afterRecord] = route.split('{record}');
    const listUrl = new URL(beforeRecord.replace(/\/$/, ''), baseUrl).toString();
    await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const candidateLinks = recordSelector === null
        ? page.locator('a[href]')
        : resolveRecordRows(page, recordSelector).locator('a[href]');
    const resolved = await candidateLinks.evaluateAll((links, parts) => {
        const [before, after] = parts;
        const escapedBefore = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedAfter = after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const urls = links
            .map((link) => link.href)
            .filter(Boolean);
        const exact = urls.find((candidate) => {
                const url = new URL(candidate);
                const start = url.pathname.indexOf(before);

                return start !== -1
                    && url.pathname.slice(start + before.length).match(new RegExp(`^[^/]+${escapedAfter}$`));
            });

        if (exact !== undefined) {
            return { href: exact, record: null };
        }

        for (const candidate of urls) {
            const match = new URL(candidate).pathname.match(new RegExp(`${escapedBefore}([^/]+)(?:/|$)`));

            if (match !== null && match[1] !== 'create') {
                return { href: null, record: match[1] };
            }
        }

        return null;
    }, [beforeRecord, afterRecord]);

    if (resolved === null) {
        throw new Error(`No representative record link matched ${route}`);
    }

    if (resolved.href !== null) {
        return resolved.href;
    }

    return new URL(`${beforeRecord}${resolved.record}${afterRecord}`, baseUrl).toString();
}

function resolveRecordRows(page, selector) {
    if (selector.startsWith('text:')) {
        return page.locator('tbody tr').filter({ hasText: selector.slice(5) });
    }

    if (selector.startsWith('not-text:')) {
        return page.locator('tbody tr').filter({ hasNotText: selector.slice(9) });
    }

    throw new Error(`Unknown record selector: ${selector}`);
}

export async function normalizePage(page, normalizerSource) {
    await page.evaluate(normalizerSource);
    await page.waitForTimeout(150);

    const result = await page.evaluate(normalizerSource);
    await page.waitForTimeout(50);

    return result;
}

/** A compound instruction chains steps with `→`. */
function preActionSteps(instruction) {
    return instruction.split(/\s*→\s*/u).map((step) => step.trim());
}

/** Scrolling changes the viewport, so the caller must not resize it away beforehand. */
export function hasScrollPreAction(preActions) {
    return preActions.some((instruction) => preActionSteps(instruction).some((step) => scrollActionPattern.test(step)));
}

export async function performPreActions(page, preActions, normalizerSource, config = {}) {
    for (const instruction of preActions) {
        for (const normalizedAction of preActionSteps(instruction)) {
            await performPreAction(page, normalizedAction, config);

            if (scrollActionPattern.test(normalizedAction)) {
                await page.waitForTimeout(250);

                continue;
            }

            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2_000);
            await normalizePage(page, normalizerSource);
        }
    }
}

async function performPreAction(page, instruction, config) {
    const { selectors = {}, dangerousActions = [] } = config;
    const quoted = extractQuoted(instruction);

    if (/^展開/u.test(instruction) && /(區塊|權限群組)/u.test(instruction) && quoted.length === 1) {
        await expandMainSection(page, quoted[0], instruction, selectors);

        return;
    }

    if (/^捲動到/u.test(instruction) && /欄位群組/u.test(instruction) && quoted.length === 1) {
        const fieldsets = await matchTargets(page, 'fieldset', quoted[0], selectors);

        if (fieldsets.length !== 1) {
            throw new Error(`Pre-action matched ${fieldsets.length} visible fieldsets: ${instruction}`);
        }

        const handle = await fieldsets[0].elementHandle();

        try {
            await handle.evaluate((fieldset) => fieldset.scrollIntoView({ block: 'center', inline: 'nearest' }));
        } finally {
            await handle.dispose();
        }

        return;
    }

    if (/切換到/u.test(instruction) && /(分頁|頁籤)/u.test(instruction) && quoted.length > 0) {
        await clickVisible(page.getByRole('tab', { name: quoted.at(-1), exact: true }), instruction);

        return;
    }

    if (/^將/u.test(instruction) && /切換為/u.test(instruction) && quoted.length === 1) {
        await setToggleField(page, quoted[0], /(開啟|啟用|開|是)\s*$/u.test(instruction), instruction, selectors);

        return;
    }

    if (/^在/u.test(instruction) && /選擇|選為/u.test(instruction) && quoted.length === 2) {
        await selectFieldOption(page, quoted[0], quoted[1], instruction, selectors);

        return;
    }

    if (/^「[^」]+」$/u.test(instruction) && quoted.length === 1) {
        await clickVisible(page.getByRole('tab', { name: quoted[0], exact: true }), instruction);

        return;
    }

    if (/從列表點任一筆/u.test(instruction) && quoted.length > 0) {
        const row = page.locator('tbody tr').first();
        await clickVisible(row.getByRole('button', { name: quoted.at(-1), exact: true }).or(
            row.getByRole('link', { name: quoted.at(-1), exact: true }),
        ), instruction);

        return;
    }

    if (/(點擊|點選|展開)/u.test(instruction) && quoted.length > 0) {
        const label = quoted.at(-1);

        if (matchesAny(dangerousActions)(label)) {
            throw new Error(`Refused potentially mutating pre-action: ${instruction}`);
        }

        const locator = page.getByRole('button', { name: label, exact: true }).or(
            page.getByRole('link', { name: label, exact: true }).or(
                page.getByText(label, { exact: true }),
            ),
        );

        if (/第一個/u.test(instruction)) {
            await clickVisible(locator, instruction, { unique: false });
        } else {
            await clickVisible(locator, instruction);
        }

        return;
    }

    throw new Error(`Unsupported pre-action: ${instruction}`);
}

/** The one field of a shot's form whose label matches, resolved the same way `field:` targets are. */
async function uniqueFieldHandle(page, label, instruction, selectors) {
    const fields = await matchTargets(page, 'field', label, selectors);

    if (fields.length !== 1) {
        throw new Error(`Pre-action matched ${fields.length} visible fields: ${instruction}`);
    }

    return fields[0].elementHandle();
}

/**
 * Drives a toggle to an explicit state rather than flipping it, so the instruction
 * is idempotent — re-running a capture must produce the same screenshot.
 */
async function setToggleField(page, label, desired, instruction, selectors) {
    const field = await uniqueFieldHandle(page, label, instruction, selectors);

    try {
        const control = await field.evaluateHandle((element) => element.querySelector('[role="switch"], input[type="checkbox"], [role="checkbox"]'));

        try {
            if (!await control.evaluate((node) => node !== null)) {
                throw new Error(`Pre-action found no toggle in that field: ${instruction}`);
            }

            const isOn = (node) => node.getAttribute('aria-checked') === 'true' || node.checked === true;

            if (await control.evaluate(isOn) === desired) {
                return;
            }

            await control.click();
            await page.waitForFunction(
                ([node, want]) => (node.getAttribute('aria-checked') === 'true' || node.checked === true) === want,
                [control, desired],
                { timeout: 5_000 },
            ).catch(() => {
                throw new Error(`Pre-action did not change the toggle: ${instruction}`);
            });
        } finally {
            await control.dispose();
        }
    } finally {
        await field.dispose();
    }
}

/**
 * Picks an option by its rendered text. Native selects are set directly; a
 * custom listbox is opened and its matching option clicked.
 */
async function selectFieldOption(page, label, option, instruction, selectors) {
    const field = await uniqueFieldHandle(page, label, instruction, selectors);

    try {
        const native = await field.evaluateHandle((element) => element.querySelector('select'));

        try {
            if (await native.evaluate((node) => node !== null)) {
                // Check before selecting: a missing option would otherwise cost a
                // full Playwright timeout to discover.
                const exists = await native.evaluate(
                    (node, label) => [...node.options].some((candidate) => candidate.label === label || candidate.text.trim() === label),
                    option,
                );

                if (!exists) {
                    throw new Error(`Pre-action found no option named ${option}: ${instruction}`);
                }

                await native.selectOption({ label: option });
                await native.evaluate((node) => node.dispatchEvent(new Event('change', { bubbles: true })));

                return;
            }
        } finally {
            await native.dispose();
        }

        const trigger = await field.evaluateHandle((element) => element.querySelector('[role="combobox"], button, input'));

        try {
            if (!await trigger.evaluate((node) => node !== null)) {
                throw new Error(`Pre-action found no select control in that field: ${instruction}`);
            }

            await trigger.click();
        } finally {
            await trigger.dispose();
        }

        await page.waitForTimeout(300);
        await clickVisible(page.getByRole('option', { name: option, exact: true })
            .or(page.locator('[role="listbox"] li, [role="listbox"] div').filter({ hasText: option })), instruction);
    } finally {
        await field.dispose();
    }
}

/**
 * Expands a collapsible section via the standard disclosure pattern: something
 * inside it carries `aria-expanded`. A section without that attribute is not
 * collapsible, which is a success, not a failure.
 */
async function expandMainSection(page, label, instruction, selectors) {
    const sections = await matchTargets(page, 'section', label, selectors);

    if (sections.length !== 1) {
        throw new Error(`Pre-action matched ${sections.length} visible main sections: ${instruction}`);
    }

    const section = await sections[0].elementHandle();

    try {
        const state = await section.evaluate((element) => {
            const marker = element.querySelector('[aria-expanded]');

            if (marker === null) {
                return 'static';
            }

            return marker.getAttribute('aria-expanded') === 'true' ? 'expanded' : 'collapsed';
        });

        if (state !== 'collapsed') {
            return;
        }

        const toggle = await section.evaluateHandle((element, headerSelector) => {
            const marker = element.querySelector('[aria-expanded]');

            if (marker.tagName === 'BUTTON' || marker.getAttribute('role') === 'button') {
                return marker;
            }

            // Not every collapsible puts aria-expanded on the clickable element;
            // a header that toggles its own panel is common enough to handle here.
            return (headerSelector === '' ? null : element.querySelector(headerSelector))
                ?? element.querySelector('button, summary, [role="button"], header')
                ?? marker;
        }, selectors.sectionHeader ?? '');

        try {
            await toggle.click();
            await page.waitForFunction(
                (element) => element.querySelector('[aria-expanded]')?.getAttribute('aria-expanded') === 'true',
                section,
                { timeout: 5_000 },
            ).catch(() => {
                throw new Error(`Pre-action did not expand a collapsible main section: ${instruction}`);
            });
        } finally {
            await toggle.dispose();
        }
    } finally {
        await section.dispose();
    }
}

async function clickVisible(locator, instruction, { unique = true } = {}) {
    const visible = await visibleLocators(locator);

    if (unique ? visible.length !== 1 : visible.length === 0) {
        throw new Error(`Pre-action matched ${visible.length} visible elements: ${instruction}`);
    }

    await visible[0].click();
}

export async function installAnnotator(page, annotatorSource) {
    await page.evaluate(annotatorSource);
}

export async function annotateShot(page, annotations, configuredTargets, config = {}) {
    const { selectors = {} } = config;
    const results = [];

    for (const [index, text] of annotations.entries()) {
        const target = await resolveAnnotationTarget(page, configuredTargets[index] ?? null, text, selectors);

        try {
            const result = await target.handle.evaluate((element, annotationText) => {
                const rect = element.getBoundingClientRect();

                if (rect.width < 8 || rect.height < 8) {
                    return { ok: false, reason: 'target is too small', targetRect: rect.toJSON() };
                }

                if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
                    return { ok: false, reason: 'target is outside the viewport', targetRect: rect.toJSON() };
                }

                const annotated = window.__ann(element, annotationText);

                return { ...annotated, targetRect: rect.toJSON() };
            }, text);

            results.push({ text, target: target.description, ...result });
        } finally {
            await target.handle.dispose();
        }
    }

    return results;
}

async function resolveAnnotationTarget(page, configuredTarget, annotation, selectors) {
    if (configuredTarget !== null) {
        return resolveTargetExpression(page, configuredTarget, selectors);
    }

    const candidates = [
        ...extractQuoted(annotation).reverse(),
        annotation.split(/[：:→=（(]/u)[0].trim(),
    ].filter((candidate, index, all) => candidate !== '' && all.indexOf(candidate) === index);

    for (const candidate of candidates) {
        const locator = page.getByText(candidate, { exact: true });
        const visible = await visibleLocators(locator);

        if (visible.length === 1) {
            return {
                handle: await enclosingConceptualElement(visible[0]),
                description: `inferred-text:${candidate}`,
            };
        }
    }

    const headings = [selectors.sectionHeading, selectors.sectionHeader].filter(Boolean).map((selector) => selector.replace(/^:scope > /u, ''));
    const labelCandidates = page
        .locator(['label', 'button', 'th', 'legend', '[role="tab"]', 'h1, h2, h3, h4, h5, h6', ...headings].join(', '))
        .filter({ visible: true });
    const renderedLabels = (await labelCandidates.evaluateAll((elements, text) => elements.flatMap((element, index) => {
        const label = element.innerText.replace(/\s*\*\s*$/u, '').trim();

        return label.length >= 2 && text.includes(label) ? [{ index, text: label }] : [];
    }), annotation)).map(({ index, text }) => ({ locator: labelCandidates.nth(index), text }));

    renderedLabels.sort((left, right) => right.text.length - left.text.length);
    if (renderedLabels.length > 0 && (renderedLabels.length === 1 || renderedLabels[0].text.length > renderedLabels[1].text.length)) {
        return {
            handle: await enclosingConceptualElement(renderedLabels[0].locator),
            description: `inferred-rendered-label:${renderedLabels[0].text}`,
        };
    }

    throw new Error(`Could not infer a unique annotation target for: ${annotation}`);
}

/**
 * Every target type resolves through a chain of strategies, portable ones first:
 * semantic HTML, then ARIA, then a project-supplied selector. The first strategy
 * that yields exactly one visible element wins. An admin with accessible markup
 * therefore needs no configuration at all; one built from bare divs configures
 * only the types that actually fail.
 *
 * @typedef {(page: import('playwright').Page, value: string, selectors: Record<string, string>) =>
 *   Promise<import('playwright').Locator[]>} Strategy
 */
const targetTypes = {
    field: { strategies: [fieldByLabelledControl, fieldByConfiguredWrapper], noun: 'field', configKey: 'field' },
    'field-group': { strategies: [fieldGroup], noun: 'field group' },
    fieldset: { strategies: [fieldsetByElement, fieldsetByConfiguredSelector], noun: 'fieldset', configKey: 'fieldset' },
    section: { strategies: [sectionByLandmark, sectionByConfiguredSelector], noun: 'section', configKey: 'section' },
    tablist: { strategies: [tablistByRole], noun: 'tab bar' },
    table: { strategies: [tableByElement, tableByConfiguredSelector], noun: 'table', standalone: true, configKey: 'table' },
    modal: { strategies: [modalByRole, modalByConfiguredSelector], noun: 'modal', standalone: true, configKey: 'modal' },
    'page-header': { strategies: [headerByLandmark, headerByConfiguredSelector], noun: 'page header', standalone: true, configKey: 'pageHeader' },
    row: { strategies: [rowByText], noun: 'row', allowMany: true },
    action: { strategies: [actionByRole], noun: 'action', conceptual: true },
    'table-column': { strategies: [columnByRole], noun: 'column header', conceptual: true },
    text: { strategies: [exactText], noun: 'element', conceptual: true },
    selector: { strategies: [rawSelector], noun: 'element', conceptual: true },
};

async function resolveTargetExpression(page, expression, selectors) {
    const separator = expression.indexOf(':');
    // `table` / `modal` / `page-header` name a unique element, so they take no
    // argument and are written bare — a trailing colon would be YAML for a map.
    const standalone = separator === -1 && targetTypes[expression]?.standalone === true;
    const type = standalone ? expression : (separator === -1 ? 'text' : expression.slice(0, separator));
    const value = standalone ? '' : (separator === -1 ? expression : expression.slice(separator + 1));
    const definition = targetTypes[type];

    if (definition === undefined) {
        throw new Error(`Unknown annotation target type: ${type}`);
    }

    let matches = [];

    for (const strategy of definition.strategies) {
        matches = await strategy(page, value, selectors);

        if (matches.length === 1 || (definition.allowMany && matches.length > 0)) {
            return {
                handle: definition.conceptual
                    ? await enclosingConceptualElement(matches[0], selectors)
                    : await matches[0].elementHandle(),
                description: expression,
            };
        }
    }

    const hint = definition.configKey !== undefined && selectors[definition.configKey] === undefined
        ? `. The portable strategy found nothing; if this admin's markup is not semantic, add selectors.${definition.configKey} to manual.config.json`
        : '';

    throw new Error(`Annotation target ${expression} matched ${matches.length} visible ${definition.noun}s${hint}`);
}

/**
 * The wrapper holding a label and its control together. Walks up from the label
 * until an ancestor also contains a form control, which is what "one field" means
 * in any markup — no framework class required.
 */
async function fieldByLabelledControl(page, value) {
    const labels = await visibleByLabel(page, 'label', null, value);

    return wrapLocators(labels, (label) => {
        const CONTROLS = 'input, select, textarea, button, [contenteditable], [role="switch"], [role="combobox"], [role="textbox"], [role="checkbox"], [role="radio"]';
        const explicit = label.htmlFor ? label.ownerDocument.getElementById(label.htmlFor) : null;
        const boundary = (node) => node === null || ['FORM', 'MAIN', 'BODY', 'HTML'].includes(node.tagName);

        if (explicit !== null) {
            let common = label;

            while (!boundary(common) && !common.contains(explicit)) {
                common = common.parentElement;
            }

            return boundary(common) ? null : (common === label ? label.parentElement : common);
        }

        if (label.querySelector(CONTROLS) !== null) {
            return label;
        }

        let node = label.parentElement;

        while (!boundary(node)) {
            if (node.querySelector(CONTROLS) !== null) {
                return node;
            }

            node = node.parentElement;
        }

        return null;
    });
}

async function fieldByConfiguredWrapper(page, value, selectors) {
    if (selectors.field === undefined) {
        return [];
    }

    const labels = await visibleByLabel(page, 'label', null, value);

    return wrapLocators(labels, (label, wrapperSelector) => label.closest(wrapperSelector), selectors.field);
}

async function fieldGroup(page, value, selectors) {
    const names = value.split('|').map((name) => name.trim()).filter(Boolean);

    if (names.length < 2) {
        throw new Error(`A field-group target needs at least two field labels: ${value}`);
    }

    const wrappers = [];

    for (const name of names) {
        const matches = await fieldByLabelledControl(page, name, selectors);
        const resolved = matches.length === 1 ? matches : await fieldByConfiguredWrapper(page, name, selectors);

        if (resolved.length !== 1) {
            throw new Error(`A field-group target matched ${resolved.length} visible fields for ${name}`);
        }

        wrappers.push(resolved[0]);
    }

    const handles = await Promise.all(wrappers.map((wrapper) => wrapper.elementHandle()));

    try {
        const common = await page.evaluateHandle((elements) => {
            let node = elements[0];

            while (node !== null && !elements.every((element) => node.contains(element))) {
                node = node.parentElement;
            }

            return node;
        }, handles);

        if (!await common.evaluate((node) => node !== null)) {
            await common.dispose();

            return [];
        }

        return [{ elementHandle: async () => common }];
    } finally {
        await Promise.all(handles.map((handle) => handle.dispose()));
    }
}

/**
 * Runs a target type's strategy chain for callers that need the matches rather
 * than a single annotation target — pre-actions and masking resolve the same
 * vocabulary, so they must not grow their own private selectors.
 */
async function matchTargets(page, type, value, selectors) {
    for (const strategy of targetTypes[type].strategies) {
        const matches = await strategy(page, value, selectors);

        if (matches.length > 0) {
            return matches;
        }
    }

    return [];
}

async function fieldsetByElement(page, value) {
    return visibleByLabel(page, 'fieldset', ':scope > legend', value);
}

async function fieldsetByConfiguredSelector(page, value, selectors) {
    return selectors.fieldset === undefined
        ? []
        : visibleByLabel(page, selectors.fieldset, ':scope > legend', value);
}

async function sectionByLandmark(page, value) {
    return visibleByLabel(page, 'section, article, [role="region"]', ':scope > :is(h1, h2, h3, h4, h5, h6, header), :scope > * > :is(h1, h2, h3, h4, h5, h6)', value);
}

async function sectionByConfiguredSelector(page, value, selectors) {
    return selectors.section === undefined
        ? []
        : visibleByLabel(page, selectors.section, selectors.sectionHeading ?? ':scope > header', value);
}

async function tablistByRole(page, value) {
    const tabs = await visibleLocators(page.getByRole('tab', { name: value, exact: true }));

    return wrapLocators(tabs, (tab) => tab.closest('[role="tablist"]'));
}

async function tableByElement(page, value) {
    return filterByOptionalText(page.locator('table, [role="table"]'), value);
}

async function tableByConfiguredSelector(page, value, selectors) {
    return selectors.table === undefined ? [] : filterByOptionalText(page.locator(selectors.table), value);
}

async function modalByRole(page, value) {
    return filterByOptionalText(page.locator('dialog[open], [role="dialog"], [role="alertdialog"]'), value);
}

async function modalByConfiguredSelector(page, value, selectors) {
    return selectors.modal === undefined ? [] : filterByOptionalText(page.locator(selectors.modal), value);
}

async function headerByLandmark(page, value) {
    return filterByOptionalText(page.locator('main header, [role="main"] header, header:not(nav header)'), value);
}

async function headerByConfiguredSelector(page, value, selectors) {
    return selectors.pageHeader === undefined ? [] : filterByOptionalText(page.locator(selectors.pageHeader), value);
}

async function rowByText(page, value) {
    return visibleLocators(page.locator('tbody tr, [role="row"]').filter({ hasText: value }));
}

async function actionByRole(page, value) {
    return visibleLocators(page.getByRole('button', { name: value, exact: true }).or(page.getByRole('link', { name: value, exact: true })));
}

async function columnByRole(page, value) {
    return visibleLocators(page.getByRole('columnheader', { name: value, exact: true }));
}

async function exactText(page, value) {
    return visibleLocators(page.getByText(value, { exact: true }));
}

async function rawSelector(page, value) {
    return visibleLocators(page.locator(value));
}

/** `table:` / `modal:` / `page-header:` take no name; an optional one disambiguates. */
async function filterByOptionalText(locator, value) {
    return visibleLocators(value.trim() === '' ? locator : locator.filter({ hasText: value }));
}

/**
 * Maps each locator through a DOM function, dropping the ones it resolves to null.
 * Used by strategies that must climb from a found element to its real container.
 */
async function wrapLocators(locators, resolve, argument = null) {
    const wrapped = [];

    for (const locator of locators) {
        const handle = await locator.evaluateHandle(resolve, argument);

        if (await handle.evaluate((node) => node !== null)) {
            wrapped.push({ elementHandle: async () => handle });
        } else {
            await handle.dispose();
        }
    }

    return wrapped;
}

/**
 * Visible elements whose rendered label matches `value` exactly.
 * `labelSelector` picks the text-bearing descendant and must match exactly one;
 * null reads the element's own text. Matching runs in one page call, not one per element.
 *
 * @return {Promise<import('playwright').Locator[]>}
 */
async function visibleByLabel(page, containerSelector, labelSelector, value) {
    const containers = page.locator(containerSelector).filter({ visible: true });
    const indexes = await containers.evaluateAll((elements, [selector, expected]) => elements.flatMap((element, index) => {
        const sources = selector === null ? [element] : [...element.querySelectorAll(selector)];

        if (sources.length === 0) {
            return [];
        }

        return sources.some((source) => source.innerText.replace(/\s*\*\s*$/u, '').trim() === expected) ? [index] : [];
    }), [labelSelector, value]);

    return indexes.map((index) => containers.nth(index));
}

async function enclosingConceptualElement(locator, selectors = {}) {
    const extra = [selectors.field, selectors.section].filter(Boolean).join(', ');

    return locator.evaluateHandle(
        (element, more) => element.closest(`button, a, th, [role="tab"], fieldset${more === '' ? '' : `, ${more}`}`) ?? element,
        extra,
    );
}

async function visibleLocators(locator) {
    return locator.filter({ visible: true }).all();
}

export async function maskSensitiveData(page, configuredMasks = [], autoMask = false, config = {}) {
    const { selectors = {}, piiLabels = [] } = config;
    if (configuredMasks.length === 0 && !autoMask) {
        return 0;
    }

    await page.evaluate(blurHelperSource);

    const expressions = configuredMasks.length > 0
        ? configuredMasks
        : piiLabels.map((label) => `field:${label}`);
    let masked = 0;

    for (const expression of expressions) {
        const [type, value] = expression.includes(':') ? expression.split(/:(.*)/s, 2) : ['field', expression];

        if (type === 'selector') {
            masked += await blurLocator(page.locator(value));
            continue;
        }

        if (type === 'table-column') {
            masked += await blurTableColumns(page, [value]);
            continue;
        }

        for (const field of await matchTargets(page, 'field', value, selectors)) {
            const handle = await field.elementHandle();

            try {
                // Blur the value, keep the label sharp — the label is what teaches the reader.
                masked += await handle.evaluate((element, valueSelector) => {
                    const explicit = valueSelector === '' ? null : element.querySelector(valueSelector);

                    if (explicit !== null) {
                        return window.__blur(explicit);
                    }

                    return [...element.children]
                        .filter((child) => child.tagName !== 'LABEL')
                        .reduce((count, child) => count + window.__blur(child), 0);
                }, selectors.fieldValue ?? '');
            } finally {
                await handle.dispose();
            }
        }
    }

    masked += await blurTableColumns(page, piiLabels);
    masked += await blurLocator(page.locator('tbody img'));

    return masked;
}

async function blurTableColumns(page, labels) {
    return page.locator('table').evaluateAll((tables, headerLabels) => {
        let count = 0;

        for (const table of tables) {
            const headers = [...table.querySelectorAll('thead th')];

            for (const headerLabel of headerLabels) {
                const index = headers.findIndex((header) => header.textContent.trim() === headerLabel);

                if (index === -1) {
                    continue;
                }

                for (const row of table.querySelectorAll('tbody tr')) {
                    count += window.__blur(row.querySelectorAll('td')[index]);
                }
            }
        }

        return count;
    }, labels);
}

async function blurLocator(locator) {
    return locator.evaluateAll((elements) => elements.reduce((count, element) => count + window.__blur(element), 0));
}

export async function loadBrowserHelpers() {
    const [normalizer, annotator] = await Promise.all([
        fs.readFile(new URL('../../references/state-normalizer.js', import.meta.url), 'utf8'),
        fs.readFile(new URL('../../references/annotator.js', import.meta.url), 'utf8'),
    ]);

    return { normalizer, annotator };
}

function extractQuoted(value) {
    return [...value.matchAll(/「([^」]+)」/gu)].map((match) => match[1].trim()).filter(Boolean);
}

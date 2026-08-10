import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const projectDir = path.resolve(skillDir, '../..');

export function parseArguments(argv) {
    const argumentsMap = new Map();

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (!argument.startsWith('--')) {
            throw new Error(`Unexpected argument: ${argument}`);
        }

        const [rawKey, inlineValue] = argument.slice(2).split('=', 2);
        const nextValue = argv[index + 1];

        if (inlineValue !== undefined) {
            argumentsMap.set(rawKey, inlineValue);
        } else if (nextValue !== undefined && !nextValue.startsWith('--')) {
            argumentsMap.set(rawKey, nextValue);
            index += 1;
        } else {
            argumentsMap.set(rawKey, true);
        }
    }

    return {
        boolean(name) {
            return argumentsMap.get(name) === true;
        },
        string(name, fallback = undefined) {
            const value = argumentsMap.get(name);

            return typeof value === 'string' ? value : fallback;
        },
    };
}

export function resolveProjectPath(value, fallback) {
    return path.resolve(projectDir, value ?? fallback);
}

export function toPosixPath(value) {
    return value.split(path.sep).join('/');
}

/** Reads a JSON file that legitimately may not exist yet, e.g. a previous run's results. */
export async function readJsonIfExists(file) {
    try {
        return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }

        throw error;
    }
}

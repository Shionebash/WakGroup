'use client';

import {
    BUILDER_ELEMENTAL_MASTERY_ACTION_IDS,
    BUILDER_SUBLIMATION_WIDE_DOMINIO_ACTION_IDS,
} from '@/lib/builder-stats';

export type BuilderStatValueMap = Map<number, number>;

export interface SublimationRawEffect {
    actionId: number;
    value: number;
    text?: Record<string, string | undefined>;
    label: Record<string, string | undefined>;
    stateId?: number;
    stackLevel?: number;
    maxStackLevel?: number;
    valuePerStackLevel?: number;
    maxValue?: number;
    unit?: '%' | '';
    percentOfBuildLevel?: number;
    applyToAllMasteries?: boolean;
}

export interface SublimationEntryLike {
    id: number;
    title: Record<string, string | undefined>;
    description?: Record<string, string | undefined>;
    effects: SublimationRawEffect[];
}

export interface SublimationResolverContext {
    buildLevel: number;
    baseStats: BuilderStatValueMap;
}

export interface SublimationResolvedStat {
    actionId: number;
    label: string;
    value: number;
}

export interface SublimationControlDefinition {
    key: string;
    label: string;
    kind: 'toggle' | 'count';
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
}

export interface SublimationStackInfo {
    familyKey: string;
    familyLabel: string;
    level?: number;
    maxLevel?: number;
}

interface SublimationParsedModifier {
    key: string;
    sourceText: string;
    actionId?: number;
    label: string;
    mode:
        | 'add'
        | 'buildLevelPercent'
        | 'allMasteriesBuildLevelPercent'
        | 'transfer'
        | 'zeroOut'
        | 'currentHpPercentToArmor'
        | 'maxHpPercentToArmor'
        | 'missingHpPercentToArmor'
        | 'missingHpPercentToHeal'
        | 'maxHpPercentToHeal'
        | 'currentHpPercentToHeal';
    value?: number;
    ratio?: number;
    maxAppliedValue?: number;
    sourceActionIds?: number[];
    targetActionIds?: number[];
    control?: SublimationControlDefinition;
}

const ACTION_ID_LABELS: Partial<Record<number, string>> = {
    26: 'Dominio cura',
    120: 'Dominio elemental',
    122: 'Dominio fuego',
    123: 'Dominio tierra',
    124: 'Dominio agua',
    125: 'Dominio aire',
    149: 'Dominio critico',
    150: '% Golpe critico',
    177: 'Voluntad',
    180: 'Dominio espalda',
    875: '% Anticipacion',
    988: 'Resistencia critica',
    1052: 'Dominio melee',
    1053: 'Dominio distancia',
    1055: 'Dominio berserker',
    1095: '% Curas realizadas',
    45897: 'Armadura',
    900001: '% Danos indirectos',
    900002: '% Danos directos',
};

const STAT_ALIASES = new Map<string, { actionId: number; label: string }>([
    ['pa', { actionId: 31, label: 'PA' }],
    ['pm', { actionId: 41, label: 'PM' }],
    ['pw', { actionId: 191, label: 'PW' }],
    ['alcance', { actionId: 160, label: 'Alcance' }],
    ['voluntad', { actionId: 177, label: 'Voluntad' }],
    ['resistencia elemental', { actionId: 80, label: 'Resistencia elemental' }],
    ['resistencia critica', { actionId: 988, label: 'Resistencia critica' }],
    ['resistencia por la espalda', { actionId: 71, label: 'Resistencia espalda' }],
    ['placaje', { actionId: 173, label: 'Placaje' }],
    ['esquiva', { actionId: 175, label: 'Esquiva' }],
    ['dominio elemental', { actionId: 120, label: 'Dominio elemental' }],
    ['dominio critico', { actionId: 149, label: 'Dominio critico' }],
    ['golpe critico', { actionId: 150, label: '% Golpe critico' }],
    ['anticipacion', { actionId: 875, label: '% Anticipacion' }],
    ['danos infligidos', { actionId: 126, label: '% Danos infligidos' }],
    ['curas realizadas', { actionId: 1095, label: '% Curas realizadas' }],
    ['armadura dada', { actionId: 40, label: '% Armadura dada' }],
    ['armadura recibida', { actionId: 39, label: '% Armadura recibida' }],
    ['danos indirectos', { actionId: 900001, label: '% Danos indirectos' }],
    ['danos directos', { actionId: 900002, label: '% Danos directos' }],
    ['armadura', { actionId: 45897, label: 'Armadura' }],
    ['vida', { actionId: 20, label: 'PdV' }],
    ['pdv', { actionId: 20, label: 'PdV' }],
    ['puntos de vida', { actionId: 20, label: 'PdV' }],
]);

const CONDITION_HINT_RE =
    /\b(al comienzo|al principio|al final|al inicio|en el lanzamiento|al lanzar|si |cuando |tras |despues |después |mientras |fuera del turno|turno par|turno impar|por enemigo|por entidad|por pw|por pm|por cada|cada turno|si no)\b/i;

function stripDiacritics(value: string) {
    return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function evaluateInlineMath(text: string) {
    return text.replace(/\|(-?\d+(?:\.\d+)?)\s*\*\s*(-?\d+(?:\.\d+)?)\|/g, (_, left, right) => {
        const product = Number(left) * Number(right);
        return Number.isFinite(product) ? String(product) : '0';
    });
}

function preprocessEffectText(value: string) {
    return evaluateInlineMath(value)
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\\n/g, ' · ')
        .replace(/\r?\n/g, ' · ')
        .replace(/Â·/g, '·')
        .replace(/--/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\s*·\s*/g, ' · ')
        .trim();
}

function toText(value: Record<string, string | undefined> | undefined) {
    return preprocessEffectText(value?.es || value?.en || '');
}

function capitalize(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getLocaleTextValue(value?: Record<string, string | undefined>) {
    return value?.es || value?.en || value?.fr || value?.pt || '';
}

function normalizeSublimationFamilyKey(value: string) {
    return stripDiacritics(value.toLowerCase()).replace(/\s+/g, ' ').trim();
}

function parseRomanNumeral(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!/^[IVXLCDM]+$/.test(normalized)) return undefined;
    const values: Record<string, number> = {
        I: 1,
        V: 5,
        X: 10,
        L: 50,
        C: 100,
        D: 500,
        M: 1000,
    };
    let total = 0;
    let previous = 0;
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const current = values[normalized[index]];
        if (!current) return undefined;
        if (current < previous) total -= current;
        else {
            total += current;
            previous = current;
        }
    }
    return total > 0 ? total : undefined;
}

function parseSublimationTitleLevel(title: string) {
    const trimmed = title.trim();
    const match = trimmed.match(/^(.*?)(?:\s+)(\d+|[IVXLCDM]+)$/i);
    if (!match) {
        return {
            familyLabel: trimmed,
            level: undefined,
        };
    }
    const levelToken = match[2];
    const parsedLevel = /^\d+$/.test(levelToken)
        ? Number(levelToken)
        : parseRomanNumeral(levelToken);
    return {
        familyLabel: match[1].trim() || trimmed,
        level: Number.isFinite(parsedLevel) && Number(parsedLevel) > 0 ? Number(parsedLevel) : undefined,
    };
}

function parseSublimationMaxLevel(description: string) {
    const normalized = stripDiacritics(description.toLowerCase());
    const patterns = [
        /acumular(?:se)?\s+hasta\s+un\s+nivel\s+de\s+(\d+)/i,
        /accumulate(?:d)?\s+up\s+to\s+(?:a\s+)?level\s+of\s+(\d+)/i,
        /accumul(?:able|e)\s+jusqu[\' ]?a\s+un\s+niveau\s+de\s+(\d+)/i,
        /acumular\s+ate\s+um\s+nivel\s+de\s+(\d+)/i,
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (!match) continue;
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return undefined;
}

export function getSublimationStackInfo(entry: SublimationEntryLike): SublimationStackInfo {
    const title = getLocaleTextValue(entry.title).trim();
    const description = getLocaleTextValue(entry.description).trim();
    const { familyLabel, level: titleLevel } = parseSublimationTitleLevel(title || `Sublimacion ${entry.id}`);
    const maxLevel = parseSublimationMaxLevel(description);
    return {
        familyKey: normalizeSublimationFamilyKey(familyLabel || title || `sublimacion-${entry.id}`),
        familyLabel: familyLabel || title || `Sublimacion ${entry.id}`,
        level: titleLevel ?? (maxLevel != null ? 1 : undefined),
        maxLevel,
    };
}

function normalizeStatAlias(value: string) {
    return stripDiacritics(value.toLowerCase())
        .replace(/%/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\bmax\.?\b/g, '')
        .replace(/\bpuntos de\b/g, '')
        .replace(/\bde los\b/g, '')
        .replace(/\bde las\b/g, '')
        .replace(/\bdel\b/g, '')
        .replace(/\bde\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function stableSyntheticActionId(label: string) {
    let hash = 0;
    for (let index = 0; index < label.length; index += 1) {
        hash = ((hash << 5) - hash) + label.charCodeAt(index);
        hash |= 0;
    }
    return 950000 + Math.abs(hash % 49999);
}

function resolveActionFromLabel(label: string) {
    const cleaned = capitalize(label.replace(/\s+/g, ' ').trim().replace(/[.:]$/, ''));
    const alias = STAT_ALIASES.get(normalizeStatAlias(cleaned));
    if (alias) return alias;
    return {
        actionId: stableSyntheticActionId(cleaned),
        label: cleaned,
    };
}

function getActionLabel(actionId: number, fallback: string) {
    return ACTION_ID_LABELS[actionId] || fallback || `Stat ${actionId}`;
}

function parseMaxAppliedValue(normalized: string, fallback?: number) {
    const valuePatterns = [
        /max\.?\s*(-?\d+(?:\.\d+)?)/i,
        /maximo:?\s*(-?\d+(?:\.\d+)?)/i,
        /maximum:?\s*(-?\d+(?:\.\d+)?)/i,
        /nivel maximo:?\s*(-?\d+(?:\.\d+)?)/i,
        /acumulable hasta\s*(-?\d+(?:\.\d+)?)/i,
        /(-?\d+(?:\.\d+)?)\s*%?\s*max\.?/i,
        /(-?\d+(?:\.\d+)?)\s*%?\s*maximo/i,
    ];
    for (const pattern of valuePatterns) {
        const match = normalized.match(pattern);
        if (!match) continue;
        const parsed = Math.abs(Number(match[1]));
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return fallback && Number.isFinite(fallback) ? Math.abs(fallback) : undefined;
}

function parseApplicationLimit(normalized: string) {
    const applicationPatterns = [
        /(\d+)\s*activaciones?\s+por\s+turno/i,
        /(\d+)\s*vez\/veces\s+por\s+turno/i,
        /(\d+)\s*max\.?\s+por\s+turno/i,
        /max\.?\s*(\d+)\s*\/\s*turno/i,
        /(\d+)\s*vez(?:es)?\s+por\s+combate/i,
        /(\d+)\s*max\.?\s+por\s+combate/i,
    ];
    for (const pattern of applicationPatterns) {
        const match = normalized.match(pattern);
        if (!match) continue;
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return undefined;
}

function buildControlFromText(text: string, value: number | undefined, maxValue?: number): SublimationControlDefinition | undefined {
    const normalized = stripDiacritics(text.toLowerCase());
    if (!CONDITION_HINT_RE.test(normalized)) return undefined;

    const explicitMaxValue = parseMaxAppliedValue(normalized, maxValue);
    const applicationLimit = parseApplicationLimit(normalized);

    if (/\bpor enemigo\b|\bpor entidad\b|\bpor condicion cumplida\b|\bpor pw actual\b|\bpor pw gastado\b|\bpor pm utilizado\b|\bpor cada\b|\bcada turno\b|\bpor turno\b/i.test(normalized)) {
        const step = Math.abs(Number(value || 1)) || 1;
        const cappedByValue =
            explicitMaxValue && step > 0
                ? Math.max(1, Math.floor(explicitMaxValue / step))
                : undefined;
        const cappedMax = [cappedByValue, applicationLimit]
            .filter((entry): entry is number => Number.isFinite(entry))
            .reduce<number | undefined>((current, entry) => current == null ? entry : Math.min(current, entry), undefined)
            ?? 10;
        return {
            key: `count:${text}`,
            label: 'Activaciones',
            kind: 'count',
            min: 0,
            max: cappedMax,
            step: 1,
            defaultValue: 0,
        };
    }

    return {
        key: `toggle:${text}`,
        label: text,
        kind: 'toggle',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
    };
}

function looksLikeStatPhrase(value: string) {
    return /\d/.test(value) && (
        /%/.test(value)
        || /\b(pa|pm|pw|alcance|voluntad|resistencia|placaje|esquiva|dominio|golpe critico|anticipacion|curas|danos|armadura|pdv|vida)\b/i.test(stripDiacritics(value.toLowerCase()))
    );
}

function isCapOnlySegment(value: string) {
    const normalized = stripDiacritics(value.toLowerCase());
    return /\b(acumulable|max\.?|maximo|maximum|nivel maximo|activaciones?\s+por\s+turno|vez(?:es)?\s+por\s+turno|vez(?:es)?\s+por\s+combate)\b/i.test(normalized)
        && !looksLikeStatPhrase(value);
}

function splitSegments(text: string): Array<{ condition?: string; segment: string }> {
    const parts = text.split('·').map((entry) => entry.trim()).filter(Boolean);
    const result: Array<{ condition?: string; segment: string }> = [];
    let currentCondition: string | undefined;

    for (const part of parts) {
        const colonIndex = part.indexOf(':');
        if (colonIndex > 0) {
            const prefix = part.slice(0, colonIndex).trim();
            const rest = part.slice(colonIndex + 1).trim();
            if (CONDITION_HINT_RE.test(stripDiacritics(prefix.toLowerCase()))) {
                if (rest && looksLikeStatPhrase(rest)) {
                    result.push({ condition: prefix, segment: rest });
                    currentCondition = undefined;
                    continue;
                }
                currentCondition = prefix;
                if (rest) result.push({ condition: prefix, segment: rest });
                continue;
            }
        }

        if (CONDITION_HINT_RE.test(stripDiacritics(part.toLowerCase())) && !looksLikeStatPhrase(part)) {
            currentCondition = part;
            continue;
        }

        if (/si no, /i.test(part)) {
            const [positive, negative] = part.split(/si no,\s*/i);
            if (positive?.trim()) result.push({ condition: currentCondition, segment: positive.trim() });
            if (negative?.trim()) result.push({ condition: 'Si no', segment: negative.trim() });
            continue;
        }

        if (result.length > 0 && isCapOnlySegment(part)) {
            result[result.length - 1].segment = `${result[result.length - 1].segment} ${part}`.trim();
            continue;
        }

        result.push({ condition: currentCondition, segment: part });
    }

    return result;
}

function createModifierKey(prefix: string, condition: string | undefined, segment: string, index: number) {
    return `${prefix}:${condition || 'none'}:${segment}:${index}`;
}

function pushFlatValueModifiers(
    output: SublimationParsedModifier[],
    prefix: string,
    condition: string | undefined,
    text: string,
    statLabel: string,
    value: number,
    indexOffset: number,
) {
    const resolved = resolveActionFromLabel(statLabel);
    output.push({
        key: createModifierKey(prefix, condition, `${statLabel}:${indexOffset}`, indexOffset),
        sourceText: text,
        actionId: resolved.actionId,
        label: resolved.label,
        mode: 'add',
        value,
        maxAppliedValue: parseMaxAppliedValue(stripDiacritics(text.toLowerCase())),
        control: buildControlFromText(condition ? `${condition}: ${text}` : text, value),
    });
}

function parseSegmentToModifiers(
    prefix: string,
    condition: string | undefined,
    segment: string,
): SublimationParsedModifier[] {
    const text = segment.trim().replace(/[.]$/, '');
    const normalized = stripDiacritics(text.toLowerCase());
    const modifiers: SublimationParsedModifier[] = [];

    if (!text) return modifiers;

    const transferCritToElemental = normalized.match(/convierte el (-?\d+(?:\.\d+)?)% del dominio critico en dominio elemental/);
    if (transferCritToElemental) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 0),
            sourceText: text,
            label: 'Dominio critico -> dominio elemental',
            mode: 'transfer',
            ratio: Number(transferCritToElemental[1]) / 100,
            sourceActionIds: [149],
            targetActionIds: [120],
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(transferCritToElemental[1])),
        });
        return modifiers;
    }

    if (/la anticipacion se convierte en golpe critico/i.test(normalized)) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 0),
            sourceText: text,
            label: 'Anticipacion -> golpe critico',
            mode: 'transfer',
            ratio: 1,
            sourceActionIds: [875],
            targetActionIds: [150],
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, 1),
        });
        return modifiers;
    }

    const dodgeToArmor = normalized.match(/toda la esquiva .* se convierte en armadura(?: con una razon de 1:(\d+))?/);
    if (dodgeToArmor) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 0),
            sourceText: text,
            label: 'Esquiva -> armadura',
            mode: 'transfer',
            ratio: Number(dodgeToArmor[1] || 1),
            sourceActionIds: [175],
            targetActionIds: [45897],
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, 1),
        });
        return modifiers;
    }

    if (/reduce el dominio cura a 0/i.test(normalized)) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 0),
            sourceText: text,
            label: 'Dominio cura',
            mode: 'zeroOut',
            sourceActionIds: [26],
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, 1),
        });
    }

    if (/alcance positivo esta fijado a 0/i.test(normalized)) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 1),
            sourceText: text,
            label: 'Alcance',
            mode: 'zeroOut',
            sourceActionIds: [160],
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, 1),
        });
    }

    if (/dominios elementales se fijan en 0/i.test(normalized)) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 2),
            sourceText: text,
            label: 'Dominios elementales',
            mode: 'zeroOut',
            sourceActionIds: [...BUILDER_ELEMENTAL_MASTERY_ACTION_IDS],
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, 1),
        });
    }

    const currentHpArmor = normalized.match(/convierte el (-?\d+(?:\.\d+)?)% de los pdv actuales en armadura/);
    if (currentHpArmor) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 3),
            sourceText: text,
            label: 'Armadura',
            mode: 'currentHpPercentToArmor',
            value: Number(currentHpArmor[1]),
            actionId: 45897,
            control: {
                key: `hp-current:${prefix}:${text}`,
                label: '% PdV actuales',
                kind: 'count',
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 0,
            },
        });
        return modifiers;
    }

    const maxHpArmor = normalized.match(/(-?\d+(?:\.\d+)?)% de los pdv (?:max|maximos|max\.?) en armadura/);
    if (maxHpArmor) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 4),
            sourceText: text,
            label: 'Armadura',
            mode: 'maxHpPercentToArmor',
            value: Number(maxHpArmor[1]),
            actionId: 45897,
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(maxHpArmor[1])),
        });
        return modifiers;
    }

    const missingHpArmor = normalized.match(/(-?\d+(?:\.\d+)?)% de los pdv faltantes en armadura/);
    if (missingHpArmor) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 5),
            sourceText: text,
            label: 'Armadura',
            mode: 'missingHpPercentToArmor',
            value: Number(missingHpArmor[1]),
            actionId: 45897,
            control: {
                key: `hp-missing-armor:${prefix}:${text}`,
                label: '% PdV faltantes',
                kind: 'count',
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 0,
            },
        });
        return modifiers;
    }

    const missingHpHeal = normalized.match(/cura\w*:? (-?\d+(?:\.\d+)?)% de los pdv faltantes/);
    if (missingHpHeal) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 6),
            sourceText: text,
            label: 'Cura sobre PdV faltantes',
            mode: 'missingHpPercentToHeal',
            value: Number(missingHpHeal[1]),
            actionId: stableSyntheticActionId('Cura sobre PdV faltantes'),
            control: {
                key: `hp-missing-heal:${prefix}:${text}`,
                label: '% PdV faltantes',
                kind: 'count',
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 0,
            },
        });
        return modifiers;
    }

    const maxHpHeal = normalized.match(/cura\w*:? (-?\d+(?:\.\d+)?)% de los pdv (?:max|maximos|max\.?)/);
    if (maxHpHeal) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 7),
            sourceText: text,
            label: 'Cura sobre PdV maximos',
            mode: 'maxHpPercentToHeal',
            value: Number(maxHpHeal[1]),
            actionId: stableSyntheticActionId('Cura sobre PdV maximos'),
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(maxHpHeal[1])),
        });
        return modifiers;
    }

    const buildLevelPair = normalized.match(/(-?\d+(?:\.\d+)?)% del nivel en ([a-z ]+?) y ([a-z ]+)$/);
    if (buildLevelPair) {
        pushFlatValueModifiers(modifiers, prefix, condition, text, buildLevelPair[2], Number(buildLevelPair[1]), 10);
        pushFlatValueModifiers(modifiers, prefix, condition, text, buildLevelPair[3], Number(buildLevelPair[1]), 11);
        modifiers.forEach((entry) => { entry.mode = 'buildLevelPercent'; });
        return modifiers;
    }

    const buildLevelSingle = normalized.match(/(-?\d+(?:\.\d+)?)% del nivel en ([a-z ]+)/);
    if (buildLevelSingle) {
        const statLabel = buildLevelSingle[2].trim();
        if (statLabel.includes('todos los dominios')) {
            modifiers.push({
                key: createModifierKey(prefix, condition, text, 12),
                sourceText: text,
                label: 'Todos los dominios',
                mode: 'allMasteriesBuildLevelPercent',
                value: Number(buildLevelSingle[1]),
                maxAppliedValue: parseMaxAppliedValue(normalized),
                control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(buildLevelSingle[1])),
            });
            return modifiers;
        }

        const resolved = resolveActionFromLabel(statLabel);
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 13),
            sourceText: text,
            actionId: resolved.actionId,
            label: resolved.label,
            mode: 'buildLevelPercent',
            value: Number(buildLevelSingle[1]),
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(buildLevelSingle[1])),
        });
        return modifiers;
    }

    const percentPair = normalized.match(/^(-?\d+(?:\.\d+)?)% ([a-z ]+?) y ([a-z ]+)$/);
    if (percentPair) {
        pushFlatValueModifiers(modifiers, prefix, condition, text, percentPair[2], Number(percentPair[1]), 20);
        pushFlatValueModifiers(modifiers, prefix, condition, text, percentPair[3], Number(percentPair[1]), 21);
        return modifiers;
    }

    const percentTripleShared = normalized.match(/^(-?\d+(?:\.\d+)?)% de ([a-z ]+?) y ([a-z ]+)$/);
    if (percentTripleShared) {
        pushFlatValueModifiers(modifiers, prefix, condition, text, percentTripleShared[2], Number(percentTripleShared[1]), 22);
        pushFlatValueModifiers(modifiers, prefix, condition, text, percentTripleShared[3], Number(percentTripleShared[1]), 23);
        return modifiers;
    }

    const percentPoints = normalized.match(/^(-?\d+(?:\.\d+)?)% puntos? de vida/);
    if (percentPoints) {
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 24),
            sourceText: text,
            actionId: 986,
            label: '% PdV',
            mode: 'add',
            value: Number(percentPoints[1]),
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, Number(percentPoints[1])),
        });
        return modifiers;
    }

    const simplePercent = normalized.match(/^(-?\d+(?:\.\d+)?)% (.+)$/);
    if (simplePercent) {
        const value = Number(simplePercent[1]);
        const remainder = capitalize(simplePercent[2].trim());
        const resolved = resolveActionFromLabel(remainder);
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 25),
            sourceText: text,
            actionId: resolved.actionId,
            label: resolved.label,
            mode: 'add',
            value,
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, value),
        });
        return modifiers;
    }

    const simpleFlat = normalized.match(/^(-?\d+(?:\.\d+)?) ([a-z ]+)$/);
    if (simpleFlat) {
        const value = Number(simpleFlat[1]);
        const remainder = capitalize(simpleFlat[2].trim());
        const resolved = resolveActionFromLabel(remainder);
        modifiers.push({
            key: createModifierKey(prefix, condition, text, 26),
            sourceText: text,
            actionId: resolved.actionId,
            label: resolved.label,
            mode: 'add',
            value,
            maxAppliedValue: parseMaxAppliedValue(normalized),
            control: buildControlFromText(condition ? `${condition}: ${text}` : text, value),
        });
        return modifiers;
    }

    return modifiers;
}

function parseRawEffect(
    entryId: number,
    effect: SublimationRawEffect,
    effectIndex: number,
): SublimationParsedModifier[] {
    const text = toText(effect.text) || toText(effect.label);
    const modifiers: SublimationParsedModifier[] = [];

    if (effect.stateId && effect.valuePerStackLevel) {
        const label = toText(effect.label) || text || `Estado ${effect.stateId}`;
        modifiers.push({
            key: `${entryId}:state:${effect.stateId}:${effectIndex}`,
            sourceText: text || label,
            actionId: effect.actionId || resolveActionFromLabel(label).actionId,
            label: effect.actionId ? label : resolveActionFromLabel(label).label,
            mode: 'add',
            value: Number(effect.valuePerStackLevel),
            maxAppliedValue: effect.maxValue,
            control: {
                key: `stack:${entryId}:${effect.stateId}:${effectIndex}`,
                label: label,
                kind: 'count',
                min: 0,
                max: effect.maxStackLevel || 10,
                step: effect.stackLevel || 1,
                defaultValue: 0,
            },
        });
        return modifiers;
    }

    if (text) {
        const segments = splitSegments(text);
        segments.forEach(({ condition, segment }, segmentIndex) => {
            modifiers.push(...parseSegmentToModifiers(`${entryId}:${effectIndex}:${segmentIndex}`, condition, segment));
        });
    }

    if (modifiers.length > 0) return modifiers;

    if (effect.applyToAllMasteries && effect.percentOfBuildLevel != null) {
        modifiers.push({
            key: `${entryId}:all-masteries:${effectIndex}`,
            sourceText: text || 'Todos los dominios',
            label: 'Todos los dominios',
            mode: 'allMasteriesBuildLevelPercent',
            value: Number(effect.percentOfBuildLevel),
            maxAppliedValue: effect.maxValue,
            control: buildControlFromText(text || 'Todos los dominios', Number(effect.percentOfBuildLevel)),
        });
        return modifiers;
    }

    if (effect.percentOfBuildLevel != null && effect.actionId) {
        modifiers.push({
            key: `${entryId}:lvl-percent:${effectIndex}`,
            sourceText: text || toText(effect.label),
            actionId: effect.actionId,
            label: toText(effect.label) || `Stat ${effect.actionId}`,
            mode: 'buildLevelPercent',
            value: Number(effect.percentOfBuildLevel),
            maxAppliedValue: effect.maxValue,
            control: buildControlFromText(text || toText(effect.label), Number(effect.percentOfBuildLevel)),
        });
        return modifiers;
    }

    if (effect.actionId && Number.isFinite(effect.value) && effect.value !== 0) {
        modifiers.push({
            key: `${entryId}:direct:${effectIndex}`,
            sourceText: text || toText(effect.label),
            actionId: effect.actionId,
            label: toText(effect.label) || `Stat ${effect.actionId}`,
            mode: 'add',
            value: Number(effect.value),
            maxAppliedValue: effect.maxValue,
            control: buildControlFromText(text || toText(effect.label), Number(effect.value), effect.maxValue),
        });
    }

    return modifiers;
}

export function getSublimationControls(entry: SublimationEntryLike) {
    const map = new Map<string, SublimationControlDefinition>();
    entry.effects.forEach((effect, index) => {
        const modifiers = parseRawEffect(entry.id, effect, index);
        modifiers.forEach((modifier) => {
            if (!modifier.control) return;
            map.set(modifier.control.key, modifier.control);
        });
    });
    return Array.from(map.values());
}

function readStatValue(stats: BuilderStatValueMap, actionIds: readonly number[]) {
    return actionIds.reduce((sum, actionId) => sum + (stats.get(actionId) || 0), 0);
}

function applyModifier(
    modifier: SublimationParsedModifier,
    activeValue: number,
    stats: BuilderStatValueMap,
    context: SublimationResolverContext,
): SublimationResolvedStat[] {
    const clampedActiveValue = modifier.control
        ? Math.max(modifier.control.min ?? 0, Math.min(modifier.control.max ?? Number.POSITIVE_INFINITY, activeValue))
        : activeValue;
    if (clampedActiveValue <= 0) return [];

    switch (modifier.mode) {
        case 'add': {
            if (!modifier.actionId) return [];
            let resolved = (modifier.value || 0) * clampedActiveValue;
            if (modifier.maxAppliedValue != null) {
                const cap = Math.abs(modifier.maxAppliedValue);
                resolved = Math.sign(resolved || modifier.value || 1) * Math.min(Math.abs(resolved), cap);
            }
            return resolved ? [{ actionId: modifier.actionId, label: modifier.label, value: resolved }] : [];
        }
        case 'buildLevelPercent': {
            if (!modifier.actionId) return [];
            let resolved = Math.round(context.buildLevel * ((modifier.value || 0) / 100) * clampedActiveValue);
            if (modifier.maxAppliedValue != null) {
                const cap = Math.abs(modifier.maxAppliedValue);
                resolved = Math.sign(resolved || modifier.value || 1) * Math.min(Math.abs(resolved), cap);
            }
            return resolved ? [{ actionId: modifier.actionId, label: modifier.label, value: resolved }] : [];
        }
        case 'allMasteriesBuildLevelPercent': {
            let resolved = Math.round(context.buildLevel * ((modifier.value || 0) / 100) * clampedActiveValue);
            if (modifier.maxAppliedValue != null) {
                const cap = Math.abs(modifier.maxAppliedValue);
                resolved = Math.sign(resolved || modifier.value || 1) * Math.min(Math.abs(resolved), cap);
            }
            return resolved
                ? BUILDER_SUBLIMATION_WIDE_DOMINIO_ACTION_IDS.map((actionId) => ({
                    actionId,
                    label: getActionLabel(actionId, modifier.label),
                    value: resolved,
                }))
                : [];
        }
        case 'transfer': {
            const sourceValue = readStatValue(stats, modifier.sourceActionIds || []);
            if (!sourceValue) return [];
            const ratio = modifier.ratio || 1;
            let moved = Math.round(sourceValue * ratio * clampedActiveValue);
            if (modifier.maxAppliedValue != null) {
                const cap = Math.abs(modifier.maxAppliedValue);
                moved = Math.sign(moved || sourceValue || 1) * Math.min(Math.abs(moved), cap);
            }
            const results: SublimationResolvedStat[] = [];
            (modifier.sourceActionIds || []).forEach((actionId) => {
                const currentValue = stats.get(actionId) || 0;
                if (currentValue !== 0) results.push({ actionId, label: modifier.label, value: -currentValue });
            });
            (modifier.targetActionIds || []).forEach((actionId) => {
                results.push({ actionId, label: modifier.label, value: moved });
            });
            return results;
        }
        case 'zeroOut':
            return (modifier.sourceActionIds || []).flatMap((actionId) => {
                const currentValue = stats.get(actionId) || 0;
                return currentValue ? [{ actionId, label: modifier.label, value: -currentValue }] : [];
            });
        case 'currentHpPercentToArmor': {
            const hp = stats.get(20) || context.baseStats.get(20) || 0;
            const currentFraction = Math.max(0, Math.min(clampedActiveValue, 100)) / 100;
            const resolved = Math.round(hp * currentFraction * ((modifier.value || 0) / 100));
            return resolved ? [{ actionId: 45897, label: modifier.label, value: resolved }] : [];
        }
        case 'maxHpPercentToArmor': {
            const hp = stats.get(20) || context.baseStats.get(20) || 0;
            const resolved = Math.round(hp * ((modifier.value || 0) / 100) * clampedActiveValue);
            return resolved ? [{ actionId: 45897, label: modifier.label, value: resolved }] : [];
        }
        case 'missingHpPercentToArmor': {
            const hp = stats.get(20) || context.baseStats.get(20) || 0;
            const missingFraction = Math.max(0, Math.min(clampedActiveValue, 100)) / 100;
            const resolved = Math.round(hp * missingFraction * ((modifier.value || 0) / 100));
            return resolved ? [{ actionId: 45897, label: modifier.label, value: resolved }] : [];
        }
        case 'missingHpPercentToHeal':
        case 'maxHpPercentToHeal':
        case 'currentHpPercentToHeal': {
            const hp = stats.get(20) || context.baseStats.get(20) || 0;
            const factor =
                modifier.mode === 'maxHpPercentToHeal'
                    ? clampedActiveValue
                    : Math.max(0, Math.min(clampedActiveValue, 100)) / 100;
            const resolved = Math.round(hp * factor * ((modifier.value || 0) / 100));
            return modifier.actionId && resolved ? [{ actionId: modifier.actionId, label: modifier.label, value: resolved }] : [];
        }
        default:
            return [];
    }
}

export function resolveSublimationStats(params: {
    entry: SublimationEntryLike;
    context: SublimationResolverContext;
    controls: Record<string, number | undefined>;
    currentStats: BuilderStatValueMap;
    effectScale?: number;
}) {
    const modifiers = params.entry.effects.flatMap((effect, effectIndex) => parseRawEffect(params.entry.id, effect, effectIndex));
    const resolved: SublimationResolvedStat[] = [];
    const effectScale = Number.isFinite(params.effectScale) ? Math.max(0, Number(params.effectScale)) : 1;

    for (const modifier of modifiers) {
        const activeValue = modifier.control ? (params.controls[modifier.control.key] ?? modifier.control.defaultValue) : 1;
        const applied = applyModifier(modifier, activeValue, params.currentStats, params.context);
        applied.forEach((entry) => {
            const scaledValue =
                effectScale === 1
                    ? entry.value
                    : Math.round(entry.value * effectScale);
            if (!scaledValue) return;
            resolved.push({ ...entry, value: scaledValue });
            params.currentStats.set(entry.actionId, (params.currentStats.get(entry.actionId) || 0) + scaledValue);
        });
    }

    return resolved;
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BuilderStatLabel } from '@/components/BuilderStatLabel';
import builderStyles from '@/app/builder/page.module.css';
import { closeAllBuilderItemTooltips, registerBuilderItemTooltipClose } from '@/components/builderItemTooltipBus';

type LocaleText = Record<string, string | undefined>;

export type BuilderItemStatsHoverPayload = {
    id: number;
    title: LocaleText;
    description?: LocaleText;
    level?: number;
    stats?: Array<{ key?: string; label: string; actionId?: number; value: number }>;
};

function getText(text: LocaleText | undefined, language: string) {
    return text?.[language] || text?.es || text?.en || '';
}

function isPercentStat(actionId: number, label?: string) {
    if (actionId === 150 || actionId === 168) return true;
    return (label || '').trim().startsWith('%');
}
function isResistanceStat(actionId: number, label?: string) {
    return [71, 80, 82, 83, 84, 85, 988].includes(actionId) || (label || '').toLowerCase().startsWith('resistencia');
}
function getResistanceReductionPercent(resistance: number) {
    return Math.trunc((1 - Math.pow(0.8, resistance / 100)) * 100);
}
function formatStatValue(actionId: number, value: number, options?: { signed?: boolean; label?: string; effectiveResistance?: boolean }) {
    const prefix = options?.signed && value > 0 ? '+' : '';
    if (options?.effectiveResistance && isResistanceStat(actionId, options?.label)) {
        return `${prefix}${getResistanceReductionPercent(value)}%`;
    }
    const suffix = isPercentStat(actionId, options?.label) ? '%' : '';
    return `${prefix}${value}${suffix}`;
}

type TipState = { left: number; top: number };

/** No abrir si el cursor solo cruza el icono (menos trabajo y sin apilamiento). */
const HOVER_OPEN_DELAY_MS = 72;
/** Tiempo para saltar del icono al tooltip sin cerrarlo. */
const ANCHOR_LEAVE_MS = 90;

export function BuilderItemStatsHover({
    item,
    language,
    children,
    className,
}: {
    item: BuilderItemStatsHoverPayload;
    language: string;
    children: ReactNode;
    className?: string;
}) {
    const [tip, setTip] = useState<TipState | null>(null);
    const tipVisibleRef = useRef(false);
    const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const anchorLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const close = () => {
            if (openTimer.current) {
                clearTimeout(openTimer.current);
                openTimer.current = null;
            }
            if (anchorLeaveTimer.current) {
                clearTimeout(anchorLeaveTimer.current);
                anchorLeaveTimer.current = null;
            }
            tipVisibleRef.current = false;
            setTip(null);
        };
        return registerBuilderItemTooltipClose(close);
    }, []);

    useEffect(() => {
        if (!tip) return;
        const close = () => {
            tipVisibleRef.current = false;
            setTip(null);
        };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [tip]);

    function openTip(anchor: HTMLElement) {
        const width = Math.min(320, window.innerWidth - 16);
        const rect = anchor.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const top = rect.bottom + 8;
        tipVisibleRef.current = true;
        setTip({ left, top });
    }

    function scheduleAnchorLeave() {
        if (anchorLeaveTimer.current) clearTimeout(anchorLeaveTimer.current);
        anchorLeaveTimer.current = setTimeout(() => {
            anchorLeaveTimer.current = null;
            tipVisibleRef.current = false;
            setTip(null);
        }, ANCHOR_LEAVE_MS);
    }

    function cancelAnchorLeave() {
        if (anchorLeaveTimer.current) {
            clearTimeout(anchorLeaveTimer.current);
            anchorLeaveTimer.current = null;
        }
    }

    const stats = item.stats || [];

    return (
        <>
            <span
                className={`${builderStyles.builderItemHoverAnchor} ${className || ''}`.trim()}
                onMouseEnter={(event) => {
                    closeAllBuilderItemTooltips();
                    if (openTimer.current) {
                        clearTimeout(openTimer.current);
                        openTimer.current = null;
                    }
                    cancelAnchorLeave();
                    const anchor = event.currentTarget;
                    openTimer.current = setTimeout(() => {
                        openTimer.current = null;
                        openTip(anchor);
                    }, HOVER_OPEN_DELAY_MS);
                }}
                onMouseLeave={() => {
                    if (openTimer.current) {
                        clearTimeout(openTimer.current);
                        openTimer.current = null;
                    }
                    if (tipVisibleRef.current) scheduleAnchorLeave();
                }}
            >
                {children}
            </span>
            {typeof document !== 'undefined' && tip
                ? createPortal(
                      <div
                          role="tooltip"
                          className={builderStyles.builderItemTooltipPortal}
                          style={{ left: tip.left, top: tip.top }}
                          onMouseEnter={cancelAnchorLeave}
                          onMouseLeave={() => {
                              tipVisibleRef.current = false;
                              setTip(null);
                          }}
                      >
                          <strong>{getText(item.title, language)}</strong>
                          {item.level != null ? (
                              <span className={builderStyles.builderItemTooltipMeta}>Lv. {item.level}</span>
                          ) : null}
                          {item.description ? <p>{getText(item.description, language)}</p> : null}
                          {stats.length > 0 ? (
                              <div className={builderStyles.hoverCardStats}>
                                  {stats.slice(0, 16).map((entry, index) => (
                                      <div
                                          key={`${item.id}-${entry.key || entry.label}-${entry.value}-${index}`}
                                          className={builderStyles.hoverCardRow}
                                      >
                                          {entry.actionId != null ? (
                                              <BuilderStatLabel actionId={entry.actionId} label={entry.label} />
                                          ) : (
                                              <BuilderStatLabel label={entry.label} />
                                          )}
                                          <strong>
                                              {entry.actionId != null
                                                  ? formatStatValue(entry.actionId, entry.value, {
                                                        signed: true,
                                                        label: entry.label,
                                                        effectiveResistance: true,
                                                    })
                                                  : entry.value > 0
                                                    ? `+${entry.value}`
                                                    : entry.value}
                                          </strong>
                                      </div>
                                  ))}
                              </div>
                          ) : null}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

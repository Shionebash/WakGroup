'use client';

import { getAssetUrl } from '@/lib/api';
import { getBuilderStatIconAssetPath } from '@/lib/builder-stat-icons';
import styles from './BuilderStatLabel.module.css';

export function BuilderStatLabel({
    actionId,
    label,
    className,
    iconClassName,
    labelClassName,
}: {
    actionId?: number;
    label: string;
    className?: string;
    iconClassName?: string;
    labelClassName?: string;
}) {
    const path = getBuilderStatIconAssetPath(actionId, label);
    return (
        <span className={`${styles.wrap} ${className || ''}`.trim()}>
            {path ? (
                <img src={getAssetUrl(path)} alt="" className={`${styles.icon} ${iconClassName || ''}`.trim()} aria-hidden />
            ) : null}
            <span className={`${styles.text} ${labelClassName || ''}`.trim()}>{label}</span>
        </span>
    );
}

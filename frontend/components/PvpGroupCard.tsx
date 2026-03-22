'use client';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

interface PvpGroupCardProps {
    group: any;
    onClick: () => void;
}

const PVP_MODE_COLORS: Record<string, string> = {
    '1v1': '#e57373',
    '2v2': '#ffb74d',
    '3v3': '#64b5f6',
    '4v4': '#4db6ac',
    '5v5': '#9575cd',
    '6v6': '#f06292',
};

const TOTAL_SLOTS_BY_MODE: Record<string, number> = {
    '1v1': 2,
    '2v2': 4,
    '3v3': 6,
    '4v4': 8,
    '5v5': 10,
    '6v6': 12,
};

export default function PvpGroupCard({ group, onClick }: PvpGroupCardProps) {
    const modeColor = PVP_MODE_COLORS[group.pvp_mode] || 'var(--primary-color)';
    const totalSlots = TOTAL_SLOTS_BY_MODE[group.pvp_mode] || 6;
    const { language } = useLanguage();

    return (
        <div className="group-card group-card-pvp" onClick={onClick}>
            <div className="group-card-header group-card-header-pvp">
                <div className="group-card-header-pvp-bg" />
                <div className="group-card-overlay group-card-overlay-pvp" />
                <div className="group-card-pvp-mark" style={{ color: modeColor }}>
                    {group.pvp_mode}
                </div>
                <div className="group-card-badge">
                    <span className={`badge badge-status ${group.status === 'open' ? 'badge-open' : 'badge-closed'}`}>
                        {group.status === 'open' ? t('common.open', language) : t('common.full', language)}
                    </span>
                </div>
                <div className="group-card-headline">
                    <h3 className="group-card-title">{group.title}</h3>
                    <p className="group-card-subtitle" style={{ color: modeColor }}>
                        {t('pvp.equipmentBand', language).replace('{level}', String(group.equipment_band))}
                    </p>
                </div>
            </div>

            <div className="group-card-content">
                <div className="group-card-meta group-card-meta-compact">
                    <div className="meta-chip" style={{ borderColor: `${modeColor}55` }}>
                        <span className="meta-label">{t('pvp.mode', language)}</span>
                        <span className="meta-value" style={{ color: modeColor }}>{group.pvp_mode}</span>
                    </div>
                    <div className="meta-chip">
                        <span className="meta-label">{t('common.server', language)}</span>
                        <span className="meta-value">{group.server}</span>
                    </div>
                    <div className="meta-chip">
                        <span className="meta-label">{t('pvp.band', language)}</span>
                        <span className="meta-value">{t('pvp.bandLevel', language).replace('{level}', String(group.equipment_band))}</span>
                    </div>
                </div>

                <div className="group-card-footer">
                    <div className="group-card-leader">
                        <span className="leader-label">{t('common.leader', language)}</span>
                        {group.leader_class_icon && (
                            <img
                                src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.leader_class_icon}`}
                                alt={group.leader_class_name}
                                className="leader-icon"
                                title={group.leader_class_name}
                            />
                        )}
                        <span className="leader-name">{group.leader_name}</span>
                    </div>

                    <div className="group-card-members">
                        <span className="member-count">
                            {group.member_count || 1}/{totalSlots} {t('common.players', language)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

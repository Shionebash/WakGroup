'use client';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

interface GroupProps {
    group: any;
    onClick: () => void;
}

export default function GroupCard({ group, onClick }: GroupProps) {
    const { language } = useLanguage();
    const dungeonName = group?.dungeon_name || group?.title || '';

    return (
        <div className="group-card" onClick={onClick}>
            <div className="group-card-header">
                {group.dungeon_image && (
                    <img
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${group.dungeon_image}`}
                        alt={dungeonName}
                        className="group-card-image"
                    />
                )}
                <div className="group-card-overlay" />
                <div className="group-card-badge">
                    <span className={`badge badge-status ${group.status === 'open' ? 'badge-open' : 'badge-closed'}`}>
                        {group.status === 'open' ? t('common.open', language) : t('common.full', language)}
                    </span>
                </div>
                <div className="group-card-headline">
                    <h3 className="group-card-title">{dungeonName}</h3>
                    {group.title && <p className="group-card-subtitle">{group.title}</p>}
                </div>
            </div>

            <div className="group-card-content">
                <div className="group-card-meta group-card-meta-compact">
                    <div className="meta-chip">
                        <span className="meta-label">{t('common.levelShort', language)}</span>
                        <span className="meta-value">{group.dungeon_lvl}</span>
                    </div>
                    <div className="meta-chip">
                        <span className="meta-label">{t('common.stasis', language)}</span>
                        <span className="meta-value">{group.stasis}</span>
                    </div>
                    <div className="meta-chip">
                        <span className="meta-label">{t('common.server', language)}</span>
                        <span className="meta-value">{group.server}</span>
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
                            {group.member_count || 1}/{group.max_players || 6} {t('common.members', language).toLowerCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

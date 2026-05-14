'use client';

import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
import { DISCORD_INVITE_URL } from '@/lib/discord';

export default function Footer() {
    const { language } = useLanguage();

    return (
        <footer
            style={{
                width: '100%',
                padding: '16px 24px 26px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245, 232, 210, 0.72)',
                fontSize: 13,
                textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(18, 12, 7, 0) 0%, rgba(18, 12, 7, 0.72) 100%)',
            }}
        >
            <span>{t('footer.owner', language)}</span>
            <span style={{ margin: '0 10px', color: 'rgba(212, 165, 116, 0.55)' }}>·</span>
            <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: '#e7bf8c',
                    fontWeight: 700,
                    textDecoration: 'none',
                }}
            >
                {t('footer.discord', language)}
            </a>
        </footer>
    );
}

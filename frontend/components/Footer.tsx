'use client';

import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

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
            {t('footer.owner', language)}
        </footer>
    );
}

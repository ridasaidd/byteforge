import { useEffect, useRef } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentSettings {
    ga4_enabled: boolean;
    ga4_measurement_id: string | null;
    gtm_enabled: boolean;
    gtm_container_id: string | null;
    clarity_enabled: boolean;
    clarity_project_id: string | null;
    plausible_enabled: boolean;
    plausible_domain: string | null;
    meta_pixel_enabled: boolean;
    meta_pixel_id: string | null;
    privacy_policy_url: string | null;
    cookie_policy_url: string | null;
}

// ---------------------------------------------------------------------------
// Analytics script injection helpers
// ---------------------------------------------------------------------------

function injectScript(id: string, src: string, inline?: string): void {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    if (src) {
        script.src = src;
        script.async = true;
    }
    if (inline) script.textContent = inline;
    document.head.appendChild(script);
}

function removeScript(id: string): void {
    document.getElementById(id)?.remove();
}

function loadGA4(measurementId: string): void {
    injectScript('cc-ga4', `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
    injectScript(
        'cc-ga4-config',
        '',
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`,
    );
}

function removeGA4(): void {
    removeScript('cc-ga4');
    removeScript('cc-ga4-config');
}

function loadGTM(containerId: string): void {
    injectScript(
        'cc-gtm',
        '',
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`,
    );
}

function removeGTM(): void {
    removeScript('cc-gtm');
}

function loadClarity(projectId: string): void {
    injectScript(
        'cc-clarity',
        '',
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");`,
    );
}

function removeClarity(): void {
    removeScript('cc-clarity');
}

function loadPlausible(domain: string): void {
    injectScript('cc-plausible', `https://plausible.io/js/script.js`);
    const el = document.getElementById('cc-plausible') as HTMLScriptElement | null;
    if (el) el.setAttribute('data-domain', domain);
}

function removePlausible(): void {
    removeScript('cc-plausible');
}

function loadMetaPixel(pixelId: string): void {
    injectScript(
        'cc-meta-pixel',
        '',
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
    );
}

function removeMetaPixel(): void {
    removeScript('cc-meta-pixel');
}

// ---------------------------------------------------------------------------
// Apply/revoke analytics based on current consent
// ---------------------------------------------------------------------------

function applyAnalyticsConsent(settings: ConsentSettings): void {
    const analyticsAccepted = CookieConsent.acceptedCategory('analytics');
    const marketingAccepted = CookieConsent.acceptedCategory('marketing');

    // --- Analytics category ---
    if (analyticsAccepted) {
        if (settings.ga4_enabled && settings.ga4_measurement_id) loadGA4(settings.ga4_measurement_id);
        if (settings.gtm_enabled && settings.gtm_container_id) loadGTM(settings.gtm_container_id);
        if (settings.clarity_enabled && settings.clarity_project_id) loadClarity(settings.clarity_project_id);
        if (settings.plausible_enabled && settings.plausible_domain) loadPlausible(settings.plausible_domain);
    } else {
        removeGA4();
        removeGTM();
        removeClarity();
        removePlausible();
    }

    // --- Marketing category ---
    if (marketingAccepted) {
        if (settings.meta_pixel_enabled && settings.meta_pixel_id) loadMetaPixel(settings.meta_pixel_id);
    } else {
        removeMetaPixel();
    }
}

// ---------------------------------------------------------------------------
// Translations (embedded so the banner works without extra API calls)
// ---------------------------------------------------------------------------

const translations: CookieConsent.CookieConsentConfig['language'] = {
    default: 'en',
    autoDetect: 'browser',
    translations: {
        en: {
            consentModal: {
                title: 'We use cookies',
                description:
                    'We use cookies to improve your experience and analyse site usage. You can choose which categories to allow. Read our <a href="{{cookie_policy_url}}" target="_blank">Cookie Policy</a> for more information.',
                acceptAllBtn: 'Accept all',
                acceptNecessaryBtn: 'Reject all',
                showPreferencesBtn: 'Manage preferences',
            },
            preferencesModal: {
                title: 'Cookie preferences',
                acceptAllBtn: 'Accept all',
                acceptNecessaryBtn: 'Reject all',
                savePreferencesBtn: 'Save preferences',
                closeIconLabel: 'Close',
                sections: [
                    {
                        title: 'Strictly necessary',
                        description:
                            'These cookies are essential for the website to function correctly and cannot be disabled.',
                        linkedCategory: 'necessary',
                    },
                    {
                        title: 'Analytics',
                        description:
                            'These cookies help us understand how visitors use our site so we can improve it.',
                        linkedCategory: 'analytics',
                    },
                    {
                        title: 'Marketing',
                        description:
                            'These cookies are used to show you relevant advertisements on other websites.',
                        linkedCategory: 'marketing',
                    },
                ],
            },
        },
        sv: {
            consentModal: {
                title: 'Vi använder kakor',
                description:
                    'Vi använder kakor för att förbättra din upplevelse och analysera webbplatsanvändning. Du kan välja vilka kategorier du tillåter. Läs vår <a href="{{cookie_policy_url}}" target="_blank">Kakpolicy</a> för mer information.',
                acceptAllBtn: 'Acceptera alla',
                acceptNecessaryBtn: 'Avvisa alla',
                showPreferencesBtn: 'Hantera inställningar',
            },
            preferencesModal: {
                title: 'Kakinställningar',
                acceptAllBtn: 'Acceptera alla',
                acceptNecessaryBtn: 'Avvisa alla',
                savePreferencesBtn: 'Spara inställningar',
                closeIconLabel: 'Stäng',
                sections: [
                    {
                        title: 'Strikt nödvändiga',
                        description:
                            'Dessa kakor är nödvändiga för att webbplatsen ska fungera korrekt och kan inte inaktiveras.',
                        linkedCategory: 'necessary',
                    },
                    {
                        title: 'Analys',
                        description:
                            'Dessa kakor hjälper oss att förstå hur besökare använder vår webbplats så vi kan förbättra den.',
                        linkedCategory: 'analytics',
                    },
                    {
                        title: 'Marknadsföring',
                        description:
                            'Dessa kakor används för att visa dig relevanta annonser på andra webbplatser.',
                        linkedCategory: 'marketing',
                    },
                ],
            },
        },
        ar: {
            consentModal: {
                title: 'نستخدم ملفات تعريف الارتباط',
                description:
                    'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل استخدام الموقع. يمكنك اختيار الفئات التي تسمح بها. اقرأ <a href="{{cookie_policy_url}}" target="_blank">سياسة ملفات تعريف الارتباط</a> لمزيد من المعلومات.',
                acceptAllBtn: 'قبول الكل',
                acceptNecessaryBtn: 'رفض الكل',
                showPreferencesBtn: 'إدارة التفضيلات',
            },
            preferencesModal: {
                title: 'تفضيلات ملفات تعريف الارتباط',
                acceptAllBtn: 'قبول الكل',
                acceptNecessaryBtn: 'رفض الكل',
                savePreferencesBtn: 'حفظ التفضيلات',
                closeIconLabel: 'إغلاق',
                sections: [
                    {
                        title: 'الضرورية تمامًا',
                        description:
                            'هذه الملفات ضرورية لعمل الموقع بشكل صحيح ولا يمكن تعطيلها.',
                        linkedCategory: 'necessary',
                    },
                    {
                        title: 'التحليلات',
                        description:
                            'تساعدنا هذه الملفات على فهم كيفية استخدام الزوار للموقع حتى نتمكن من تحسينه.',
                        linkedCategory: 'analytics',
                    },
                    {
                        title: 'التسويق',
                        description:
                            'تُستخدم هذه الملفات لعرض إعلانات ذات صلة لك على مواقع أخرى.',
                        linkedCategory: 'marketing',
                    },
                ],
            },
        },
    },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CookieBanner() {
    const initialised = useRef(false);

    useEffect(() => {
        if (initialised.current) return;
        initialised.current = true;

        let settings: ConsentSettings | null = null;

        const init = async () => {
            try {
                const res = await fetch('/api/pages/public/consent-settings');
                if (res.ok) {
                    const json = await res.json();
                    settings = json.data as ConsentSettings;
                }
            } catch {
                // Settings unavailable — banner still shows with defaults
            }

            // Substitute cookie_policy_url into description placeholders
            const cookiePolicyUrl = settings?.cookie_policy_url ?? '#';
            const substituted = JSON.parse(
                JSON.stringify(translations).replace(/\{\{cookie_policy_url\}\}/g, cookiePolicyUrl),
            ) as CookieConsent.CookieConsentConfig['language'];

            await CookieConsent.run({
                cookie: {
                    name: 'byteforge_cookie_consent',
                    expiresAfterDays: 365,
                },
                guiOptions: {
                    consentModal: {
                        layout: 'bar',
                        position: 'bottom center',
                    },
                    preferencesModal: {
                        layout: 'box',
                    },
                },
                categories: {
                    necessary: {
                        enabled: true,
                        readOnly: true,
                    },
                    analytics: {
                        autoClear: {
                            cookies: [
                                { name: /^_ga/ },
                                { name: '_gid' },
                                { name: '_clarity' },
                                { name: '_clsk' },
                                { name: '_clck' },
                            ],
                        },
                    },
                    marketing: {
                        autoClear: {
                            cookies: [{ name: /^_fbp/ }, { name: /^_fbc/ }],
                        },
                    },
                },
                onConsent: () => {
                    if (settings) applyAnalyticsConsent(settings);
                },
                onChange: () => {
                    if (settings) applyAnalyticsConsent(settings);
                },
                language: substituted,
            });

            // If consent was already given on a previous visit, apply scripts immediately
            if (settings && CookieConsent.acceptedCategory('analytics')) {
                applyAnalyticsConsent(settings);
            }
        };

        init();
    }, []);

    return null;
}

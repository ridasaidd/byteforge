import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arBilling from './locales/ar/billing.json';
import arDashboard from './locales/ar/dashboard.json';
import arAccess from './locales/ar/access.json';
import arActivity from './locales/ar/activity.json';
import arAnalytics from './locales/ar/analytics.json';
import arMedia from './locales/ar/media.json';
import arNavigations from './locales/ar/navigations.json';
import arPages from './locales/ar/pages.json';
import arPublic from './locales/ar/public.json';
import arSettings from './locales/ar/settings.json';
import arTenants from './locales/ar/tenants.json';
import arThemes from './locales/ar/themes.json';
import arUsers from './locales/ar/users.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enBilling from './locales/en/billing.json';
import enDashboard from './locales/en/dashboard.json';
import enAccess from './locales/en/access.json';
import enActivity from './locales/en/activity.json';
import enAnalytics from './locales/en/analytics.json';
import enMedia from './locales/en/media.json';
import enNavigations from './locales/en/navigations.json';
import enPages from './locales/en/pages.json';
import enPublic from './locales/en/public.json';
import enSettings from './locales/en/settings.json';
import enTenants from './locales/en/tenants.json';
import enThemes from './locales/en/themes.json';
import enUsers from './locales/en/users.json';
import svCommon from './locales/sv/common.json';
import svAuth from './locales/sv/auth.json';
import svBilling from './locales/sv/billing.json';
import svDashboard from './locales/sv/dashboard.json';
import svAccess from './locales/sv/access.json';
import svActivity from './locales/sv/activity.json';
import svAnalytics from './locales/sv/analytics.json';
import svMedia from './locales/sv/media.json';
import svNavigations from './locales/sv/navigations.json';
import svPages from './locales/sv/pages.json';
import svPublic from './locales/sv/public.json';
import svSettings from './locales/sv/settings.json';
import svTenants from './locales/sv/tenants.json';
import svThemes from './locales/sv/themes.json';
import svUsers from './locales/sv/users.json';

export const SUPPORTED_LOCALES = ['en', 'sv', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES = new Set<SupportedLocale>(['ar']);
export const LOCALE_STORAGE_KEY = 'byteforge_locale';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: enCommon, auth: enAuth, dashboard: enDashboard, settings: enSettings, billing: enBilling, tenants: enTenants, users: enUsers, pages: enPages, public: enPublic, access: enAccess, navigations: enNavigations, themes: enThemes, media: enMedia, analytics: enAnalytics, activity: enActivity },
        sv: { common: svCommon, auth: svAuth, dashboard: svDashboard, settings: svSettings, billing: svBilling, tenants: svTenants, users: svUsers, pages: svPages, public: svPublic, access: svAccess, navigations: svNavigations, themes: svThemes, media: svMedia, analytics: svAnalytics, activity: svActivity },
        ar: { common: arCommon, auth: arAuth, dashboard: arDashboard, settings: arSettings, billing: arBilling, tenants: arTenants, users: arUsers, pages: arPages, public: arPublic, access: arAccess, navigations: arNavigations, themes: arThemes, media: arMedia, analytics: arAnalytics, activity: arActivity },
      },
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      nonExplicitSupportedLngs: true,
      defaultNS: 'common',
      ns: ['common', 'auth', 'dashboard', 'settings', 'billing', 'tenants', 'users', 'pages', 'public', 'access', 'navigations', 'themes', 'media', 'analytics', 'activity'],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });
}

export default i18n;

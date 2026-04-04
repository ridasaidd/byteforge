import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useDirection } from '@/components/ui/direction';
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import { useAuth } from '@/shared/hooks/useAuth';
import { authService } from '@/shared/services/auth.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

type LocaleOption = {
  value: SupportedLocale;
  label: string;
};

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  sv: 'Svenska',
  ar: 'العربية',
};

function normalizeToSupportedLocale(language: string): SupportedLocale {
  const baseLocale = language.split('-')[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(baseLocale) ? baseLocale : 'en';
}

export function LanguageSelector() {
  const { i18n, t } = useTranslation('common');
  const { isAuthenticated, refetchUser } = useAuth();
  const dir = useDirection();

  const options = useMemo<LocaleOption[]>(
    () => SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] })),
    []
  );

  const value = normalizeToSupportedLocale(i18n.resolvedLanguage || i18n.language);

  const handleChange = async (nextLocale: string) => {
    const locale = normalizeToSupportedLocale(nextLocale);

    await i18n.changeLanguage(locale);

    // Persist locale only after an explicit user action.
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);

    if (!isAuthenticated) {
      return;
    }

    try {
      await authService.updateLocale(locale);
      await refetchUser();
    } catch (error) {
      console.error('Failed to persist locale preference:', error);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={t('language')}
        className="h-8 w-[124px]"
        size="sm"
      >
        <SelectValue placeholder={t('language')} />
      </SelectTrigger>
      <SelectContent dir={dir} align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

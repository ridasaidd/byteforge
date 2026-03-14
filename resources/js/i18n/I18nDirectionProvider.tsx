import { ReactNode, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DirectionProvider } from '@/components/ui/direction';
import { RTL_LOCALES } from '@/i18n';

type AppDirection = 'ltr' | 'rtl';

type Props = {
  children: ReactNode;
};

function mapLanguageToDirection(language: string): AppDirection {
  const baseLocale = language.split('-')[0] as 'en' | 'sv' | 'ar';
  return RTL_LOCALES.has(baseLocale) ? 'rtl' : 'ltr';
}

export function I18nDirectionProvider({ children }: Props) {
  const { i18n } = useTranslation();

  const dir = useMemo(() => mapLanguageToDirection(i18n.resolvedLanguage || i18n.language), [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    const lang = i18n.resolvedLanguage || i18n.language || 'en';

    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, i18n.language, i18n.resolvedLanguage]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}

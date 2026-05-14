import { FieldLabel } from '@puckeditor/core';
import { createConditionalResolver } from '../../fields';
import { PagesSelector } from '../content/PagesSelector';

type LinkTypeOption = {
  label: string;
  value: 'none' | 'internal' | 'external';
};

interface LinkDestinationFieldOptions {
  linkTypeLabel?: string;
  internalPageLabel?: string;
  externalUrlLabel?: string;
  externalUrlPlaceholder?: string;
  linkTypeOptions?: LinkTypeOption[];
  defaultLinkType?: 'none' | 'internal' | 'external';
}

interface LinkDestinationResolverOptions {
  targetFieldKey?: string;
  showTargetForInternalLinks?: boolean;
}

export function createLinkDestinationFields({
  linkTypeLabel = 'Link Type',
  internalPageLabel = 'Select Page',
  externalUrlLabel = 'External URL',
  externalUrlPlaceholder,
  linkTypeOptions = [
    { label: 'Internal Page', value: 'internal' },
    { label: 'External URL', value: 'external' },
  ],
  defaultLinkType = linkTypeOptions[0]?.value ?? 'internal',
}: LinkDestinationFieldOptions = {}) {
  return {
    linkType: {
      type: 'radio' as const,
      label: linkTypeLabel,
      options: linkTypeOptions,
      defaultValue: defaultLinkType,
    },
    internalPage: {
      type: 'custom' as const,
      label: internalPageLabel,
      render: ({ field, value, onChange }: { field: { label?: string }; value?: string; onChange: (value: string | undefined) => void }) => (
        <FieldLabel label={field.label || internalPageLabel}>
          <PagesSelector value={value} onChange={(nextValue) => onChange(nextValue || undefined)} />
        </FieldLabel>
      ),
    },
    href: {
      type: 'text' as const,
      label: externalUrlLabel,
      placeholder: externalUrlPlaceholder,
    },
  };
}

export function createOpenInNewTabField(label = 'Open in new tab') {
  return {
    type: 'radio' as const,
    label,
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: false,
  };
}

export function createTargetField(label = 'Target') {
  return {
    type: 'select' as const,
    label,
    options: [
      { label: 'Same Window (_self)', value: '_self' },
      { label: 'New Window (_blank)', value: '_blank' },
      { label: 'Parent Frame (_parent)', value: '_parent' },
      { label: 'Top Frame (_top)', value: '_top' },
    ],
    defaultValue: '_self',
  };
}

export function createLinkDestinationResolver(
  baseFieldKeys: string[],
  {
    targetFieldKey,
    showTargetForInternalLinks = false,
  }: LinkDestinationResolverOptions = {}
) {
  return <T extends Record<string, unknown>>(data: { props: Record<string, unknown> }, { fields }: { fields: T }) => {
    const resolver = createConditionalResolver<T>(baseFieldKeys, [
      {
        condition: (props) => props.linkType === 'internal',
        fieldKeys: [
          'internalPage',
          ...(targetFieldKey && showTargetForInternalLinks ? [targetFieldKey] : []),
        ],
      },
      {
        condition: (props) => props.linkType === 'external',
        fieldKeys: [
          'href',
          ...(targetFieldKey ? [targetFieldKey] : []),
        ],
      },
    ]);

    return resolver(data, { fields });
  };
}

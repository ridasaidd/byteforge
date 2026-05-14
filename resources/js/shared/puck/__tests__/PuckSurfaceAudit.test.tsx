import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { puckConfig } from '../config';

vi.mock('@/shared/services/api/pages', () => ({
  pages: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  tenantPages: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/shared/services/api/systemSurfaces', () => ({
  tenantSystemSurfaces: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../components/content/PagesSelector', () => ({
  PagesSelector: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
    <select
      data-testid="mock-pages-selector"
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select a route</option>
      <option value="/pages/mock-page">Mock Page</option>
    </select>
  ),
}));

vi.mock('@/shared/components/organisms/MediaPickerModal', () => ({
  MediaPickerModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-media-picker">Media picker</div> : null,
}));

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      theme_data: {
        colors: {
          foreground: '#111827',
          background: '#ffffff',
          primary: '#2563eb',
        },
        typography: {
          fontWeight: {
            normal: '400',
            medium: '500',
            bold: '700',
          },
          fontSize: {
            base: '16px',
            lg: '18px',
          },
        },
        components: {
          text: { colors: { default: '#111827' } },
          heading: { colors: { default: '#111827' } },
          button: {
            variants: {
              primary: {
                backgroundColor: '#2563eb',
                color: '#ffffff',
              },
            },
            hoverOpacity: '0.9',
          },
          link: {
            colors: {
              default: '#2563eb',
              hover: '#1d4ed8',
            },
          },
        },
      },
    },
    resolve: (token: string, fallback = '') => {
      const values: Record<string, string> = {
        'colors.foreground': '#111827',
        'colors.background': '#ffffff',
        'colors.primary': '#2563eb',
        'typography.fontWeight.normal': '400',
        'typography.fontWeight.medium': '500',
        'typography.fontWeight.bold': '700',
        'typography.fontSize.base': '16px',
        'typography.fontSize.lg': '18px',
        'components.text.colors.default': '#111827',
        'components.heading.colors.default': '#111827',
        'components.button.variants.primary.backgroundColor': '#2563eb',
        'components.button.variants.primary.color': '#ffffff',
        'components.button.hoverOpacity': '0.9',
        'components.link.colors.default': '#2563eb',
        'components.link.colors.hover': '#1d4ed8',
      };

      return values[token] || fallback || token;
    },
  }),
  usePuckEditMode: () => true,
  useWindowWidth: () => 1280,
}));

type ConfigField = {
  type?: string;
  label?: string;
  defaultValue?: unknown;
  render?: (props: {
    field: ConfigField;
    value: unknown;
    onChange: (value: unknown) => void;
  }) => JSX.Element;
};

const componentOverrides: Record<string, Record<string, unknown>> = {
  Link: {
    linkType: 'external',
    href: 'https://example.com',
    label: 'Audit link',
  },
};

const excludedFieldKeys = new Set(['to']);
const rootFields = (puckConfig.root?.fields ?? {}) as Record<string, ConfigField>;

function FieldRenderer({ field }: { field: ConfigField }) {
  return field.render!({
    field,
    value: field.defaultValue,
    onChange: vi.fn(),
  });
}

function renderWithRouter(element: JSX.Element) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {element}
    </MemoryRouter>
  );
}

describe('Puck surface audit', () => {
  beforeEach(() => {
    cleanup();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it.each(Object.entries(puckConfig.components))(
    'renders configured block %s in editor mode',
    (componentName, componentConfig) => {
      const props = {
        ...(componentConfig.defaultProps || {}),
        id: `audit-${componentName.toLowerCase()}`,
        ...componentOverrides[componentName],
      };

      const { container } = renderWithRouter(componentConfig.render(props as never) as JSX.Element);

      expect(container.innerHTML).not.toBe('');
    }
  );

  const customFieldEntries: Array<[string, string, ConfigField]> = [
    ...Object.entries(rootFields).flatMap(([fieldKey, configField]) => {

      if (
        configField.type !== 'custom' ||
        excludedFieldKeys.has(fieldKey) ||
        configField.label === 'Page (Internal)'
      ) {
        return [];
      }

      return [['root', fieldKey, configField] as [string, string, ConfigField]];
    }),
    ...Object.entries(puckConfig.components).flatMap(([componentName, componentConfig]) =>
      Object.entries((componentConfig.fields ?? {}) as Record<string, ConfigField>).flatMap(([fieldKey, configField]) => {

        if (
          configField.type !== 'custom' ||
          excludedFieldKeys.has(fieldKey) ||
          configField.label === 'Page (Internal)'
        ) {
          return [];
        }

        return [[componentName, fieldKey, configField] as [string, string, ConfigField]];
      })
    ),
  ];

  it.each(customFieldEntries)(
    'mounts custom control %s.%s with its default value',
    (_owner, _fieldKey, field) => {
      expect(field.render).toBeTypeOf('function');

      const { container } = renderWithRouter(<FieldRenderer field={field} />);

      expect(container.innerHTML).not.toBe('');
    }
  );
});

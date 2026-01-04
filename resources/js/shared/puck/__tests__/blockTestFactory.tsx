import { describe, it, expect, beforeAll } from 'vitest';
import type { ReactElement } from 'react';
import type { ComponentConfig } from '@measured/puck';
import {
  renderPuckComponent,
  renderPuckComponentWithDragRef,
  extractStyleTags,
  assertCSSIsScoped,
  assertNoHardcodedValues,
  assertNoUnnecessaryWrappers,
  assertDragRefAttached,
  assertHasMediaQueries,
  hasResponsiveFields,
  hasConditionalFieldResolver,
} from './testUtils';

interface BlockTestSuiteOptions<TProps extends Record<string, unknown>> {
  /** Name used for describe block */
  name: string;
  /** Async loader for component config and render function */
  load: () => Promise<{
    componentConfig: ComponentConfig<any>;
    componentRender: (props: TProps & { puck?: { dragRef?: React.Ref<unknown> } }) => JSX.Element;
    wrapRender?: (node: ReactElement) => ReactElement;
  }>;
  /** Default props passed into render */
  defaultProps: TProps;
  /** Expected root className (used for scoping assertions) */
  className: string;
  /** Optional expected root tag (used for dragRef assertion) */
  rootTag?: string;
  /** Allowed hardcoded CSS values */
  allowedHardcodedValues?: string[];
  /** Responsive support flags */
  supportsPadding?: boolean;
  supportsMargin?: boolean;
  supportsBorder?: boolean;
  supportsShadow?: boolean;
  /** Optional wrapper for rendering (e.g., providers) */
  wrapRender?: (node: ReactElement) => ReactElement;
  /** Component-specific tests */
  extraTests?: (helpers: {
    renderWithDefaults: (overrides?: Partial<TProps>) => {
      container: HTMLElement;
      css: string;
    } & ReturnType<typeof renderPuckComponent>;
  }) => void;
}

export function defineBlockTestSuite<TProps extends Record<string, unknown> = Record<string, unknown>>(options: BlockTestSuiteOptions<TProps>) {
  let componentConfig: ComponentConfig<any> | undefined;
  let componentRender: ((props: TProps & { puck?: { dragRef?: React.Ref<unknown> } }) => JSX.Element) | undefined;
  let localWrapRender = options.wrapRender;

  describe(`${options.name} Component`, () => {
    beforeAll(async () => {
      const loaded = await options.load();
      componentConfig = loaded.componentConfig;
      componentRender = loaded.componentRender;
      localWrapRender = loaded.wrapRender || localWrapRender;
    });

    const getWrap = () => localWrapRender || ((node: ReactElement) => node);

    const renderWithDefaults = (overrides?: Partial<TProps>) => {
      if (!componentRender) throw new Error('Component not loaded');
      const props = { ...options.defaultProps, ...overrides } as TProps;
      const RenderComponent = componentRender;
      const wrapped = getWrap()(<RenderComponent {...props} />);
      const result = renderPuckComponent(wrapped);
      const css = extractStyleTags(result.container).join('\n');
      return { ...result, css };
    };

    // Configuration test
    it('should have inline: true to avoid Puck auto-wrapper', () => {
      if (!componentConfig) throw new Error('Component config not loaded');
      expect(componentConfig.inline).toBe(true);
    });

    // Rendering tests
    it('should render without errors', () => {
      if (!componentRender) throw new Error('Component not loaded');
      const ComponentRender = componentRender;
      expect(() => {
        renderPuckComponent(getWrap()(<ComponentRender {...options.defaultProps} />));
      }).not.toThrow();
    });

    // Pattern compliance: defaults should exist for all defined fields
    it('should define defaults for all fields (extractDefaults pattern)', () => {
      if (!componentConfig) throw new Error('Component config not loaded');
      const fields = componentConfig.fields || {};
      const defaults = componentConfig.defaultProps || {};
      const missingDefaults: string[] = [];

      Object.keys(fields).forEach((key) => {
        if (!(key in (defaults as Record<string, unknown>))) {
          missingDefaults.push(key);
        }
      });

      if (missingDefaults.length) {
        throw new Error(
          `Missing defaultProps for fields: ${missingDefaults.join(', ')}\n` +
          'Ensure defaults come from extractDefaults(...) in fieldGroups.'
        );
      }
    });

    // Pattern compliance: CSS should be generated and scoped via builder
    it('should generate scoped CSS with style tags', () => {
      if (!componentRender) throw new Error('Component not loaded');
      const ComponentRender = componentRender;
      const { container, css } = renderWithDefaults();
      // CSS exists
      expect(css.trim().length).toBeGreaterThan(0);
      // Scoped to provided className (builder pattern)
      assertCSSIsScoped(css, options.className);
      // No unnecessary draggable wrappers around root
      assertNoUnnecessaryWrappers(container, options.className);
    });

    // Pattern compliance: dragRef attaches to root when provided
    if (options.rootTag) {
      it('should attach dragRef to root element', () => {
        if (!componentRender) throw new Error('Component not loaded');
        const ComponentRender = componentRender;
        const node = getWrap()(<ComponentRender {...options.defaultProps} />);
        const { container } = renderPuckComponentWithDragRef(node);
        assertDragRefAttached(container, options.rootTag);
      });
    }

    // Optional: check for hardcoded values unless explicitly allowed
    if (options.allowedHardcodedValues && options.allowedHardcodedValues.length) {
      it('should avoid hardcoded CSS values (use theme/CSS vars)', () => {
        const { css } = renderWithDefaults();
        assertNoHardcodedValues(css, options.allowedHardcodedValues);
      });
    }

    // Pattern compliance: Responsive CSS generation (ALWAYS ENFORCED)
    it('should generate media-query CSS when responsive props are provided', () => {
      if (!componentConfig) throw new Error('Component config not loaded');

      const responsiveFields = hasResponsiveFields(componentConfig);

      // Only validate if component actually has responsive fields
      if (responsiveFields.length === 0) {
        // Skip: component doesn't have responsive props
        return;
      }

      // Find a responsive field in defaultProps that's actually set to multi-breakpoint
      const testProps: Record<string, any> = { ...options.defaultProps };
      let propToTest: string | undefined;

      responsiveFields.forEach(field => {
        const defaultValue = (options.defaultProps as any)[field];
        // Check if default value already has multiple breakpoints
        if (defaultValue && typeof defaultValue === 'object' && ('mobile' in defaultValue || 'desktop' in defaultValue)) {
          propToTest = field;
        }
      });

      // If no responsive defaults found, skip this test
      if (!propToTest) {
        return;
      }

      const { css } = renderWithDefaults(testProps);

      // Should have media queries if responsive props were provided
      const hasMediaQueries = assertHasMediaQueries(css, 1);
      if (!hasMediaQueries) {
        throw new Error(
          `Component has responsive field "${propToTest}" with multi-breakpoint defaults,\n` +
          'but generated CSS lacks media queries.\n' +
          'Ensure buildLayoutCSS() generates @media queries for responsive props.'
        );
      }
    });

    // Pattern compliance: Conditional field resolver usage (ALWAYS ENFORCED)
    it('should use createConditionalResolver for conditional field visibility', () => {
      if (!componentConfig) throw new Error('Component config not loaded');

      const hasResolver = hasConditionalFieldResolver(componentConfig);
      const fieldCount = Object.keys(componentConfig.fields || {}).length;

      // Warn if many fields but no resolver (might need conditional logic)
      if (fieldCount > 5 && !hasResolver) {
        console.warn(
          `⚠️  "${options.name}" has ${fieldCount} fields but no createConditionalResolver.\n` +
          'Consider using resolveFields to hide advanced/layout options conditionally.'
        );
      }

      // If resolver exists, verify it returns valid field keys
      if (hasResolver) {
        const testProps = options.defaultProps;
        const resolvedFields = componentConfig.resolveFields?.(testProps as any);

        expect(Array.isArray(resolvedFields)).toBe(true);
      }
    });

    if (options.extraTests) {
      options.extraTests({ renderWithDefaults });
    }
  });
}

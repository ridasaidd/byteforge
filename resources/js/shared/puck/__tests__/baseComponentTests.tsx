import { describe, it, expect } from 'vitest';
import { ComponentConfig } from '@puckeditor/core';
import type { ReactElement } from 'react';
import {
  assertHasInlineTrue,
  assertNoHardcodedValues,
  assertDragRefAttached,
  assertNoUnnecessaryWrappers,
  assertCSSIsScoped,
  renderPuckComponent,
  renderPuckComponentWithDragRef,
  extractStyleTags,
} from './testUtils';

/**
 * Base test suite for Puck components
 * Provides standard tests that all components should pass
 */
export interface BaseComponentTestConfig<TProps extends Record<string, unknown> = Record<string, unknown>> {
  /** The Puck component config to test */
  componentConfig: ComponentConfig<Record<string, unknown>> | (() => ComponentConfig<Record<string, unknown>>);
  /** The render function extracted from component config */
  componentRender: (props: TProps & { puck?: { dragRef?: React.Ref<unknown> } }) => JSX.Element;
  /** Default props for the component */
  defaultProps: TProps;
  /** The component's className (e.g., 'button-test-id' or 'card-card-1') */
  className: string;
  /** Root HTML tag name (e.g., 'button', 'div', 'section') */
  rootTag?: string;
  /** Values that are intentionally hardcoded and should be allowed (e.g., ['width: 100%']) */
  allowedHardcodedValues?: string[];
  /** Whether component supports responsive padding */
  supportsPadding?: boolean;
  /** Whether component supports responsive margin */
  supportsMargin?: boolean;
  /** Whether component supports border */
  supportsBorder?: boolean;
  /** Whether component supports shadow */
  supportsShadow?: boolean;
  /** Optional wrapper for rendering (e.g., FormProvider) */
  wrapRender?: (node: ReactElement) => ReactElement;
}

/**
 * Run standard configuration tests
 */
export function runConfigurationTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  describe('Configuration', () => {
    it('should have inline: true to avoid Puck auto-wrapper', () => {
      const resolvedConfig = typeof config.componentConfig === 'function'
        ? config.componentConfig()
        : config.componentConfig;

      assertHasInlineTrue(resolvedConfig);
    });
  });
}

/**
 * Run standard rendering tests
 */
export function runRenderingTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  const wrap = () => config.wrapRender || ((node: ReactElement) => node);

  describe('Rendering', () => {
    it('should render without errors', () => {
      const ComponentRender = config.componentRender;
      expect(() => {
        renderPuckComponent(wrap()(<ComponentRender {...config.defaultProps} />));
      }).not.toThrow();
    });

    it('should attach dragRef to root element when inline: true', () => {
      const ComponentRender = config.componentRender;
      const { container } = renderPuckComponentWithDragRef(
        wrap()(<ComponentRender {...config.defaultProps} />)
      );

      assertDragRefAttached(container, config.rootTag);
    });

    it('should not have Puck auto-wrapper around component', () => {
      const ComponentRender = config.componentRender;
      const { container } = renderPuckComponent(wrap()(<ComponentRender {...config.defaultProps} />));
      assertNoUnnecessaryWrappers(container, config.className);
    });
  });
}

/**
 * Run standard styling tests
 */
export function runStylingTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  const wrap = () => config.wrapRender || ((node: ReactElement) => node);

  describe('Styling', () => {
    it('should not have hardcoded CSS values (use theme instead)', () => {
      const ComponentRender = config.componentRender;
      const { container } = renderPuckComponent(wrap()(<ComponentRender {...config.defaultProps} />));
      const styles = extractStyleTags(container).join('\n');
      assertNoHardcodedValues(styles, config.allowedHardcodedValues || []);
    });

    it('should scope CSS to component className', () => {
      const ComponentRender = config.componentRender;
      const { container } = renderPuckComponent(wrap()(<ComponentRender {...config.defaultProps} />));
      const styles = extractStyleTags(container).join('\n');
      assertCSSIsScoped(styles, config.className);
    });
  });
}

/**
 * Run standard responsive property tests
 */
export function runResponsiveTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  const wrap = () => config.wrapRender || ((node: ReactElement) => node);

  describe('Responsive Properties', () => {
    if (config.supportsPadding !== false) {
      it('should generate responsive padding CSS', () => {
        const ComponentRender = config.componentRender;
        const propsWithPadding = {
          ...config.defaultProps,
          padding: {
            top: 16,
            right: 24,
            bottom: 16,
            left: 24,
            unit: 'px' as const,
          },
        };

        const { container } = renderPuckComponent(wrap()(<ComponentRender {...propsWithPadding} />));
        const styles = extractStyleTags(container).join('\n');

        // Allow either explicit per-side padding rules or shorthand padding value ordering
        expect(styles).toMatch(/padding-top: 16px|padding:\s*16px 24px 16px 24px/);
        expect(styles).toMatch(/padding-right: 24px|padding:\s*16px 24px 16px 24px/);
        expect(styles).toMatch(/padding-bottom: 16px|padding:\s*16px 24px 16px 24px/);
        expect(styles).toMatch(/padding-left: 24px|padding:\s*16px 24px 16px 24px/);
      });
    }

    if (config.supportsMargin !== false) {
      it('should generate responsive margin CSS', () => {
        const ComponentRender = config.componentRender;
        const propsWithMargin = {
          ...config.defaultProps,
          margin: {
            top: 8,
            right: 0,
            bottom: 8,
            left: 0,
            unit: 'px' as const,
          },
        };

        const { container } = renderPuckComponent(wrap()(<ComponentRender {...propsWithMargin} />));
        const styles = extractStyleTags(container).join('\n');

        // Allow either explicit per-side margin rules or shorthand margin value ordering
        expect(styles).toMatch(/margin-top: 8px|margin:\s*8px 0px 8px 0px/);
        expect(styles).toMatch(/margin-bottom: 8px|margin:\s*8px 0px 8px 0px/);
      });
    }
  });
}

/**
 * Run standard border and shadow tests
 */
export function runBorderShadowTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  const wrap = () => config.wrapRender || ((node: ReactElement) => node);

  describe('Border and Shadow', () => {
    if (config.supportsBorder !== false) {
      it('should apply border when configured', () => {
        const ComponentRender = config.componentRender;
        const propsWithBorder = {
          ...config.defaultProps,
          border: {
            style: 'solid' as const,
            width: 2,
            unit: 'px' as const,
            color: '#000000',
            radius: 8,
          },
        };

        const { container } = renderPuckComponent(wrap()(<ComponentRender {...propsWithBorder} />));
        const styles = extractStyleTags(container).join('\n');
        expect(styles).toContain('border');
        expect(styles).toContain('border-radius');
      });
    }

    if (config.supportsShadow !== false) {
      it('should apply shadow when configured', () => {
        const ComponentRender = config.componentRender;
        const propsWithShadow = {
          ...config.defaultProps,
          shadow: {
            preset: 'md' as const,
          },
        };

        const { container } = renderPuckComponent(wrap()(<ComponentRender {...propsWithShadow} />));
        const styles = extractStyleTags(container).join('\n');
        expect(styles).toContain('box-shadow');
      });
    }
  });
}

/**
 * Run all standard component tests
 * Use this as a starting point, then add component-specific tests
 */
export function runStandardComponentTests<TProps extends Record<string, unknown>>(config: BaseComponentTestConfig<TProps>) {
  runConfigurationTests(config);
  runRenderingTests(config);
  runStylingTests(config);
  runResponsiveTests(config);
  runBorderShadowTests(config);
}

/**
 * Helper to create test config with defaults
 */
export function createTestConfig<TProps extends Record<string, unknown>>(
  overrides: Partial<BaseComponentTestConfig<TProps>> &
    Pick<BaseComponentTestConfig<TProps>, 'componentConfig' | 'componentRender' | 'defaultProps' | 'className'>
): BaseComponentTestConfig<TProps> {
  return {
    supportsPadding: true,
    supportsMargin: true,
    supportsBorder: true,
    supportsShadow: true,
    allowedHardcodedValues: [],
    ...overrides,
  };
}

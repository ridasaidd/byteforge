import { generateVariablesCss, extractCssFromPuckData } from './PuckCssAggregator';
import type { Data } from '@puckeditor/core';
import type { ThemeData } from './PuckCssAggregator';

export type ThemeBuilderStep = 'settings' | 'header' | 'footer' | 'template';

export interface ThemeStepCssOptions {
  themeData?: ThemeData;
  puckData?: Data;
}

/**
 * Generates CSS for theme builder steps
 * Handles theme variables, layout, and typography extraction
 */
export function generateThemeStepCss(
  step: ThemeBuilderStep,
  options: ThemeStepCssOptions
): string {
  const { themeData, puckData } = options;

  switch (step) {
    case 'settings':
      // Settings step: generate CSS variables from theme data
      if (!themeData) {
        return '';
      }
      return generateVariablesCss(themeData);

    case 'header':
    case 'footer':
    case 'template':
      // Puck-based steps: extract CSS from Puck data
      // Pass includeVariables: false to avoid duplicating variables in section files
      if (!puckData) {
        return '';
      }
      return extractCssFromPuckData(puckData, themeData, false);

    default:
      throw new Error(`Unknown theme builder step: ${step}`);
  }
}

/**
 * Theme CSS Generator class for managing step-based CSS generation
 * Provides a stateful way to generate CSS with theme context
 */
export class ThemeStepCssGenerator {
  /**
   * Generate CSS for a theme builder step
   * @param step - The theme builder step (settings, header, footer, template)
   * @param themeData - Theme configuration data
   * @param puckData - Puck editor data
   * @returns CSS string for the step
   */
  generateCss(step: ThemeBuilderStep, themeData?: ThemeData, puckData?: Data): string {
    return generateThemeStepCss(step, { themeData, puckData });
  }

  /**
   * Generate CSS for settings step
   */
  generateSettingsCss(themeData: ThemeData): string {
    return generateThemeStepCss('settings', { themeData });
  }

  /**
   * Generate CSS for header step
   */
  generateHeaderCss(puckData: Data, themeData?: ThemeData): string {
    return generateThemeStepCss('header', { puckData, themeData });
  }

  /**
   * Generate CSS for footer step
   */
  generateFooterCss(puckData: Data, themeData?: ThemeData): string {
    return generateThemeStepCss('footer', { puckData, themeData });
  }

  /**
   * Generate CSS for template step
   */
  generateTemplateCss(puckData: Data, themeData?: ThemeData): string {
    return generateThemeStepCss('template', { puckData, themeData });
  }
}

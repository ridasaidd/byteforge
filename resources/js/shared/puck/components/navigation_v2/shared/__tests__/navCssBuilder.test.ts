import { describe, expect, it } from 'vitest';
import { buildNavCss, buildNavigationMenuCss } from '../navCssBuilder';

describe('navCssBuilder', () => {
  it('always emits structural navigation CSS', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
    });

    expect(css).toContain('.nav-menu-test .nav-items');
    expect(css).toContain('.nav-menu-test .nav-submenu');
    expect(css).toContain('.nav-menu-test .nav-toggle');
  });

  it('emits main item visual rules only when props are defined', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      itemColor: '#111111',
      itemHoverColor: '#222222',
      itemActiveColor: '#333333',
      itemActiveBackgroundColor: 'rgba(0,0,0,0.1)',
    });

    expect(css).toContain('color: #111111;');
    expect(css).toContain('.nav-menu-test .nav-link:hover');
    expect(css).toContain('color: #222222;');
    expect(css).toContain('.nav-menu-test .nav-link.is-active');
    expect(css).toContain('color: #333333;');
    expect(css).toContain('background-color: rgba(0,0,0,0.1);');
  });

  it('resolves token-based color props in aggregator wrapper export', () => {
    const css = buildNavigationMenuCss(
      {
        id: 'abc',
        props: {
          id: 'abc',
          itemColor: { type: 'theme', value: 'colors.primary.500' },
        },
      },
      (path) => (path === 'colors.primary.500' ? '#3b82f6' : '')
    );

    expect(css).toContain('.nav-menu-abc .nav-link');
    expect(css).toContain('color: #3b82f6;');
  });

  it('applies width control to mobile nav-items containers', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      width: { mobile: { value: '80', unit: '%' } },
    });

    expect(css).toContain('.nav-menu-test .nav-mobile-drawer .nav-items { width: 80%; }');
    expect(css).toContain('.nav-menu-test .nav-mobile-fullscreen .nav-items { width: 80%; }');
    expect(css).toContain('.nav-menu-test .nav-mobile-dropdown .nav-items { width: 80%; }');
  });

  it('applies dropdown min width to mobile dropdown container', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      mobileVariant: 'dropdown',
      dropdownMinWidth: { value: '320', unit: 'px' },
    });

    expect(css).toContain('.nav-menu-test .nav-mobile-dropdown');
    expect(css).toContain('min-width: 320px;');
  });

  it('supports responsive navigation background color', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      backgroundColor: {
        mobile: '#111111',
        desktop: 'transparent',
      },
    });

    expect(css).toContain('.nav-menu-test { background-color: #111111; }');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('background-color: transparent;');
  });

  it('does not fallback mobile dropdown background to root background color', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      backgroundColor: '#ff0000',
      mobileVariant: 'dropdown',
    });

    expect(css).toContain('.nav-menu-test .nav-mobile-dropdown');
    expect(css).toContain('background-color: inherit');
    expect(css).toContain('left: calc(50% - 50vw)');
  });

  it('applies typography fallback font family to nav links', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
    });

    expect(css).toContain('font-family: var(--font-family-sans, system-ui, sans-serif);');
  });

  it('generates @font-face and fallback stack for bundled menu font family', () => {
    const css = buildNavCss({
      className: 'nav-menu-test',
      fontFamily: 'Open Sans',
    });

    expect(css).toContain("@font-face");
    expect(css).toContain("font-family: 'Open Sans';");
    expect(css).toContain("src: url('/fonts/sans/OpenSans-Variable.woff2') format('woff2');");
    expect(css).toContain('font-family: "Open Sans", system-ui, sans-serif;');
  });
});

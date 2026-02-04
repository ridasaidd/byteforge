import { describe, it, expect } from 'vitest';
import { extractIconSvg, getAllIconNames } from '../extractIconSvg';

describe('extractIconSvg', () => {
  it('should extract SVG markup from a valid Lucide icon', () => {
    const svg = extractIconSvg('Star');

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should apply size parameter to SVG dimensions', () => {
    const svg = extractIconSvg('Heart', 32);

    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="32"');
  });

  it('should apply default size of 24 when not specified', () => {
    const svg = extractIconSvg('Star');

    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
  });

  it('should apply strokeWidth parameter', () => {
    const svg = extractIconSvg('Circle', 24, 3);

    expect(svg).toContain('stroke-width="3"');
  });

  it('should apply default strokeWidth of 2 when not specified', () => {
    const svg = extractIconSvg('Circle', 24);

    expect(svg).toContain('stroke-width="2"');
  });

  it('should throw error for invalid icon name', () => {
    expect(() => extractIconSvg('InvalidIconName')).toThrow(
      'Icon "InvalidIconName" not found in Lucide'
    );
  });

  it('should handle different Lucide icons correctly', () => {
    const icons = ['Star', 'Heart', 'Circle', 'Square', 'Triangle'];

    icons.forEach(iconName => {
      const svg = extractIconSvg(iconName);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  it('should generate valid XML/SVG markup', () => {
    const svg = extractIconSvg('Star');

    // Should be parseable as XML
    expect(() => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) {
        throw new Error('Invalid XML');
      }
    }).not.toThrow();
  });

  it('should include viewBox attribute', () => {
    const svg = extractIconSvg('Zap');

    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('should use currentColor for stroke', () => {
    const svg = extractIconSvg('Star');

    // Lucide icons typically use currentColor
    expect(svg).toContain('currentColor');
  });
});

describe('getAllIconNames', () => {
  it('should return an array of icon names', () => {
    const names = getAllIconNames();

    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(100); // Lucide has 1000+ icons
  });

  it('should include common icons', () => {
    const names = getAllIconNames();

    expect(names).toContain('Star');
    expect(names).toContain('Heart');
    expect(names).toContain('Circle');
    expect(names).toContain('Home');
    expect(names).toContain('Menu');
  });

  it('should return unique icon names', () => {
    const names = getAllIconNames();
    const uniqueNames = new Set(names);

    expect(names.length).toBe(uniqueNames.size);
  });

  it('should return alphabetically sorted names', () => {
    const names = getAllIconNames();
    const sortedNames = [...names].sort();

    expect(names).toEqual(sortedNames);
  });

  it('should not include non-icon exports from Lucide', () => {
    const names = getAllIconNames();

    // These are utility exports, not icons
    expect(names).not.toContain('createLucideIcon');
    expect(names).not.toContain('default');
  });
});

import { describe, it, expect } from 'vitest';
import { cn } from '../utils/cn';

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const condition1 = true;
    const condition2 = false;
    const result = cn('base-class', condition1 && 'conditional-class', condition2 && 'hidden-class');
    expect(result).toContain('base-class');
    expect(result).toContain('conditional-class');
    expect(result).not.toContain('hidden-class');
  });

  it('should override conflicting Tailwind classes', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'other');
    expect(result).toBe('base other');
  });
});

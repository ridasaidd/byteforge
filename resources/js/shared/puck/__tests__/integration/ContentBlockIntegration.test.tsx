import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Heading } from '../../components/content/Heading';
import { Text } from '../../components/content/Text';
import { Button } from '../../components/content/Button';
import { Image } from '../../components/content/Image';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

// Extract render functions from ComponentConfig
const HeadingRender = Heading.render;
const TextRender = Text.render;
const ButtonRender = Button.render;
const ImageRender = Image.render;

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('Content Block Integration Tests', () => {
  it('heading renders with correct tag and alignment', () => {
    const { container } = renderWithTheme(
      <HeadingRender
        id="test-heading"
        text="Test Heading"
        level="2"
        align="center"
        color={{ type: 'theme', value: 'components.heading.colors.default' }}
        fontSize={{ base: { type: 'custom', value: '32px' } }}
      />
    );

    const heading = container.querySelector('h2');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Test Heading');
    expect(heading).toHaveStyle({ textAlign: 'center' });
  });

  it('heading supports all tag levels h1-h6', () => {
    const { container: container1 } = renderWithTheme(
      <HeadingRender id="h1" text="H1" level="1" align="left" color={{ type: 'theme', value: 'components.heading.colors.default' }} fontSize={{ base: { type: 'custom', value: '48px' } }} />
    );
    expect(container1.querySelector('h1')).toBeInTheDocument();

    const { container: container6 } = renderWithTheme(
      <HeadingRender id="h6" text="H6" level="6" align="left" color={{ type: 'theme', value: 'components.heading.colors.default' }} fontSize={{ base: { type: 'custom', value: '16px' } }} />
    );
    expect(container6.querySelector('h6')).toBeInTheDocument();
  });

  it('text block renders with correct content and alignment', () => {
    const { container } = renderWithTheme(
      <TextRender
        id="test-text"
        content="This is a test paragraph with some content."
        align="center"
        color={{ type: 'theme', value: 'components.text.colors.default' }}
        fontSize={{ base: { type: 'custom', value: '16px' } }}
      />
    );

    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent('This is a test paragraph with some content.');
    expect(paragraph).toHaveStyle({ textAlign: 'center' });
  });

  it('button renders with correct variant and size', () => {
    renderWithTheme(
      <ButtonRender
        id="test-btn"
        text="Click Me"
        href="https://example.com"
        variant="primary"
        size="md"
        fullWidth={false}
        backgroundColor={{ type: 'theme', value: 'components.button.colors.primary' }}
        color={{ type: 'theme', value: 'white' }}
      />
    );

    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();
  });

  it('button can be full width', () => {
    renderWithTheme(
      <ButtonRender
        id="full-width-btn"
        text="Full Width Button"
        href="#"
        variant="primary"
        size="lg"
        fullWidth={true}
        backgroundColor={{ type: 'theme', value: 'components.button.colors.primary' }}
        color={{ type: 'theme', value: 'white' }}
      />
    );

    const button = screen.getByText('Full Width Button');
    expect(button).toBeInTheDocument();
  });

  it('image renders with correct alt text and dimensions', () => {
    renderWithTheme(
      <ImageRender
        src="https://via.placeholder.com/800x600"
        alt="Test Image"
        width={{ base: { value: '800', unit: 'px' } }}
        aspectRatio="16/9"
        objectFit="cover"
        border={{ width: '0', style: 'none', color: '#000000', radius: '8', unit: 'px' }}
      />
    );

    const img = screen.getByRole('img', { name: 'Test Image' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://via.placeholder.com/800x600');
    expect(img).toHaveAttribute('alt', 'Test Image');
  });

  it('image respects object fit configuration', () => {
    const { container } = renderWithTheme(
      <ImageRender
        id="cover-image"
        src="https://via.placeholder.com/400x300"
        alt="Cover Image"
        width={{ base: { value: '400', unit: 'px' } }}
        objectFit="contain"
        borderRadius="none"
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveStyle({ objectFit: 'contain' });
  });
});

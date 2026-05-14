import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FormComponent from '../components/forms/Form';
import { useFormContext } from '../components/forms/FormContext';

function getJsonRequestBody(): Record<string, unknown> {
  const requestInit = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
  const body = requestInit?.body;

  if (typeof body !== 'string') {
    throw new Error('Expected fetch body to be a JSON string.');
  }

  return JSON.parse(body) as Record<string, unknown>;
}

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    resolve: (_token: string, fallback: string) => fallback,
  }),
  usePuckEditMode: () => false,
}));

function TestFields() {
  const formContext = useFormContext();

  if (!formContext) {
    return null;
  }

  return (
    <>
      <input
        aria-label="Name"
        onChange={(event) => formContext.setValue('name', event.target.value)}
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await formContext.submit();
          } catch {
            // Form state assertions cover the error path.
          }
        }}
      >
        Submit
      </button>
    </>
  );
}

describe('Form block', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the configured success message after a successful email submission', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    render(
      <FormComponent.render
        id="contact"
        formFields={TestFields}
        formName="Contact Form"
        submitAction="email"
        emailTo="contact@example.com"
        webhookUrl=""
        successMessage="Thanks, we received your message."
        errorMessage="Submission failed."
        gap="16"
        direction="column"
        justify="start"
        align="stretch"
        backgroundColor={{ type: 'theme', value: 'transparent' }}
        padding={{ mobile: { top: '24', right: '24', bottom: '24', left: '24', unit: 'px', linked: true } }}
        margin={{ mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } }}
      />
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/form-submit/email', expect.objectContaining({
        method: 'POST',
      }));
    });

    expect(getJsonRequestBody()).toMatchObject({
      website: '',
    });

    expect(await screen.findByText('Thanks, we received your message.')).toBeInTheDocument();
  });

  it('shows the configured error message after a failed email submission', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    render(
      <FormComponent.render
        id="contact"
        formFields={TestFields}
        formName="Contact Form"
        submitAction="email"
        emailTo="contact@example.com"
        webhookUrl=""
        successMessage="Thanks, we received your message."
        errorMessage="Submission failed."
        gap="16"
        direction="column"
        justify="start"
        align="stretch"
        backgroundColor={{ type: 'theme', value: 'transparent' }}
        padding={{ mobile: { top: '24', right: '24', bottom: '24', left: '24', unit: 'px', linked: true } }}
        margin={{ mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true } }}
      />
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(getJsonRequestBody()).toMatchObject({
      website: '',
    });

    expect(await screen.findByText('Submission failed.')).toBeInTheDocument();
  });
});

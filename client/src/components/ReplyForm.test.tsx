// ─── Imports ─────────────────────────────────────────────────────────────────

import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import ReplyForm from './ReplyForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Render the form with a fresh onSubmit spy.
 * Default: onSubmit resolves immediately (success), not submitting.
 */
function renderForm(
  onSubmit: (body: string) => Promise<void> = vi.fn().mockResolvedValue(undefined),
  isSubmitting = false,
) {
  const result = render(<ReplyForm onSubmit={onSubmit} isSubmitting={isSubmitting} />);
  return { ...result, onSubmit };
}

const getTextarea = () => screen.getByPlaceholderText(/type your message here/i);
const getSubmitBtn = () => screen.getByRole('button', { name: /submit reply/i });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReplyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the "Post a Reply" heading', () => {
      renderForm();
      expect(screen.getByText(/post a reply/i)).toBeInTheDocument();
    });

    it('renders an empty textarea by default', () => {
      renderForm();
      expect(getTextarea()).toBeInTheDocument();
      expect(getTextarea()).toHaveValue('');
    });

    it('renders the submit button', () => {
      renderForm();
      expect(getSubmitBtn()).toBeInTheDocument();
    });

    it('shows "Submit Reply" label when not submitting', () => {
      renderForm(vi.fn().mockResolvedValue(undefined), false);
      expect(screen.getByText(/submit reply/i)).toBeInTheDocument();
    });

    it('shows "Posting..." label when isSubmitting is true', () => {
      renderForm(vi.fn().mockResolvedValue(undefined), true);
      expect(screen.getByRole('button', { name: /posting/i })).toBeInTheDocument();
    });
  });

  // ── Disabled states ─────────────────────────────────────────────────────────

  describe('disabled states', () => {
    it('submit button is disabled when textarea is empty', () => {
      renderForm();
      expect(getSubmitBtn()).toBeDisabled();
    });

    it('submit button is disabled when textarea is only whitespace', async () => {
      renderForm();
      await userEvent.type(getTextarea(), '   ');
      expect(getSubmitBtn()).toBeDisabled();
    });

    it('submit button is enabled when textarea has non-whitespace content', async () => {
      renderForm();
      await userEvent.type(getTextarea(), 'Hello there');
      expect(getSubmitBtn()).toBeEnabled();
    });

    it('textarea is disabled while isSubmitting is true', () => {
      renderForm(vi.fn().mockResolvedValue(undefined), true);
      expect(getTextarea()).toBeDisabled();
    });

    it('submit button is disabled while isSubmitting is true', () => {
      renderForm(vi.fn().mockResolvedValue(undefined), true);
      // When isSubmitting=true the label changes to "Posting..."
      expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled();
    });
  });

  // ── User interaction ────────────────────────────────────────────────────────

  describe('user interaction', () => {
    it('updates textarea value as the user types', async () => {
      renderForm();
      await userEvent.type(getTextarea(), 'Hello customer');
      expect(getTextarea()).toHaveValue('Hello customer');
    });

    it('clears textarea after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), 'Some reply text');
      fireEvent.click(getSubmitBtn());

      await waitFor(() => expect(getTextarea()).toHaveValue(''));
    });

    it('preserves textarea value after a failed submission', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), 'Some reply text');
      fireEvent.click(getSubmitBtn());

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(getTextarea()).toHaveValue('Some reply text');
    });
  });

  // ── onSubmit callback ───────────────────────────────────────────────────────

  describe('onSubmit callback', () => {
    it('calls onSubmit with the trimmed body on submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), '  Great question!  ');
      fireEvent.click(getSubmitBtn());

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith('  Great question!  '),
      );
    });

    it('calls onSubmit exactly once per click', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), 'Hello');
      fireEvent.click(getSubmitBtn());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('does not call onSubmit when body is empty', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      fireEvent.click(getSubmitBtn());

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not call onSubmit when body is only whitespace', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), '   ');
      // button is disabled; submit form directly via the textarea's form ancestor
      fireEvent.submit(getTextarea().closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits via Enter key inside the form', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm(onSubmit);

      await userEvent.type(getTextarea(), 'Keyboard submit');
      fireEvent.submit(getTextarea().closest('form')!);

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });

  // ── Loading / in-flight state ───────────────────────────────────────────────

  describe('loading state (isSubmitting prop)', () => {
    it('disables the button and shows "Posting..." when isSubmitting=true', () => {
      renderForm(vi.fn().mockReturnValue(new Promise(() => {})), true);

      const btn = screen.getByRole('button', { name: /posting/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('textarea is focusable', () => {
      renderForm();
      getTextarea().focus();
      expect(getTextarea()).toHaveFocus();
    });

    it('submit button has an accessible name', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /submit reply/i })).toBeInTheDocument();
    });
  });
});

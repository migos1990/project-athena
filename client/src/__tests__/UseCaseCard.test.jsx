import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UseCaseCard } from '../components/UseCaseCard';

describe('UseCaseCard — pending state', () => {
  it('renders the card title in pending state', () => {
    render(<UseCaseCard title="MFA Login" completed={false} />);
    expect(screen.getByText('MFA Login')).toBeInTheDocument();
  });

  it('is visually dimmed (opacity-50 class) when pending', () => {
    const { container } = render(<UseCaseCard title="MFA" completed={false} />);
    expect(container.firstChild).toHaveClass('opacity-50');
  });

  it('does not show a checkmark when pending', () => {
    const { container } = render(<UseCaseCard completed={false} />);
    // The green checkmark circle only appears in completed state
    const checkmarkCircle = container.querySelector('.bg-okta-success');
    expect(checkmarkCircle).toBeNull();
  });
});

describe('UseCaseCard — completed state', () => {
  const baseProps = {
    completed: true,
    title: 'MFA Login',
    description: 'Step-up authentication',
    data: {
      userName: 'John Doe',
      userEmail: 'john@acme.com',
      timestamp: new Date('2026-01-01T12:00:00Z').toISOString(),
      outcome: 'SUCCESS'
    }
  };

  it('shows the green checkmark when completed', () => {
    const { container } = render(<UseCaseCard {...baseProps} />);
    const checkmark = container.querySelector('.bg-okta-success');
    expect(checkmark).not.toBeNull();
  });

  it('renders user name and email from event data', () => {
    render(<UseCaseCard {...baseProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('(john@acme.com)')).toBeInTheDocument();
  });

  it('renders SUCCESS outcome badge', () => {
    render(<UseCaseCard {...baseProps} />);
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('shows AI loading state when completed but no narrative yet', () => {
    render(<UseCaseCard {...baseProps} generatedContent={null} />);
    expect(screen.getByText(/Analyzing event with Claude AI/i)).toBeInTheDocument();
  });

  it('uses Claude-generated title when generatedContent is provided', () => {
    render(
      <UseCaseCard
        {...baseProps}
        generatedContent={{
          cardTitle: 'AI Title',
          cardDescription: 'AI Description',
          narrative: 'Short narrative.',
          businessOutcomes: []
        }}
      />
    );
    expect(screen.getByText('AI Title')).toBeInTheDocument();
  });

  it('shows the narrative text when generatedContent has narrative', async () => {
    render(
      <UseCaseCard
        {...baseProps}
        generatedContent={{
          cardTitle: 'MFA Login',
          narrative: 'User logged in with MFA.',
          businessOutcomes: []
        }}
      />
    );
    // The narrative may be displayed via typewriter — wait for it
    await waitFor(() => {
      expect(screen.getByText(/User logged in with MFA\./)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows business outcomes when generatedContent includes them', async () => {
    render(
      <UseCaseCard
        {...baseProps}
        generatedContent={{
          cardTitle: 'MFA Login',
          narrative: 'x',
          businessOutcomes: [
            { icon: '🔒', category: 'Security', description: 'Reduced risk' }
          ]
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Security:')).toBeInTheDocument();
      expect(screen.getByText('Reduced risk')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe('UseCaseCard — Raw Logs toggle', () => {
  const props = {
    completed: true,
    data: { userName: 'Alice', userEmail: 'alice@test.com', timestamp: new Date().toISOString(), outcome: 'SUCCESS' }
  };

  it('does not show raw JSON initially', () => {
    render(<UseCaseCard {...props} />);
    expect(screen.queryByRole('code')).toBeNull();
  });

  it('expands raw logs when the button is clicked', () => {
    const { container } = render(<UseCaseCard {...props} />);
    fireEvent.click(screen.getByText('Raw Logs'));
    // The raw <pre> element should now be visible in the DOM
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre.textContent).toContain('alice@test.com');
  });

  it('collapses raw logs on second click', () => {
    render(<UseCaseCard {...props} />);
    const btn = screen.getByText('Raw Logs');
    fireEvent.click(btn);
    fireEvent.click(btn);
    // After collapse, the pre element should be gone
    expect(screen.queryByText(/"alice@test\.com"/)).toBeNull();
  });
});

describe('UseCaseCard — reset behaviour', () => {
  it('resets to pending state when completed transitions to false', () => {
    const { rerender, container } = render(
      <UseCaseCard completed={true} data={{ userName: 'Bob', userEmail: 'b@b.com', timestamp: new Date().toISOString(), outcome: 'SUCCESS' }} />
    );
    expect(container.querySelector('.bg-okta-success')).not.toBeNull();

    rerender(<UseCaseCard completed={false} />);
    expect(container.querySelector('.bg-okta-success')).toBeNull();
    expect(container.firstChild).toHaveClass('opacity-50');
  });
});

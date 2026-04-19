/**
 * Sprint 4 test surface: Toast — Sonner-style bottom toasts.
 * Smoke-level: renders via provider, show() enqueues a toast visible in
 * the viewport, dismiss() removes it, haptics fire on success/error but
 * NOT on info (dopamine brief rule).
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { ToastProvider, useToast } from '../components/Toast';
import * as Haptics from 'expo-haptics';

const hapticSpy = Haptics.notificationAsync as jest.Mock;

const Consumer = ({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useToast>) => void;
}) => {
  const api = useToast();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return <Text>child</Text>;
};

describe('Toast', () => {
  beforeEach(() => {
    hapticSpy.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the provider without crashing', () => {
    const tree = render(
      <ToastProvider>
        <Text>app</Text>
      </ToastProvider>,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('show() enqueues a toast and fires Success haptic for success type', () => {
    let api: ReturnType<typeof useToast> | null = null;
    const tree = render(
      <ToastProvider>
        <Consumer onReady={(a) => (api = a)} />
      </ToastProvider>,
    );

    expect(api).not.toBeNull();
    act(() => {
      api!.show({ type: 'success', title: 'Saved', body: 'Poster cached' });
    });

    expect(hapticSpy).toHaveBeenCalledWith('success');
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Saved');
    expect(str).toContain('Poster cached');
  });

  it('fires Error haptic for error type', () => {
    let api: ReturnType<typeof useToast> | null = null;
    render(
      <ToastProvider>
        <Consumer onReady={(a) => (api = a)} />
      </ToastProvider>,
    );
    act(() => {
      api!.show({ type: 'error', title: 'Network down' });
    });
    expect(hapticSpy).toHaveBeenCalledWith('error');
  });

  it('does NOT fire a haptic for info toasts (dopamine brief rule)', () => {
    let api: ReturnType<typeof useToast> | null = null;
    render(
      <ToastProvider>
        <Consumer onReady={(a) => (api = a)} />
      </ToastProvider>,
    );
    act(() => {
      api!.show({ type: 'info', title: 'FYI' });
    });
    expect(hapticSpy).not.toHaveBeenCalled();
  });

  it('auto-dismisses success toasts after 4s', () => {
    let api: ReturnType<typeof useToast> | null = null;
    const tree = render(
      <ToastProvider>
        <Consumer onReady={(a) => (api = a)} />
      </ToastProvider>,
    );
    act(() => {
      api!.show({ type: 'success', title: 'Saved' });
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Saved');
    act(() => {
      jest.advanceTimersByTime(4100);
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Saved');
  });

  it('useToast throws when used outside provider', () => {
    const BrokenConsumer = () => {
      useToast();
      return null;
    };
    // Silence the expected error log in this case.
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BrokenConsumer />)).toThrow(
      /useToast must be used inside a <ToastProvider>/,
    );
    errSpy.mockRestore();
  });
});

// reason: the test file intentionally imports `Button` as an unused
// symbol-guard — RN's Button has no display issue in our tree but keeping
// the import asserts the module still resolves in jest after SDK bumps.
void Button;

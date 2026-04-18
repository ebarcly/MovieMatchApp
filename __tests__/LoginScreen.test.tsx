/**
 * Sprint 3 test surface: LoginScreen auth submit path.
 *
 * - fires signInWithEmailAndPassword once on submit
 * - renders an error on rejection
 * - ignores the second tap while the first is in-flight (Sprint 2 BUG-8)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import * as firebaseAuth from 'firebase/auth';

const mockedSignIn = firebaseAuth.signInWithEmailAndPassword as jest.Mock;

const makeNav = () =>
  ({
    navigate: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getParent: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    reset: jest.fn(),
    // reason: loose nav stub — screen never touches untested nav methods.
  }) as unknown as import('@react-navigation/stack').StackNavigationProp<
    import('../navigation/types').AuthStackParamList,
    'Login'
  >;

const makeRoute = () =>
  ({ key: 'Login', name: 'Login', params: undefined }) as never;

describe('LoginScreen', () => {
  beforeEach(() => {
    mockedSignIn.mockReset();
  });

  it('fires signInWithEmailAndPassword on Log In tap', async () => {
    mockedSignIn.mockResolvedValueOnce({ user: { uid: 'u1' } });
    const { getByPlaceholderText, getByLabelText } = render(
      <LoginScreen navigation={makeNav()} route={makeRoute()} />,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your E-mail'), 'a@b.co');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'pw');
    await act(async () => {
      fireEvent.press(getByLabelText('Log In'));
    });

    expect(mockedSignIn).toHaveBeenCalledTimes(1);
    expect(mockedSignIn).toHaveBeenCalledWith(
      expect.anything(),
      'a@b.co',
      'pw',
    );
  });

  it('renders the Firebase error message when sign-in rejects', async () => {
    mockedSignIn.mockRejectedValueOnce(new Error('INVALID_CREDENTIAL'));
    const { getByPlaceholderText, getByLabelText, findByText } = render(
      <LoginScreen navigation={makeNav()} route={makeRoute()} />,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your E-mail'), 'a@b.co');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'bad');
    await act(async () => {
      fireEvent.press(getByLabelText('Log In'));
    });

    const errorNode = await findByText('INVALID_CREDENTIAL');
    expect(errorNode).toBeTruthy();
  });

  it('ignores a double-tap while the first submit is in-flight (BUG-8)', async () => {
    let resolveSignIn: ((v: unknown) => void) | undefined;
    mockedSignIn.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    const { getByPlaceholderText, getByLabelText } = render(
      <LoginScreen navigation={makeNav()} route={makeRoute()} />,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your E-mail'), 'a@b.co');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'pw');

    await act(async () => {
      fireEvent.press(getByLabelText('Log In'));
    });
    // Second tap while first is still pending — should NOT fire sign-in again.
    await act(async () => {
      fireEvent.press(getByLabelText('Log In'));
    });

    expect(mockedSignIn).toHaveBeenCalledTimes(1);

    // Clean-up: resolve the in-flight promise so the component unmounts cleanly.
    if (resolveSignIn) resolveSignIn({ user: { uid: 'u1' } });
    await waitFor(() => expect(mockedSignIn).toHaveBeenCalledTimes(1));
  });
});

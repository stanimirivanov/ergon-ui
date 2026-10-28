import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import {
  followUpNotificationTargetApi,
  type ResolverFollowUpCaseSummaryResult,
} from '@ergon/follow-up-data-access-web';
import { FollowUpNotificationTarget } from '../src';
import { resolverFollowUpCaseSummary } from './follow-up-fixtures';

afterEach(cleanup);
it('discloses freshly checked read-only context and withdraws it during a failed recheck', async () => {
  const workItemId = '11111111-1111-4111-8111-111111111111';
  const query = {
    tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
    actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
    workItemId,
  };
  let finish: (value: ResolverFollowUpCaseSummaryResult) => void = () =>
    undefined;
  const read = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      summary: resolverFollowUpCaseSummary(
        workItemId,
        'PRIVATE-CHECKED-CONTEXT',
      ),
    })
    .mockImplementation(
      () =>
        new Promise<ResolverFollowUpCaseSummaryResult>((resolve) => {
          finish = resolve;
        }),
    );
  const store = configureStore({
    reducer: {
      [followUpNotificationTargetApi.reducerPath]:
        followUpNotificationTargetApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { followUpNotificationTarget: { read } } },
      }).concat(followUpNotificationTargetApi.middleware),
  });
  const view = render(
    <Provider store={store}>
      <FollowUpNotificationTarget query={query} signInHref="/bff/login" />
    </Provider>,
  );
  await screen.findByText(/Independently checked, read-only case context/);
  expect(
    screen.queryByRole('button', { name: /Claim|Authorize|Execute/ }),
  ).toBeNull();
  let request: Promise<unknown> = Promise.resolve();
  await act(async () => {
    request = store.dispatch(
      followUpNotificationTargetApi.endpoints.current.initiate(query, {
        forceRefetch: true,
      }),
    );
  });
  await screen.findByText('Checking current work access…');
  expect(
    screen.queryByText(/Independently checked, read-only case context/),
  ).toBeNull();
  await act(async () => {
    finish({ ok: false, error: { kind: 'not-found' } });
    await request;
  });
  expect((await screen.findByRole('alert')).textContent).toContain(
    'cannot restore ownership',
  );
  view.unmount();
  store.dispatch(followUpNotificationTargetApi.util.resetApiState());
});

import { configureStore } from '@reduxjs/toolkit';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import {
  notificationApi,
  type NotificationQuery,
  type NotificationResult,
} from '@ergon/notifications-data-access-web';
import { NotificationFeed } from '../src';

afterEach(cleanup);
const query: NotificationQuery = {
  tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
  audience: 'requester',
};
const item = {
  kind: 'INFORMATION_REQUESTED' as const,
  sourceId: query.actorId,
  target: { kind: 'REQUESTER_CASE' as const, id: query.tenantId },
  deliveredAt: '2026-10-28T09:00:00Z',
};

it('withdraws a cached list during revalidation and keeps failures distinct from an empty feed', async () => {
  let finish: (result: NotificationResult) => void = () => undefined;
  const read = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      page: { items: [item], truncated: false },
    })
    .mockImplementation(
      () =>
        new Promise<NotificationResult>((resolve) => {
          finish = resolve;
        }),
    );
  const store = configureStore({
    reducer: { [notificationApi.reducerPath]: notificationApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { notificationsClient: { read } } },
      }).concat(notificationApi.middleware),
  });
  const open = vi.fn(),
    recheck = vi.fn();
  const view = render(
    <Provider store={store}>
      <NotificationFeed
        query={query}
        signInHref="/bff/login"
        onRecheck={recheck}
        onOpen={open}
      />
    </Provider>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: /Check current access to case/ }),
  );
  expect(open).toHaveBeenCalledWith(item);
  fireEvent.click(
    screen.getByRole('button', { name: 'Recheck notifications' }),
  );
  expect(recheck).toHaveBeenCalledTimes(1);
  let request: Promise<unknown> = Promise.resolve();
  await act(async () => {
    request = store.dispatch(
      notificationApi.endpoints.recent.initiate(query, { forceRefetch: true }),
    );
  });
  await screen.findByText('Checking notifications…');
  expect(
    screen.queryByRole('button', { name: /Check current access to case/ }),
  ).toBeNull();
  await act(async () => {
    finish({ ok: false, error: { kind: 'forbidden' } });
    await request;
  });
  expect((await screen.findByRole('alert')).textContent).toContain(
    'not an empty feed',
  );
  expect(screen.queryByText(/No recent deliveries/)).toBeNull();
  view.unmount();
  store.dispatch(notificationApi.util.resetApiState());
});

it('describes a checked empty feed without implying that no work remains', async () => {
  const store = configureStore({
    reducer: { [notificationApi.reducerPath]: notificationApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            notificationsClient: {
              read: async () => ({
                ok: true,
                page: { items: [], truncated: false },
              }),
            },
          },
        },
      }).concat(notificationApi.middleware),
  });
  const view = render(
    <Provider store={store}>
      <NotificationFeed
        query={query}
        signInHref="/bff/login"
        onRecheck={() => undefined}
        onOpen={() => undefined}
      />
    </Provider>,
  );
  expect(
    (await screen.findByText(/No recent deliveries/)).textContent,
  ).toContain('does not prove');
  view.unmount();
  store.dispatch(notificationApi.util.resetApiState());
});

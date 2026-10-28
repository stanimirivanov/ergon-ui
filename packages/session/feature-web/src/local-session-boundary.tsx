import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  createLocalLogoutClient,
  createPrivateSessionTransport,
  normalizeLocalLogoutResult,
  type LocalLogoutClient,
  type LocalLogoutResult,
} from '@ergon/session-data-access-web';

export type LocalSignOutState =
  { readonly kind: 'pending' } | LocalLogoutResult;
interface SessionContext {
  readonly fetch: typeof globalThis.fetch;
  readonly signOut: () => void;
}
const Session = createContext<SessionContext | undefined>(undefined);
/** App composition must enclose private clients in LocalSessionBoundary. Missing composition is a programming error, never an unscoped transport fallback. */
export function usePrivateSessionFetch(): typeof globalThis.fetch {
  const session = useContext(Session);
  if (session === undefined)
    throw new Error('Private session boundary is required');
  return session.fetch;
}
export function useLocalSignOut(): (() => void) | undefined {
  return useContext(Session)?.signOut;
}

/**
 * One mounted document lifetime. Confirmation replaces the complete private subtree
 * before the post-commit execution starts. Failed logout never reopens children.
 * The app owns cache teardown, outer status layout and a trusted tenant-only login
 * target. Retry is explicit and starts fresh CSRF; StrictMode never replays writes.
 */
export function LocalSessionBoundary({
  children,
  fetch,
  signInHrefForCurrentLocation,
  renderRetired,
  client,
}: {
  readonly children: ReactNode;
  readonly fetch: typeof globalThis.fetch;
  readonly signInHrefForCurrentLocation: () => string | undefined;
  readonly renderRetired: (
    state: LocalSignOutState,
    retry: () => void,
    signInHref: string | undefined,
  ) => ReactNode;
  /** Optional safe boundary injection for tests; production binds the base transport outside private scope. */
  readonly client?: LocalLogoutClient;
}): ReactElement {
  const [scope] = useState(() => createPrivateSessionTransport(fetch));
  const [logout] = useState(() => client ?? createLocalLogoutClient({ fetch }));
  const [exit, setExit] = useState<{
    readonly attempt: number;
    readonly state: LocalSignOutState;
    readonly signInHref: string | undefined;
  }>();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) scope.retire();
      });
    };
  }, [scope]);
  useEffect(() => {
    if (exit?.state.kind !== 'pending') return;
    let current = true;
    const controller = new AbortController();
    // Child teardown queues cache retirement before this microtask. Defer the
    // first invocation through effect replay and require the retired DOM commit.
    queueMicrotask(() => {
      if (!current) return;
      scope.retire();
      void Promise.resolve()
        .then(() => logout.logout(controller.signal))
        .then(normalizeLocalLogoutResult)
        .catch((): LocalLogoutResult => ({
          kind: 'failed',
          failure: 'unexpected-defect',
        }))
        .then((state) => {
          if (current) setExit({ ...exit, state });
        });
    });
    return () => {
      current = false;
      controller.abort();
    };
  }, [exit, logout, scope]);
  if (exit !== undefined)
    return (
      <>
        {renderRetired(
          exit.state,
          () => {
            if (exit.state.kind === 'failed')
              setExit({
                ...exit,
                attempt: exit.attempt + 1,
                state: { kind: 'pending' },
              });
          },
          exit.signInHref,
        )}
      </>
    );
  return (
    <Session.Provider
      value={{
        fetch: scope.fetch,
        signOut: () =>
          setExit({
            attempt: 0,
            state: { kind: 'pending' },
            signInHref: signInHrefForCurrentLocation(),
          }),
      }}
    >
      {children}
    </Session.Provider>
  );
}

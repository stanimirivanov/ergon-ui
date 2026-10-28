import { Provider } from 'react-redux';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { usePrivateSessionFetch } from '@ergon/session-feature-web';

import { createBrowserWorkbenchScope } from '../app/browser-dependencies';
import { CurrentActorPage } from './current-actor-page';

/**
 * Mounts the tenant workbench with one stable store and dependency graph.
 * The session feature composed by the page remains fail-closed before resolver
 * data is rendered.
 */
export function CurrentActorRoute(): ReactElement {
  const fetch = usePrivateSessionFetch();
  const [scope] = useState(() => createBrowserWorkbenchScope(fetch));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Unsubscribe before reset and tolerate development effect replay. The
      // root exit gate queues logout only after this resource retirement.
      queueMicrotask(() => {
        if (!mounted.current) scope.dispose();
      });
    };
  }, [scope]);
  return (
    <Provider store={scope.store}>
      <CurrentActorPage />
    </Provider>
  );
}

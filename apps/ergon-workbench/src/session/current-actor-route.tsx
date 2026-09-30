import { Provider } from 'react-redux';

import { browserDependencies } from '../app/browser-dependencies';
import { createWorkbenchStore } from '../app/store';
import { CurrentActorPage } from './current-actor-page';

const store = createWorkbenchStore(browserDependencies);

/**
 * Mounts the tenant workbench with one stable store and dependency graph.
 * The session feature composed by the page remains fail-closed before resolver
 * data is rendered.
 */
export function CurrentActorRoute() {
  return (
    <Provider store={store}>
      <CurrentActorPage />
    </Provider>
  );
}

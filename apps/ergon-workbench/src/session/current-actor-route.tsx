import { Provider } from 'react-redux';

import { browserDependencies } from '../app/browser-dependencies';
import { createWorkbenchStore } from '../app/store';
import { CurrentActorPage } from './current-actor-page';

const store = createWorkbenchStore(browserDependencies);

export function CurrentActorRoute() {
  return (
    <Provider store={store}>
      <CurrentActorPage />
    </Provider>
  );
}

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { WorkbenchApplication } from './app/workbench-application';

import { router } from './app/router';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <WorkbenchApplication
      router={router}
      fetch={globalThis.fetch.bind(globalThis)}
    />
  </StrictMode>,
);

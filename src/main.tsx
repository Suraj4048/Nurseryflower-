import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { APP } from './config';
import { DemoGate, Toaster } from './components/ui';
import { registerServiceWorker } from './integrations/push';
import './lib/locales_more';
import './lib/locales_p3';
import ShowroomApp from './apps/showroom/App';
import PartnerApp from './apps/partner/App';
import OfficeApp from './apps/office/App';

const Root = APP === 'partner' ? PartnerApp : APP === 'office' ? OfficeApp : ShowroomApp;
const base = APP === 'partner' ? '/partner/' : APP === 'office' ? '/office/' : '/';
registerServiceWorker(base, base + 'sw.js');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoGate>
      <HashRouter>
        <Root />
      </HashRouter>
      <Toaster />
    </DemoGate>
  </React.StrictMode>,
);

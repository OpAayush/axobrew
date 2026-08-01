import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso';
import Home from './pages/Home.jsx';
import ModuleManager, { AddModule } from './pages/ModuleManager.jsx';
import Header from './components/Header.jsx';
import { GlobalStateContext } from './components/ClientContext.jsx';
import { useEffect, useState, useContext } from 'react';
import Client from './components/WebSocketClient.js';
import Settings, { Change } from './pages/Settings.jsx';
import About from './pages/About.jsx';
import './components/i18n.js';
import UserAgentSettings from './pages/UserAgentSettings.jsx';
import LanguageSettings from './pages/LanguageSettings.jsx';
import DevServerSettings from './pages/DevServerSettings.jsx';
import { ExclamationCircleIcon } from '@heroicons/react/16/solid';
import { useTranslation } from 'react-i18next';

export default function App() {
  const context = useContext(GlobalStateContext);
  const { t } = useTranslation();
  window.dispatch = context.dispatch;
  window.state = context.state;

  useEffect(() => {
    if (context.state.sharedData.error.disappear) {
      setTimeout(() => {
        context.dispatch({
          type: 'SET_ERROR',
          payload: {
            message: null,
            disappear: false
          }
        });
      }, 5000);
    }
  }, [context.state.sharedData.error.disappear]);

  useEffect(() => {
    if (!window.setClient) {
      startService(context);
      window.setClient = true;
    }
  }, []);


  return (
    <ErrorBoundary>
      <LocationProvider>
        <div className="flex flex-col h-[calc(var(--uh)*100)] overflow-hidden">
          <Header />
          <div className="flex-1 min-h-0 overflow-y-auto text-white">
            <div className={`flex justify-center ${!context.state.sharedData.error.message ? 'hidden' : ''}`}>
              <div class="flex items-center gap-4 mx-8 mt-6 px-6 py-4 rounded-xl bg-red-950/70 ring-1 ring-red-500/30 text-red-300" role="alert">
                <ExclamationCircleIcon className="h-[calc(var(--uh)*4)] w-[calc(var(--uh)*4)] shrink-0" />
                <div>
                  <span class="text-2xl">{t(context.state.sharedData.error.message, context.state.sharedData.error.args)}</span>
                </div>
              </div>
            </div>
            <Router>
              <Route component={Home} path="/axobrew-ui/dist/index.html" />
              <Route component={ModuleManager} path="/axobrew-ui/dist/index.html/module-manager" />
              <Route component={AddModule} path="/axobrew-ui/dist/index.html/module-manager/add" />
              <Route component={Settings} path="/axobrew-ui/dist/index.html/settings" />
              <Route component={Change} path="/axobrew-ui/dist/index.html/settings/change" />
              <Route component={UserAgentSettings} path="/axobrew-ui/dist/index.html/settings/change-ua" />
              <Route component={LanguageSettings} path="/axobrew-ui/dist/index.html/settings/language" />
              <Route component={DevServerSettings} path="/axobrew-ui/dist/index.html/settings/devserver" />
              <Route component={About} path="/axobrew-ui/dist/index.html/about" />
            </Router>
          </div>
        </div>
      </LocationProvider>
    </ErrorBoundary>
  );
}


function startService(context) {
  const testWS = new WebSocket('ws://localhost:8081');

  testWS.onerror = () => {
    const pkgId = tizen.application.getCurrentApplication().appInfo.packageId;

    const serviceId = pkgId + ".StandaloneService";

    tizen.application.launchAppControl(
      new tizen.ApplicationControl("http://tizen.org/appcontrol/operation/service"),
      serviceId,
      function () {
        context.dispatch({
          type: 'SET_STATE',
          payload: 'service.started'
        });

        window.location.reload();
      },
      function (e) {
        alert("Launch Service failed: " + e.message);
      }
    );
  }

  testWS.onopen = () => {
    context.dispatch({
      type: 'SET_STATE',
      payload: 'service.alreadyRunning'
    });

    context.dispatch({
      type: 'SET_CLIENT',
      payload: new Client(context)
    });

  }
}
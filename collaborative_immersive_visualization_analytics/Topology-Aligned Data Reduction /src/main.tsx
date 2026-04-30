import ReactDOM from 'react-dom/client';
import { App } from './App';
import { appConfig, validateConfigOrThrow, logConfigSummary } from '@/config';
import { sessionEventAppend } from '@/metrics';

try {
  validateConfigOrThrow(appConfig);
  logConfigSummary(appConfig);
  sessionEventAppend('app_boot', { version: appConfig.version, mode: appConfig.environment });
} catch (error) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h2>❌ Configuration Error</h2><pre>${(error as Error).message}</pre></div>`;
  }
  throw error;
}

// VTK.js + WebGL: StrictMode double-mount disposes the GL context mid-setup and often yields a black view.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

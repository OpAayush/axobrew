import { useEffect, useContext } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon, PauseIcon, PlayIcon } from '@heroicons/react/16/solid';
import Tile from '../components/Tile.jsx';
import { GlobalStateContext } from '../components/ClientContext.jsx';
import { Events } from '../components/WebSocketClient.js';
import { useFocusable, useFocusPage } from '@noriginmedia/norigin-spatial-navigation';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation';

const LEVEL_COLOR = {
  error: 'text-red-400',
  warn: 'text-brew-amber',
  info: 'text-gray-300',
  log: 'text-gray-400'
};

function formatTime(ms) {
  const d = new Date(ms);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

export default function Logs() {
  const { state } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  useFocusPage();
  const logs = state?.sharedData?.logs;
  const enabled = logs ? !!logs.enabled : true;
  const entries = logs && logs.logs ? logs.logs : [];

  const reqLogs = () => state.client?.send({ type: Events.GetLogs });

  useEffect(() => {
    reqLogs();
    const interval = setInterval(() => reqLogs(), 5000);
    return () => clearInterval(interval);
  }, [state?.client]);

  const toggleRef = useFocusable({ shouldFocus: true }).ref;

  return (
    <div className="flex h-[calc(var(--uh)*100)] flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[calc(var(--uh)*3.5)] font-semibold text-white">{t('logs.title')}</h1>
        <div
          ref={toggleRef}
          tabIndex={0}
          className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-ink-800 px-5 py-3 text-[calc(var(--uh)*2.2)] text-gray-300 ring-1 ring-white/10"
          onClick={() => {
            state.client?.send({ type: Events.GetLogs, payload: { enabled: !enabled } });
          }}
        >
          {enabled ? (
            <PauseIcon className="h-[calc(var(--uh)*3)] w-[calc(var(--uh)*3)] text-brew-amber" />
          ) : (
            <PlayIcon className="h-[calc(var(--uh)*3)] w-[calc(var(--uh)*3)] text-brew-cyan" />
          )}
          {enabled ? t('logs.disable') : t('logs.enable')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-ink-900/70 ring-1 ring-white/10">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center gap-4 text-gray-500">
            <DocumentTextIcon className="h-[calc(var(--uh)*6)] w-[calc(var(--uh)*6)] text-gray-700" />
            <span className="text-[calc(var(--uh)*2)]">{t('logs.empty')}</span>
          </div>
        ) : (
          <div className="py-3">
            {entries.map((entry, i) => (
              <div key={i} className="px-4 py-2">
                <span className="tabular-nums text-gray-600">{formatTime(entry.at)}</span>
                <span className={`ml-3 ${LEVEL_COLOR[entry.level] || 'text-gray-400'}`}>
                  {entry.msg}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
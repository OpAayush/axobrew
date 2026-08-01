import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useContext } from 'react';
import { GlobalStateContext } from './ClientContext.jsx';
import { Events } from './WebSocketClient.js';
import { useTranslation } from 'react-i18next';
import { ArchiveBoxIcon } from '@heroicons/react/16/solid';
import Tile, { TILE_BASE } from './Tile.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Item({ children, module, id, state, shouldFocus }) {
  const { ref, focused } = useFocusable({ shouldFocus });
  useEffect(() => {
    if (focused) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [focused, ref]);

  function handleOnClick() {
    for (const key of module.keys) {
      tizen.tvinputdevice.registerKey(key);
    }

    state.client.send({
      type: Events.LaunchModule,
      payload: module
    });

    if (!module.evaluateScriptOnDocumentStart) {
      location.href = module.appPath;
    }
  }

  return (
    <div
      key={id}
      ref={ref}
      onClick={handleOnClick}
      className={classNames(
        TILE_BASE,
        focused ? 'focus' : '',
        id === 0 ? 'ml-4' : ''
      )}
    >
      {children}
      {module.dev && (
        <span className='absolute top-5 right-5 rounded-md bg-brew-amber/15 ring-1 ring-brew-amber/40 px-2.5 py-1 text-[1.6vh] font-bold tracking-widest text-brew-amber'>
          DEV
        </span>
      )}
    </div>
  );
}

function ModuleCard({ module, id, state }) {
  return (
    <Item module={module} id={id} state={state} shouldFocus={id === 0}>
      <span className='inline-flex items-center rounded-md bg-white/5 ring-1 ring-white/10 px-2.5 py-1 text-[1.6vh] font-medium tracking-widest text-gray-400'>
        {module.packageType === 'app' ? 'APP' : 'MODS'}
      </span>
      <div className='mt-4 flex items-center gap-3'>
        <h3
          className='text-white text-[3vh] font-semibold leading-tight'
        >
          {module.appName}
        </h3>
        <span className='rounded-md bg-brew-cyan/10 ring-1 ring-brew-cyan/30 px-2 py-0.5 text-[1.7vh] font-medium text-brew-cyan tabular-nums'>
          v{module.version}
        </span>
      </div>
      <p className='mt-4 text-[2vh] leading-relaxed text-gray-400'>
        {module.description}
      </p>
    </Item>
  );
}

function SkeletonTile() {
  return (
    <div className={TILE_BASE}>
      <div className='skeleton h-[2.4vh] w-1/4 rounded-md' />
      <div className='skeleton h-[3vh] w-3/4 rounded-md mt-5' />
      <div className='skeleton h-[2vh] w-full rounded-md mt-6' />
      <div className='skeleton h-[2vh] w-4/5 rounded-md mt-2.5' />
    </div>
  );
}

export default function Modules() {
  const { state } = useContext(GlobalStateContext);
  const { t } = useTranslation();

  const modules = state?.sharedData?.modules;

  return (
    <div className="relative isolate lg:px-8">
      <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
        {modules === null ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : modules.length === 0 ? (
          <Tile extra='!h-[30vh] !w-[42vw] flex flex-col items-center justify-center gap-5'>
            <ArchiveBoxIcon className='h-[7vh] w-[7vh] text-brew-cyan/60' />
            <h3 className='text-white text-[3vh] font-semibold'>
              {t('modules.emptyTitle')}
            </h3>
            <p className='text-gray-400 text-[2vh] leading-relaxed max-w-[26vw] text-center'>
              {t('modules.emptyDesc')}
            </p>
          </Tile>
        ) : (
          modules.map((module, moduleIdx) => (
            <ModuleCard module={module} id={moduleIdx} state={state} />
          ))
        )}
      </div>
    </div>
  )
}

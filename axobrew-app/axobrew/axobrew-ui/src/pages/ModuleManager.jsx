import { setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useContext, useState, useRef } from 'react';
import { GlobalStateContext } from '../components/ClientContext.jsx';
import { Events } from '../components/WebSocketClient.js';
import { useLocation } from 'preact-iso';
import { useTranslation } from 'react-i18next';
import { PlusIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/16/solid';
import Tile, { TILE_BASE } from '../components/Tile.jsx';
import HealthChips from '../components/HealthChips.jsx';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

function Item({ module, id, state, dispatch, shouldFocus }) {
    const { t } = useTranslation();
    const { ref, focused } = useFocusable({ shouldFocus });
    useEffect(() => {
        if (focused) {
            ref.current.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center',
            });
            state.client?.send({
                type: Events.PrefetchModule,
                payload: module.fullName
            });
        }
    }, [focused, ref]);

    function handleOnClick() {
        const deleteConfirm = confirm(t('moduleManager.confirmDelete', { packageName: module.appName }));
        if (deleteConfirm) {
            // Remove from the display instantly, the removal keeps running
            // in the background.
            dispatch({
                type: 'SET_REMOVING_MODULES',
                payload: [...state.sharedData.removingModules, module.fullName]
            });
            state.client.send({
                type: Events.ModuleAction,
                payload: {
                    action: 'remove',
                    module: module.fullName
                }
            });

            state.client.send({
                type: Events.GetModules,
                payload: true
            });

            setFocus('sn:focusable-item-1');
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
            <span className='inline-flex items-center rounded-md bg-white/5 ring-1 ring-white/10 px-2.5 py-1 text-[calc(var(--uh)*1.6)] font-medium tracking-widest text-gray-400'>
                {module.packageType === 'app' ? 'APP' : 'MODS'}
            </span>
            <div className='mt-4 flex items-center gap-3'>
                <h3
                    className='text-white text-[calc(var(--uh)*3)] font-semibold leading-tight'
                >
                    {module.appName}
                </h3>
                <span className='rounded-md bg-brew-cyan/10 ring-1 ring-brew-cyan/30 px-2 py-0.5 text-[calc(var(--uh)*1.7)] font-medium text-brew-cyan tabular-nums'>
                    v{module.version}
                </span>
            </div>
            <p className='mt-4 text-[calc(var(--uh)*2)] leading-relaxed text-gray-400'>
                {module.description}
            </p>
            <div className='mt-5 flex-1 flex items-end'>
                <HealthChips health={state?.sharedData?.moduleHealth ? state.sharedData.moduleHealth[module.fullName] : null} hasService={!!module.serviceFile} />
            </div>
        </div>
    );
}

export default function ModuleManager() {
    const { state, dispatch } = useContext(GlobalStateContext);
    const loc = useLocation();
    const { t } = useTranslation();
    const { addingModule, removingModules, modules } = state.sharedData;

    // Clear the flags once the fresh module list arrives.
    useEffect(() => {
        if (!modules) return;
        if (addingModule && modules.some(m => m.fullName === addingModule)) {
            dispatch({ type: 'SET_ADDING_MODULE', payload: null });
        }
        if (removingModules.length > 0) {
            dispatch({ type: 'SET_REMOVING_MODULES', payload: [] });
        }
    }, [modules]);

    // Fallback timers: never leave the loading tile stuck.
    useEffect(() => {
        if (!addingModule) return;
        const timer = setTimeout(() => dispatch({ type: 'SET_ADDING_MODULE', payload: null }), 30000);
        return () => clearTimeout(timer);
    }, [addingModule]);

    useEffect(() => {
        if (!removingModules.length) return;
        const timer = setTimeout(() => dispatch({ type: 'SET_REMOVING_MODULES', payload: [] }), 45000);
        return () => clearTimeout(timer);
    }, [removingModules]);

    const visibleModules = (modules || []).filter(m => !removingModules.includes(m.fullName));

    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                {visibleModules.map((module, moduleIdx) => (
                    <Item module={module} id={moduleIdx} state={state} dispatch={dispatch} shouldFocus={moduleIdx === 0} />
                ))}
                {addingModule && (
                    <Tile extra='flex flex-col items-center justify-center gap-5'>
                        <ArrowPathIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-amber' />
                        <h3 className='text-brew-amber text-[calc(var(--uh)*2.6)] font-semibold'>
                            {t('moduleManager.adding', { name: addingModule })}
                        </h3>
                        <p className='text-gray-400 text-[calc(var(--uh)*2)] leading-relaxed text-center'>
                            {t('moduleManager.addingDesc')}
                        </p>
                    </Tile>
                )}
                <Tile onClick={() => loc.route('/axobrew-ui/dist/index.html/module-manager/add?type=npm')}
                    extra='flex flex-col items-center justify-center gap-5'>
                    <PlusIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-amber' />
                    <h3 className='text-brew-amber text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('moduleManager.addNPM')}
                    </h3>
                    <p className='text-gray-400 text-[calc(var(--uh)*2)] leading-relaxed text-center'>
                        {t('moduleManager.addNPMDesc')}
                    </p>
                </Tile>
                <Tile onClick={() => loc.route('/axobrew-ui/dist/index.html/module-manager/add?type=gh')}
                    extra='flex flex-col items-center justify-center gap-5'>
                    <PlusIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-cyan' />
                    <h3 className='text-brew-cyan text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('moduleManager.addGH')}
                    </h3>
                    <p className='text-gray-400 text-[calc(var(--uh)*2)] leading-relaxed text-center'>
                        {t('moduleManager.addGHDesc')}
                    </p>
                </Tile>

            </div>
        </div>
    )
}

function AddModule() {
    const [name, setName] = useState('');
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [version, setVersion] = useState('');
    const loc = useLocation();
    const { state, dispatch } = useContext(GlobalStateContext);
    const ref = useRef(null);
    const versionRef = useRef(null);
    const submitted = useRef(false);
    const { t } = useTranslation();

    useEffect(() => {
        ref.current.focus();
    }, [ref]);

    function submit() {
        if (submitted.current) return;
        submitted.current = true;
        if (name) {
            const pinnedVersion = version.trim();
            const moduleName = `${loc.query.type}/${name}${!autoUpdate && pinnedVersion ? '@' + pinnedVersion : ''}`;
            state.client.send({
                type: Events.ModuleAction,
                payload: {
                    action: 'add',
                    module: moduleName
                }
            });
            dispatch({ type: 'SET_ADDING_MODULE', payload: moduleName });
        }
        state.client.send({
            type: Events.GetModules,
            payload: true
        });
        loc.route('/axobrew-ui/dist/index.html/module-manager');
        setFocus('sn:focusable-item-1');
    }

    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                <div className={classNames(TILE_BASE, '!w-[38vw] !h-[calc(var(--uh)*24)] flex items-center justify-center')}>
                    <input
                        type="text"
                        ref={ref}
                        value={name}
                        className="w-full p-4 rounded-xl bg-ink-900/80 ring-1 ring-white/15 text-white text-[calc(var(--uh)*2.4)] placeholder:text-gray-500 focus:outline-none"
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                submit();
                            } else if (e.keyCode === 10009) {
                                e.preventDefault();
                                e.stopPropagation();
                                loc.route('/axobrew-ui/dist/index.html/module-manager');
                                setFocus('sn:focusable-item-1');
                            }
                        }}
                        placeholder={t('moduleManager.moduleName', { type: loc.query.type })}
                    />
                </div>
                <Tile onClick={() => { setAutoUpdate(!autoUpdate); if (autoUpdate) setTimeout(() => versionRef.current && versionRef.current.focus(), 50); }}
                    extra='flex flex-col items-center justify-center gap-5'>
                    <ArrowPathIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-amber' />
                    <h3 className='text-white text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('moduleManager.autoUpdate')}
                    </h3>
                    <p className='text-gray-400 text-[calc(var(--uh)*2)] leading-relaxed text-center'>
                        {t('moduleManager.autoUpdateDesc')}
                    </p>
                    <span className={classNames(
                        'inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[calc(var(--uh)*1.8)] font-semibold tracking-widest',
                        autoUpdate ? 'bg-brew-cyan/10 ring-1 ring-brew-cyan/30 text-brew-cyan' : 'bg-white/5 ring-1 ring-white/10 text-gray-400'
                    )}>
                        {autoUpdate ? t('devServer.on') : t('devServer.off')}
                    </span>
                </Tile>
                <Tile extra='flex flex-col items-center justify-center gap-5'>
                    <CheckIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-cyan' />
                    <h3 className='text-white text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('moduleManager.versionPin')}
                    </h3>
                    <p className='text-gray-400 text-[calc(var(--uh)*2)] leading-relaxed text-center'>
                        {t('moduleManager.versionPinDesc')}
                    </p>
                    {autoUpdate ? (
                        <span className='inline-flex w-fit items-center rounded-md bg-white/5 ring-1 ring-white/10 px-2.5 py-1 text-[calc(var(--uh)*1.8)] font-semibold tracking-widest text-gray-400'>
                            {t('moduleManager.latest')}
                        </span>
                    ) : (
                        <input
                            type="text"
                            ref={versionRef}
                            value={version}
                            className="w-full p-4 rounded-xl bg-ink-900/80 ring-1 ring-white/15 text-white text-[calc(var(--uh)*2.4)] placeholder:text-gray-500 focus:outline-none text-center"
                            onChange={(e) => setVersion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.keyCode === 13) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    submit();
                                } else if (e.keyCode === 10009) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setAutoUpdate(true);
                                    ref.current.focus();
                                }
                            }}
                            placeholder={t('moduleManager.versionPlaceholder')}
                        />
                    )}
                </Tile>
                <Tile onClick={submit}
                    extra='flex flex-col items-center justify-center gap-5'>
                    <PlusIcon className='h-[calc(var(--uh)*5)] w-[calc(var(--uh)*5)] text-brew-amber' />
                    <h3 className='text-brew-amber text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('moduleManager.add')}
                    </h3>
                </Tile>

            </div>
        </div>
    )
}

export {
    AddModule
}

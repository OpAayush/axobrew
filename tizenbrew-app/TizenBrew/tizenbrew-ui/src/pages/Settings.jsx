import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useContext } from 'react';
import { GlobalStateContext } from '../components/ClientContext.jsx';
import { Events } from '../components/WebSocketClient.js';
import { useLocation } from 'preact-iso';
import { useTranslation } from 'react-i18next';
import { Cog6ToothIcon, RocketLaunchIcon, ArrowPathIcon, GlobeAltIcon } from '@heroicons/react/16/solid';
import Tile from '../components/Tile.jsx';

function SettingTile({ icon, iconColor, title, desc, onClick, shouldFocus }) {
    return (
        <Tile onClick={onClick} extra='flex flex-col' shouldFocus={shouldFocus}>
            <div className={`flex items-center gap-4 ${iconColor}`}>
                {icon}
            </div>
            <h3 className='text-white text-[2.8vh] font-semibold leading-tight mt-5'>
                {title}
            </h3>
            <p className='text-gray-400 text-[2vh] leading-relaxed mt-4'>
                {desc}
            </p>
        </Tile>
    );
}

export default function Settings() {
    const { state } = useContext(GlobalStateContext);
    const loc = useLocation();
    const { t } = useTranslation();

    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                <SettingTile
                    shouldFocus={true}
                    icon={<RocketLaunchIcon className='h-[4.5vh] w-[4.5vh] text-brew-cyan' />}
                    title={t('settings.autolaunch')}
                    desc={t('settings.autolaunchDesc')}
                    onClick={() => {
                        if (state.sharedData.modules?.length === 0) return alert(t('settings.noModules'));
                        loc.route('/tizenbrew-ui/dist/index.html/settings/change?type=autolaunch');
                    }}
                />
                <SettingTile
                    icon={<ArrowPathIcon className='h-[4.5vh] w-[4.5vh] text-brew-cyan' />}
                    title={t('settings.autolaunchService')}
                    desc={t('settings.autolaunchServiceDesc')}
                    onClick={() => {
                        if (state.sharedData.modules?.length === 0) return alert(t('settings.noModules'));
                        loc.route('/tizenbrew-ui/dist/index.html/settings/change?type=autolaunchService');
                    }}
                />
                <SettingTile
                    icon={<Cog6ToothIcon className='h-[4.5vh] w-[4.5vh] text-brew-amber' />}
                    title={t('settings.useragent')}
                    desc={t('settings.useragentDesc')}
                    onClick={() => {
                        loc.route('/tizenbrew-ui/dist/index.html/settings/change-ua');
                    }}
                />
                <SettingTile
                    icon={<GlobeAltIcon className='h-[4.5vh] w-[4.5vh] text-brew-cyan' />}
                    title={t('settings.language')}
                    desc={t('settings.languageDesc')}
                    onClick={() => {
                        loc.route('/tizenbrew-ui/dist/index.html/settings/language');
                    }}
                />
            </div>
        </div>
    )
}

function Change() {
    const loc = useLocation();
    const { state } = useContext(GlobalStateContext);
    const { t } = useTranslation();

    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                {state?.sharedData?.modules?.map((module, idx) => {
                    if (loc.query.type === 'autolaunchService' && !module.serviceFile) return null;
                    return (
                        <Tile
                            shouldFocus={idx === 0}
                            key={idx}
                            onClick={() => {
                                if (confirm(t('settings.enableAutolaunchPrompt', { packageName: module.appName }))) {
                                    state.client.send({
                                        type: Events.ModuleAction,
                                        payload: {
                                            action: loc.query.type,
                                            module: module.fullName
                                        }
                                    });
                                    loc.route('/tizenbrew-ui/dist/index.html/settings');
                                    setFocus('sn:focusable-item-1');
                                }
                            }}>
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
                            <p className='text-gray-400 text-[2vh] leading-relaxed mt-4'>
                                {module.description}
                            </p>
                        </Tile>
                    )
                })}
                <Tile
                    shouldFocus={state?.sharedData?.modules?.length === 0}
                    onClick={() => {
                        if (confirm(t('settings.disableAutolaunchPrompt'))) {
                            state.client.send({
                                type: Events.ModuleAction,
                                payload: {
                                    action: loc.query.type,
                                    module: ''
                                }
                            });
                            loc.route('/tizenbrew-ui/dist/index.html/settings');
                            setFocus('sn:focusable-item-1');
                        }
                    }}
                    extra='flex flex-col items-center justify-center gap-5'>
                    <h3 className='text-red-400 text-[2.6vh] font-semibold'>
                        {t('settings.disableAutolaunch')}
                    </h3>
                </Tile>
            </div>
        </div>
    )
}

export {
    Change
}

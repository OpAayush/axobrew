import { setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useContext, useState, useRef } from 'react';
import { GlobalStateContext } from '../components/ClientContext.jsx';
import { Events } from '../components/WebSocketClient.js';
import { useLocation } from 'preact-iso';
import { useTranslation } from 'react-i18next';
import { ServerIcon, CheckIcon } from '@heroicons/react/16/solid';
import Tile, { TILE_BASE } from '../components/Tile.jsx';

const DEFAULT_DEV_SERVER = {
    enabled: true,
    host: '192.168.1.99',
    port: 8080
};

export default function DevServerSettings() {
    const { state } = useContext(GlobalStateContext);
    const loc = useLocation();
    const { t } = useTranslation();

    const current = state?.sharedData?.devServer || DEFAULT_DEV_SERVER;
    const [enabled, setEnabled] = useState(current.enabled);
    const [host, setHost] = useState(current.host);
    const [port, setPort] = useState(String(current.port));
    const [saved, setSaved] = useState(false);
    const submitted = useRef(false);

    const hostRef = useRef(null);
    const portRef = useRef(null);

    useEffect(() => {
        hostRef.current.focus();
    }, [hostRef]);

    function save() {
        if (submitted.current) return;
        submitted.current = true;
        state.client?.send({
            type: Events.SetDevServer,
            payload: {
                enabled,
                host,
                port: Number(port)
            }
        });
        setSaved(true);
        setTimeout(() => {
            submitted.current = false;
            setSaved(false);
        }, 3000);
    }

    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                <Tile
                    shouldFocus={true}
                    extra='flex flex-col'
                    onClick={() => setEnabled(!enabled)}
                >
                    <div className='flex items-center gap-4'>
                        <ServerIcon className='h-[4.5vh] w-[4.5vh] text-brew-cyan' />
                    </div>
                    <h3 className='text-white text-[2.8vh] font-semibold leading-tight mt-5'>
                        {t('devServer.enabled')}
                    </h3>
                    <p className='text-gray-400 text-[2vh] leading-relaxed mt-4'>
                        {t('devServer.enabledDesc')}
                    </p>
                    <span className={`mt-6 inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[1.8vh] font-semibold tracking-widest ${enabled ? 'bg-brew-cyan/10 ring-1 ring-brew-cyan/30 text-brew-cyan' : 'bg-white/5 ring-1 ring-white/10 text-gray-400'}`}>
                        {enabled ? t('devServer.on') : t('devServer.off')}
                    </span>
                </Tile>

                <div className={`${TILE_BASE} !w-[30vw] !h-[24vh] flex flex-col items-center justify-center gap-5`}>
                    <h3 className='text-gray-400 text-[2vh] font-medium tracking-widest'>
                        {t('devServer.host')}
                    </h3>
                    <input
                        type="text"
                        ref={hostRef}
                        value={host}
                        className="w-full p-4 rounded-xl bg-ink-900/80 ring-1 ring-white/15 text-white text-[2.4vh] text-center placeholder:text-gray-500 focus:outline-none"
                        onChange={(e) => setHost(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                save();
                            } else if (e.keyCode === 10009) {
                                e.preventDefault();
                                e.stopPropagation();
                                loc.route('/tizenbrew-ui/dist/index.html/settings');
                                setFocus('sn:focusable-item-1');
                            }
                        }}
                    />
                </div>

                <div className={`${TILE_BASE} !w-[30vw] !h-[24vh] flex flex-col items-center justify-center gap-5`}>
                    <h3 className='text-gray-400 text-[2vh] font-medium tracking-widest'>
                        {t('devServer.port')}
                    </h3>
                    <input
                        type="text"
                        ref={portRef}
                        value={port}
                        className="w-full p-4 rounded-xl bg-ink-900/80 ring-1 ring-white/15 text-white text-[2.4vh] text-center placeholder:text-gray-500 focus:outline-none"
                        onChange={(e) => setPort(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                save();
                            } else if (e.keyCode === 10009) {
                                e.preventDefault();
                                e.stopPropagation();
                                loc.route('/tizenbrew-ui/dist/index.html/settings');
                                setFocus('sn:focusable-item-1');
                            }
                        }}
                    />
                </div>

                <Tile
                    extra='flex flex-col items-center justify-center gap-4'
                    onClick={save}
                >
                    {saved ? (
                        <CheckIcon className='h-[5vh] w-[5vh] text-brew-cyan' />
                    ) : (
                        <ServerIcon className='h-[5vh] w-[5vh] text-brew-amber' />
                    )}
                    <h3 className={`text-[2.6vh] font-semibold ${saved ? 'text-brew-cyan' : 'text-brew-amber'}`}>
                        {saved ? t('devServer.saved') : t('devServer.save')}
                    </h3>
                </Tile>
            </div>
        </div>
    );
}

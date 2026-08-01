import { Cog6ToothIcon, ArchiveBoxIcon, HomeIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/16/solid';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useContext } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { GlobalStateContext } from './ClientContext.jsx';
import TBLogo from '../assets/tizenbrew.svg';
import { useTranslation } from 'react-i18next';
import { Events } from './WebSocketClient.js';

function Button({ children, route, focus, focusKey, action }) {
    const { ref, focusSelf, focused } = useFocusable();
    const location = useLocation();

    if (focus) {
        useEffect(() => {
            focusSelf();
        }, []);
    }
    return (
        <button
            ref={ref}
            focusKey={focus ? 'sn:focusable-item-1' : focusKey}
            className={`tile flex items-center justify-center h-[5.5vh] w-[5.5vh] rounded-xl bg-white/5 ring-1 ring-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:ring-white/25 transition ${focused ? 'focus' : ''}`}
            onClick={() => (action ? action() : location.route(`/tizenbrew-ui/dist/index.html${route}`))}
        >
            {children}
        </button>
    );
}
export default function Header() {
    const { state } = useContext(GlobalStateContext);
    const { t } = useTranslation();

    const serviceState = state?.sharedData?.state;
    const dotColor = serviceState === 'service.connected'
        ? 'bg-emerald-400'
        : serviceState === 'service.started' || serviceState === 'service.alreadyRunning'
            ? 'bg-brew-amber'
            : 'bg-gray-400';

    return (
        <header className="bg-ink-900/80 backdrop-blur-md border-b border-white/10 h-[9vh]">
            <nav aria-label="Global" className="flex items-center justify-between lg:px-8 h-[9vh]">
                <div className="flex lg:flex-1 items-center gap-4">
                    <a href="#" className="-m-1.5 p-1.5">
                        <img
                            src={TBLogo}
                            className="h-[7vh] w-auto"
                        />
                    </a>
                    <span className="hidden lg:block text-white text-[3vh] font-semibold tracking-tight">
                        TizenBrew
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 rounded-full bg-white/5 px-5 py-2 ring-1 ring-white/10">
                        <span className={`h-[1.4vh] w-[1.4vh] rounded-full ${dotColor} ${!serviceState ? 'animate-pulse' : ''}`} />
                        <span className="text-[1.9vh] text-gray-300">
                            {t(serviceState || '...')}
                        </span>
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:gap-2.5">
                        <Button route="/" focus={true} focusKey="sn:focusable-item-1">
                            <HomeIcon className="h-[3.2vh] w-[3.2vh]" />
                        </Button>
                        <Button route="/settings">
                            <Cog6ToothIcon className="h-[3.2vh] w-[3.2vh]" />
                        </Button>
                        <Button route="/module-manager">
                            <ArchiveBoxIcon className="h-[3.2vh] w-[3.2vh]" />
                        </Button>
                        <Button route="/about">
                            <QuestionMarkCircleIcon className="h-[3.2vh] w-[3.2vh]" />
                        </Button>
                        <Button action={() => state.client?.send({ type: Events.GetModules, payload: true })}>
                            <ArrowPathIcon className="h-[3.2vh] w-[3.2vh]" />
                        </Button>
                    </div>
                </div>
            </nav>
        </header>
    );
}

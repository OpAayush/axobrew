import { Cog6ToothIcon, ArchiveBoxIcon, HomeIcon, QuestionMarkCircleIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/16/solid';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useState, useEffect, useContext } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { GlobalStateContext } from './ClientContext.jsx';
import TBLogo from '../assets/axobrew.svg';
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
            className={`flex items-center justify-center h-[calc(var(--uh)*5.5)] w-[calc(var(--uh)*5.5)] rounded-xl bg-white/5 ring-1 ring-white/10 text-gray-300 hover:bg-brew-amber/10 hover:text-brew-amber hover:ring-brew-amber/30 ${focused ? 'focus' : ''}`}
            onClick={() => (action ? action() : location.route(`/axobrew-ui/dist/index.html${route}`))}
        >
            {children}
        </button>
    );
}
export default function Header() {
    const { state } = useContext(GlobalStateContext);
    const { t } = useTranslation();
    const [reloaded, setReloaded] = useState(false);

    useEffect(() => {
        if (!reloaded) return;
        const timeout = setTimeout(() => setReloaded(false), 2500);
        return () => clearTimeout(timeout);
    }, [reloaded]);

    const serviceState = state?.sharedData?.state;
    const dotColor = serviceState === 'service.connected'
        ? 'bg-emerald-400'
        : serviceState === 'service.started' || serviceState === 'service.alreadyRunning'
            ? 'bg-brew-amber'
            : 'bg-gray-400';

    return (
        <header className="bg-ink-900/95 border-b border-white/5 h-[calc(var(--uh)*9)]">
            <nav aria-label="Global" className="flex items-center justify-between lg:px-8 h-[calc(var(--uh)*9)]">
                <div className="flex lg:flex-1 items-center gap-4">
                    <a href="#" className="-m-1.5 p-1.5">
                        <img
                            src={TBLogo}
                            className="h-[calc(var(--uh)*7)] w-auto"
                        />
                    </a>
                    <span className="hidden lg:block text-white text-[calc(var(--uh)*3)] font-semibold tracking-tight">
                        axobrew
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 rounded-full bg-white/5 px-5 py-2 ring-1 ring-white/10">
                        <span className={`h-[calc(var(--uh)*1.4)] w-[calc(var(--uh)*1.4)] rounded-full ${dotColor}`} />
                        <span className="text-[calc(var(--uh)*1.9)] text-gray-300">
                            {t(serviceState || '...')}
                        </span>
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:gap-2.5">
                        <Button route="/" focus={true} focusKey="sn:focusable-item-1">
                            <HomeIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)]" />
                        </Button>
                        <Button route="/settings">
                            <Cog6ToothIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)]" />
                        </Button>
                        <Button route="/module-manager">
                            <ArchiveBoxIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)]" />
                        </Button>
                        <Button route="/about">
                            <QuestionMarkCircleIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)]" />
                        </Button>
                        <Button action={() => {
                            state.client?.send({ type: Events.GetModules, payload: true });
                            setReloaded(true);
                        }}>
                            {reloaded ? (
                                <CheckCircleIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)] text-brew-cyan" />
                            ) : (
                                <ArrowPathIcon className="h-[calc(var(--uh)*3.2)] w-[calc(var(--uh)*3.2)]" />
                            )}
                        </Button>
                    </div>
                </div>
            </nav>
        </header>
    );
}

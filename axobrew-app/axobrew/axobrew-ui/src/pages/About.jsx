import TBLogo from '../assets/axobrew.svg';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between px-8 py-5">
            <span className="text-[calc(var(--uh)*2.2)] text-gray-400">{label}</span>
            <span className="text-[calc(var(--uh)*2.2)] text-white font-medium tabular-nums">{value}</span>
        </div>
    );
}

function formatBytes(bytes) {
    if (bytes === null || typeof bytes !== 'number') return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return bytes.toFixed(1) + ' ' + units[i];
}

export default function About() {
    const { t } = useTranslation();
    const tizenVersion = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version') || 'Unknown';
    const tvModel = tizen.systeminfo.getCapability('http://tizen.org/system/model_name') || 'Unknown';
    const appVersion = tizen.application.getCurrentApplication().appInfo.version;

    const [storage, setStorage] = useState(null);
    const [mem, setMem] = useState(null);
    const [wifi, setWifi] = useState(null);

    useEffect(() => {
        const sys = tizen.systeminfo;
        try {
            sys.getTotalStorageSize(space => {
                setStorage(prev => ({ ...prev, total: space }));
            }, () => {});
            sys.getAvailableStorageSize(space => {
                setStorage(prev => ({ ...prev, available: space }));
            }, () => {});
        } catch (e) {}
        try {
            sys.getCurrentMemorySize(memory => {
                setMem(memory);
            }, () => {});
        } catch (e) {}
        try {
            sys.getPropertyValue('WIFI_NETWORK', property => {
                setWifi(property.signalStrength);
            }, () => {});
        } catch (e) {}
    }, []);

    const storageLabel = storage && storage.available !== undefined
        ? formatBytes(storage.available) + ' / ' + formatBytes(storage.total)
        : 'Unknown';
    const memLabel = mem !== null ? formatBytes(mem) : 'Unknown';
    const wifiLabel = wifi !== null ? wifi + ' dBm' : 'Unknown';

    return (
        <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center">
                <div className="relative">
                    <div className="absolute -inset-8 rounded-full bg-brew-amber/10 blur-3xl" />
                    <img src={TBLogo} className="relative h-[calc(var(--uh)*20)] w-auto" />
                </div>
                <p className="text-white text-[calc(var(--uh)*4.5)] font-semibold tracking-tight mt-8">
                    axobrew
                </p>
                <p className="text-[calc(var(--uh)*2)] text-gray-500 mt-2 tracking-widest uppercase">
                    {t('about.tagline')}
                </p>
                <div className="mt-10 w-[36vw] rounded-2xl bg-ink-800/80 ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
                    <InfoRow label={t('about.appVersion')} value={appVersion} />
                    <InfoRow label={t('about.tizenVersion')} value={tizenVersion} />
                    <InfoRow label={t('about.tvModel')} value={tvModel} />
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <div className="flex flex-col items-center rounded-2xl bg-ink-800/80 ring-1 ring-white/10 px-8 py-5">
                        <span className="text-[calc(var(--uh)*2)] text-gray-400">{t('about.storage')}</span>
                        <span className="text-[calc(var(--uh)*2.6)] text-white font-semibold tabular-nums mt-2">{storageLabel}</span>
                    </div>
                    <div className="flex flex-col items-center rounded-2xl bg-ink-800/80 ring-1 ring-white/10 px-8 py-5">
                        <span className="text-[calc(var(--uh)*2)] text-gray-400">{t('about.memory')}</span>
                        <span className="text-[calc(var(--uh)*2.6)] text-white font-semibold tabular-nums mt-2">{memLabel}</span>
                    </div>
                    <div className="flex flex-col items-center rounded-2xl bg-ink-800/80 ring-1 ring-white/10 px-8 py-5">
                        <span className="text-[calc(var(--uh)*2)] text-gray-400">{t('about.wifi')}</span>
                        <span className="text-[calc(var(--uh)*2.6)] text-brew-amber font-semibold tabular-nums mt-2">{wifiLabel}</span>
                    </div>
                </div>
                <p className="text-[calc(var(--uh)*1.8)] text-gray-600 mt-8 tracking-widest">
                    BREWED BY AAYU5H
                </p>
            </div>
        </div>
    )
}
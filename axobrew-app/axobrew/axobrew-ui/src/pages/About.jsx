import TBLogo from '../assets/axobrew.svg';
import { useTranslation } from 'react-i18next';

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between px-8 py-5">
            <span className="text-[calc(var(--uh)*2.2)] text-gray-400">{label}</span>
            <span className="text-[calc(var(--uh)*2.2)] text-white font-medium tabular-nums">{value}</span>
        </div>
    );
}

export default function About() {
    const { t } = useTranslation();
    const tizenVersion = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version') || 'Unknown';
    const tvModel = tizen.systeminfo.getCapability('http://tizen.org/system/model_name') || 'Unknown';
    const appVersion = tizen.application.getCurrentApplication().appInfo.version;

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
                <p className="text-[calc(var(--uh)*1.8)] text-gray-600 mt-8 tracking-widest">
                    BREWED BY AAYU5H
                </p>
            </div>
        </div>
    )
}

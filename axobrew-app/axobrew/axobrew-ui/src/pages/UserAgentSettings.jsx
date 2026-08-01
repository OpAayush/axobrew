import { useTranslation } from "react-i18next";
import { ArrowUturnLeftIcon, CpuChipIcon } from "@heroicons/react/16/solid";
import Tile from "../components/Tile.jsx";

const UserAgents = [
    {
        name: 'UE50MU7000',
        worksOnTizen: 3,
        userAgent: 'Mozilla/5.0 (LINUX; Tizen/3.0/2017.1.0) Cobalt/9.lts-gold (unlike Gecko) gles Evergreen/1.0.0 Starboard/9, Samsung_TV_KANTM_2017/T-MDEUC-1420.0 (Samsung, UE50MU7000, Wired)'
    },
    {
        name: 'QN55Q80AAFXZA',
        worksOnTizen: 6,
        userAgent: 'Mozilla/5.0 (LINUX; Tizen/6.0/2021.1.3) Cobalt/21.lts.4.302899-gold (unlike Gecko) v8/7.7.299.8-jit gles Evergreen/1.4.3 Starboard/12, Samsung_TV_NIKEM2_2021/T-NKM2AKUC-2111.1 (Samsung, QN55Q80AAFXZA, Wired)'
    },
    {
        name: 'Samsung TV (Tizen 4.0)',
        worksOnTizen: 4,
        userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 4.0) AppleWebKit/537.3 (KHTML, like Gecko) SamsungBrowser/2.1 TV Safari/537.3'
    },
    {
        name: 'settings.uaBasedOnDevice',
        userAgent: () => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "http://127.0.0.1:8001/api/v2/", false);
            xhr.send();

            let apiData = {};
            try {
                apiData = JSON.parse(xhr.responseText);
            } catch (e) {
                alert("Failed to parse API response:", e);
            }

            const firmware = tizen.systeminfo.getCapability("http://tizen.org/custom/sw_version"),
                model = tizen.systeminfo.getCapability("http://tizen.org/system/model_name"),
                chipsetModel = apiData.device.model.split('_')[1],
                deviceName = `_TV_${chipsetModel}`,
                newUserAgent = `${window.navigator.userAgent}, ${deviceName}/${firmware} (Samsung, ${model}, Wired)`;

            return newUserAgent;
        }
    }
];

export default function UserAgentSettings() {
    const { t } = useTranslation();
    return (
        <div className="relative isolate lg:px-8">
            <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
                {UserAgents.map((ua, idx) => {
                    return (
                        <Tile key={idx} onClick={() => {
                            const userAgent = typeof ua.userAgent === 'function' ? ua.userAgent() : ua.userAgent;
                            if (confirm(`${t('settings.setUaTo', { userAgent: userAgent })}\n\n${t('settings.uaNegativeEffects')}`)) {
                                localStorage.setItem('userAgent', userAgent);
                                alert(t('settings.uaSetRelaunch'));
                                tizen.application.getCurrentApplication().exit();
                            }
                        }} shouldFocus={idx === 0} extra='flex flex-col'>
                            <div className='flex items-center gap-3'>
                                <CpuChipIcon className='h-[calc(var(--uh)*4)] w-[calc(var(--uh)*4)] text-brew-cyan' />
                                <h3 className='text-white text-[calc(var(--uh)*2.6)] font-semibold leading-tight'>
                                    {t(ua.name)}
                                </h3>
                            </div>
                            <p className='text-gray-400 text-[calc(var(--uh)*2)] mt-4'>
                                {ua.worksOnTizen ? t('settings.worksOnTizen', { version: ua.worksOnTizen }) : ''}
                            </p>
                        </Tile>
                    )
                })}
                <Tile onClick={() => {
                    localStorage.removeItem('userAgent');
                    alert(t('settings.uaSetRelaunch'));
                    tizen.application.getCurrentApplication().exit();
                }} extra='flex flex-col items-center justify-center gap-5'>
                    <ArrowUturnLeftIcon className='h-[calc(var(--uh)*4.5)] w-[calc(var(--uh)*4.5)] text-brew-amber' />
                    <h3 className='text-brew-amber text-[calc(var(--uh)*2.6)] font-semibold'>
                        {t('settings.default')}
                    </h3>
                </Tile>
            </div>
        </div>
    )
}

import { setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useLocation } from 'preact-iso';
import { useTranslation } from 'react-i18next';
import Tile from '../components/Tile.jsx';
import i18n from '../components/i18n.js';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pt-pt', label: 'Português (PT)' },
  { code: 'pt-br', label: 'Português (BR)' },
  { code: 'da', label: 'Dansk' },
  { code: 'fi', label: 'Suomi' },
  { code: 'pl', label: 'Polski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'hu', label: 'Magyar' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'cat', label: 'Català' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'bs', label: 'Bosanski' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'sr-rs', label: 'Srpski (Latin)' },
  { code: 'sr-sp', label: 'Српски (Ћирилица)' },
  { code: 'tlh', label: 'tlhIngan Hol' }
];

export default function LanguageSettings() {
  const loc = useLocation();
  const { t } = useTranslation();
  const currentLanguage = localStorage.getItem('language');

  return (
    <div className="relative isolate lg:px-8">
      <div className="mx-auto flex flex-wrap justify-center gap-4 top-4 relative">
        {LANGUAGES.map((lang, idx) => {
          const active = lang.code === currentLanguage;
          return (
            <Tile
              key={lang.code}
              shouldFocus={idx === 0}
              extra='flex flex-col items-center justify-center gap-3'
              onClick={() => {
                localStorage.setItem('language', lang.code);
                i18n.changeLanguage(lang.code);
                loc.route('/tizenbrew-ui/dist/index.html/settings');
                setFocus('sn:focusable-item-1');
              }}>
              <span className={`text-[2.6vh] font-semibold ${active ? 'text-brew-cyan' : 'text-white'}`}>
                {lang.label}
              </span>
              {active && (
                <span className='rounded-md bg-brew-cyan/10 ring-1 ring-brew-cyan/30 px-2.5 py-1 text-[1.6vh] font-medium text-brew-cyan'>
                  {t('language.current')}
                </span>
              )}
            </Tile>
          );
        })}
      </div>
    </div>
  );
}

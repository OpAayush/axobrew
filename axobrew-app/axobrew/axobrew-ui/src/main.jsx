import { render } from 'preact'
import './index.css'
import App from './app.jsx'
import { GlobalStateProvider } from './components/ClientContext.jsx'
import { init, setFocus } from '@noriginmedia/norigin-spatial-navigation';

init({ });

// Lock the UI to the real screen size. On some Tizen models the virtual
// keyboard shrinks the layout viewport, which would rescale every vh-based
// size and break the layout. The unit is measured once and never changes,
// so opening the keyboard cannot shrink the interface.
try {
    document.documentElement.style.setProperty('--uh', (window.screen.height / (window.devicePixelRatio || 1) / 100) + 'px');
} catch (e) {}

window.shouldDisableAutoLaunch = false;
window.addEventListener('keydown', (e) => {
    if (e.keyCode === 13) {
        document.querySelector('.focus')?.click();
    } else if (e.keyCode === 404) {
        // ColorF1Green: shortcut to the module manager
        window.location.href = '/axobrew-ui/dist/index.html/module-manager';
    } else if (e.keyCode === 10009) {
        if (location.pathname !== '/axobrew-ui/dist/index.html') {
            history.back();
            setFocus('sn:focusable-item-1');
        } else {
            tizen.application.getCurrentApplication().exit();
        }
    } else if (e.keyCode === 38) {
        window.shouldDisableAutoLaunch = true;
    }
});
try {
    if (localStorage.getItem('userAgent')) tizen.websetting.setUserAgentString(localStorage.getItem('userAgent'));
    tizen.tvinputdevice.registerKey("ColorF0Red");
    tizen.tvinputdevice.registerKey("ColorF1Green");
    tizen.tvinputdevice.registerKey("ColorF2Yellow");
    tizen.tvinputdevice.registerKey("ColorF3Blue");
} catch (e) {}

render(<GlobalStateProvider><App /></GlobalStateProvider>, document.getElementById('app'));
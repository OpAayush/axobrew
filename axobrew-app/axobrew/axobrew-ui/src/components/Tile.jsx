import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'preact/hooks';

export const TILE_BASE = 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-800 to-ink-700 ring-1 ring-white/10 hover:ring-brew-amber/40 p-8 h-[calc(var(--uh)*34)] w-[19vw]';

export default function Tile({ children, onClick, shouldFocus, extra }) {
    const { ref, focused, focusSelf } = useFocusable();

    useEffect(() => {
        if (focused) {
            ref.current.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center',
            });
        }
    }, [focused, ref]);

    useEffect(() => {
        if (shouldFocus) {
            focusSelf();
        }
    }, [shouldFocus, ref]);

    return (
        <div
            ref={ref}
            onClick={onClick}
            className={`${TILE_BASE} ${focused ? 'focus' : ''} ${extra || ''}`}
        >
            {children}
        </div>
    );
}

import { createContext } from 'preact';
import { useReducer } from 'preact/hooks';

const initialState = {
    sharedData: {
        debugStatus: {
            rwiDebug: false,
            appDebug: false,
            tizenDebug: false
        },
        modules: null,
        state: null,
        devServer: null,
        addingModule: null,
        removingModules: [],
        error: {
            message: null,
            dissapear: false
        }
    },
    client: null
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_SHARED_DATA':
            return { ...state, sharedData: action.payload };
        case 'SET_CLIENT':
            if (state.client) return state;
            return { ...state, client: action.payload };
        case 'SET_MODULES':
            return { ...state, sharedData: { ...state.sharedData, modules: action.payload } };
        case 'SET_DEBUG_STATUS':
            return { ...state, sharedData: { ...state.sharedData, debugStatus: action.payload } };
        case 'SET_STATE':
            return { ...state, sharedData: { ...state.sharedData, state: action.payload } };
        case 'SET_DEV_SERVER':
            return { ...state, sharedData: { ...state.sharedData, devServer: action.payload } };
        case 'SET_ADDING_MODULE':
            return { ...state, sharedData: { ...state.sharedData, addingModule: action.payload } };
        case 'SET_REMOVING_MODULES':
            return { ...state, sharedData: { ...state.sharedData, removingModules: action.payload } };
        case 'SET_ERROR':
            return { ...state, sharedData: { ...state.sharedData, error: action.payload } };
        default:
            return state;
    }
}

export const GlobalStateContext = createContext();

export function GlobalStateProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <GlobalStateContext.Provider value={{ state, dispatch }}>
            {children}
        </GlobalStateContext.Provider>
    );
}
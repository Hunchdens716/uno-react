import currentDispatcher, { Dispatcher, resolveDispatcher } from "./src/currentDispatcher";
import { jsxDEV } from "./src/jsx";

// react到dispatcher的连接
export const useState: Dispatcher["useState"] = (initialState) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState);
}

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps);
}

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    currentDispatcher
}

export default {
    version: "0.0.0",
    createElement: jsxDEV,
}
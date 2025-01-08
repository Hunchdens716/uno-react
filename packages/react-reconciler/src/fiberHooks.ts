import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatch, Dispatcher } from "react/src/currentDispatcher";
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";

const { currentDispatcher } = internals

let currentlyRenderFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null; // 指向当前正在处理的hook
let currentHook: Hook | null = null; // 指向当前正在处理的hook

// hook需要满足所有数据结构的使用
interface Hook {
    memorizedState: any,
    updateQueue: unknown,
    next: Hook | null,
}

export function renderWithHooks(wip: FiberNode) {
    // 赋值操作   
    currentlyRenderFiber = wip;
    wip.memorizedState = null; // 后面创建链表

    const current = wip.alternate;

    if (current !== null) {
        // update
        currentDispatcher.current = HooksDispatcherOnUpdate;
    } else {
        // mount
        currentDispatcher.current = HooksDispatcherOnMount
    }

    const Component = wip.type;
    const props = wip.pendingProps;
    const children = Component(props);

    // 重置操作
    currentlyRenderFiber = null;
    workInProgressHook = null;
    currentHook = null;
    return children;
}

const HooksDispatcherOnMount: Dispatcher = {
    useState: mountState
}

const HooksDispatcherOnUpdate: Dispatcher = {
    useState: updateState
}

function updateState<State>(initialState: (() => State | State)): [State, Dispatch<State>] {
    // 找到当前useState对应的hook数据
    const hook = updateWorkInProgressHook();
    
    // 计算新state的逻辑
    const queue = hook.updateQueue as UpdateQueue<State>;
    const pending = queue.shared.pending;

    if (pending !== null) {
        const {memorizedState} = processUpdateQueue(hook.memorizedState, pending);
        hook.memorizedState = memorizedState;
    }

    // let memorizedState;
    // if (initialState instanceof Function) {
    //     memorizedState = initialState();
    // } else {
    //     memorizedState = initialState;
    // }

    // const queue = createUpdateQueue<State>();
    // hook.updateQueue = queue;
    // hook.memorizedState = memorizedState;

    // // 这样子可以绑定到window上去触发, fiber已经保存好了
    // // @ts-ignore
    // const dispatch = dispatchSetState.bind(null, currentlyRenderFiber, queue);
    // queue.dispatch = dispatch;

    return [hook.memorizedState, queue.dispatch as Dispatch<State>];
}

function mountState<State>(initialState: (() => State | State)): [State, Dispatch<State>] {
    // 找到当前useState对应的hook数据
    const hook = mountWorkInProgressHook();
    let memorizedState;
    if (initialState instanceof Function) {
        memorizedState = initialState();
    } else {
        memorizedState = initialState;
    }

    const queue = createUpdateQueue<State>();
    hook.updateQueue = queue;
    hook.memorizedState = memorizedState;

    // 这样子可以绑定到window上去触发, fiber已经保存好了
    // @ts-ignore
    const dispatch = dispatchSetState.bind(null, currentlyRenderFiber, queue);
    queue.dispatch = dispatch;

    return [memorizedState, dispatch];
}

function dispatchSetState<State>(fiber: FiberNode | null, updateQueue: UpdateQueue<State>, action: Action<State>) {
    const update = createUpdate(action);
    enqueueUpdate(updateQueue, update);
    scheduleUpdateOnFiber(fiber!);
}

function updateWorkInProgressHook(): Hook {
    // TODO render阶段时候的更新
    let nextCurrentHook: Hook | null;

    if (currentHook === null) {
        // 这是这个FC update时候的第一个Hook
        const current = currentlyRenderFiber?.alternate;
        if (current !== null) {
            nextCurrentHook = current?.memorizedState;
        } else {
            // mount阶段 
            nextCurrentHook = null;
        }
    } else {
        // 这个FC update时候的后续hook
        nextCurrentHook = currentHook.next;
    }

    if (nextCurrentHook === null) {
        // mount/update u1 u2 u3
        // update u1 u2 u3 u4
        throw new Error(`
            组件${currentlyRenderFiber?.type}本次执行时的Hook比上次多
        `)
    }

    currentHook = nextCurrentHook;
    const newHook: Hook = {
        memorizedState: currentHook?.memorizedState,
        updateQueue: currentHook?.updateQueue,
        next: null
    }

    if (workInProgressHook === null) {
        // mount时 第一个hook
        if (currentlyRenderFiber === null) {
            throw new Error("请在函数组件内调用hook");
        } else {
            workInProgressHook = newHook;
            currentlyRenderFiber.memorizedState = workInProgressHook;
        }
    } else {
        // mount时后序的hook
        workInProgressHook.next = newHook;
        workInProgressHook = newHook;
    }

    return workInProgressHook;
}

function mountWorkInProgressHook() {
    const hook: Hook = {
        memorizedState: null,
        updateQueue: null,
        next: null
    }

    if (workInProgressHook === null) {
        // mount时 第一个hook
        if (currentlyRenderFiber === null) {
            throw new Error("请在函数组件内调用hook");
        } else {
            workInProgressHook = hook;
            currentlyRenderFiber.memorizedState = workInProgressHook;
        }
    } else {
        // mount时后序的hook
        workInProgressHook.next = hook;
        workInProgressHook = hook;
    }

    return workInProgressHook;
}
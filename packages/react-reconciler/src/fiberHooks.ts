import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatch, Dispatcher } from "react/src/currentDispatcher";
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Lane, NoLane, requestUpdateLanes } from "./fiberLanes";
import { Flags, PassiveEffect } from "./fiberFlags";
import { HookHasEfffect, Passive } from "./hookEffectTags";

const { currentDispatcher } = internals

let currentlyRenderFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null; // 指向当前正在处理的hook
let currentHook: Hook | null = null; // 指向当前正在处理的hook
let renderLane: Lane = NoLane;
// hook需要满足所有数据结构的使用
interface Hook {
    memorizedState: any,
    updateQueue: unknown,
    next: Hook | null,
}

export interface Effect {
    tag: Flags;
    create: EffectCallback | void;
    destroy: EffectCallback | void;
    deps: EffectDeps;
    next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
    lastEffect: Effect | null; 
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

export function renderWithHooks(wip: FiberNode, lane: Lane) {
    // 赋值操作   
    currentlyRenderFiber = wip;
    wip.memorizedState = null; // 后面创建链表
    // 重启hooks链条表
    wip.updateQueue = null;
    renderLane = lane;

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
    renderLane = NoLane;
    return children;
}

const HooksDispatcherOnMount: Dispatcher = {
    useState: mountState,
    useEffect: mountEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
    useState: updateState, 
    useEffect: updateEffect,
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void, ) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    (currentlyRenderFiber as FiberNode).flags |= PassiveEffect;

    hook.memorizedState = pushEffect(Passive | HookHasEfffect, create, undefined, nextDeps);
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
    if (prevDeps === null || nextDeps === null) {
        return false;
    }

    for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
        if (Object.is(prevDeps[i], nextDeps[i])) {
            continue;
        }
        return false;
    }
    return true;
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void, ) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    let destroy: EffectCallback | void;

    if (currentHook !== null) {
        const prevEffect = currentHook.memorizedState as Effect;
        destroy = prevEffect.destroy;

        if (nextDeps !== null) {
            // 浅比较依赖
            const prevDeps = prevEffect.deps;
            if (areHookInputsEqual(nextDeps, prevDeps)) {
                hook.memorizedState = pushEffect(Passive, create, destroy, nextDeps);
                return;
            }
        }

        // 浅比较不相等
        (currentlyRenderFiber as FiberNode).flags |= PassiveEffect;
        hook.memorizedState = pushEffect(Passive|HookHasEfffect, create, destroy, nextDeps);
    }
}

function pushEffect(hookFlags: Flags, create: EffectCallback | void, destroy: EffectCallback | void, deps: EffectDeps): Effect {
    const effect: Effect = {
        tag: hookFlags,
        create,
        destroy,
        deps,
        next: null
    } 
    const fiber = currentlyRenderFiber as FiberNode;
    const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
    if (updateQueue === null) {
        const updateQueue = createFCUpdateQueue();
        fiber.updateQueue = updateQueue;
        effect.next = effect;
        updateQueue.lastEffect = effect;
    }  else {
        // 插入effect
        const lastEffect = updateQueue.lastEffect;
        if (lastEffect == null) {
            effect.next = effect;
            updateQueue.lastEffect = effect;
        } else {
            const firstEffect = lastEffect.next;
            lastEffect.next = effect;
            effect.next = firstEffect; 
            updateQueue.lastEffect = effect;
        }
    }
    return effect;
}

function createFCUpdateQueue<State>() {
    const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
    updateQueue.lastEffect = null;
    return updateQueue;
}

function updateState<State>(initialState: (() => State | State)): [State, Dispatch<State>] {
    // 找到当前useState对应的hook数据
    const hook = updateWorkInProgressHook();
    
    // 计算新state的逻辑
    const queue = hook.updateQueue as UpdateQueue<State>;
    const pending = queue.shared.pending;
    queue.shared.pending = null;

    if (pending !== null) {
        const {memorizedState} = processUpdateQueue(hook.memorizedState, pending, renderLane);
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
    const lane = requestUpdateLanes();
    const update = createUpdate(action, lane);
    enqueueUpdate(updateQueue, update);
    scheduleUpdateOnFiber(fiber!, lane);
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
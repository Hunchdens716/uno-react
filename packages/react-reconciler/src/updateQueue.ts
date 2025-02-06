import { Dispatch } from "react/src/currentDispatcher";
import { Action } from "shared/ReactTypes";
import { Lane } from "./fiberLanes";

// 代表更新的数据结构 - Update

// 消费Update的数据结构 - UpdateQueue

/**
 * 
 */


export interface Update<State> {
    action: Action<State>,
    lane: Lane,
    next: Update<any> | null,
}


export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null;
    },
    dispatch: Dispatch<State> | null;
}

// 创建update
// 初始化update的方法
export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
    return {
        action,
        lane,
        next: null
    }
}

// 初始化updateQueue的方法
export const createUpdateQueue = <State>() => {
    return {
        shared: {
            pending: null
        },
        dispatch: null
    } as UpdateQueue<State>;
}

// 往updateQueue插入的方法
export const enqueueUpdate = <State>(
    updateQueue: UpdateQueue<State>,
    update: Update<State>
) => {
    // 多次更新因此改成链表结构，不会覆盖之前，形成了一条环状链表
    // updateQueue.shared.pending = update;
    const pending = updateQueue.shared.pending;
    if (pending === null) {
        update.next = update;
    } else {
        // 生成环状链表
        update.next = pending.next;
        pending.next = update;
    }
    updateQueue.shared.pending = update;
}

// 消费update的方法
// baseState当前状态
// pendingUpdate要更新的状态
export const processUpdateQueue = <State>(
    baseState: State,
    pendingUpdate: Update<State> | null,
    renderLane: Lane
) : { memorizedState: State } => {

    const result: ReturnType<typeof processUpdateQueue<State>> = { memorizedState: baseState };

    if (pendingUpdate !== null) {
        // 第一个update
        let first = pendingUpdate.next;
        let pending = pendingUpdate.next;
        do {
            const updateLane = pending?.lane;
            if (updateLane === renderLane) {
                const action = pending?.action;

                if (action instanceof Function) {
                    // baseState 1 update 2 -> mem    orizedState 2
                    baseState = action(baseState);
                } else {
                    // baseState 1 update (x) => 4x -> memorizedState 4 
                    baseState = action;
                }
            } else {
                if (__DEV__) {
                    console.error('不应该进入')
                }
            }
            pending = pending?.next as Update<any>;
        } while (pending !== first)
        result.memorizedState = baseState;
        return result; 
    }

    return result;
}
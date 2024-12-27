import { ReactElementType } from "shared/ReactTypes";
import { FiberNode } from "./fiber";
import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import { HostComponent, HostRoot, HostText } from "./workTags";
import { mountChildFibers, reconcilChildFibers } from "./childFibers";

// 递归中的递阶段
export const beginWork = (wip: FiberNode) => {
    
    // 比较，返回子 fiberNode
    switch (wip.tag) {
        case HostRoot:
            // 计算状态最新值
            // 创造子fiberNode
            return updateHostRoot(wip);
        case HostComponent:
            return updateHostComponent(wip);
        case HostText:
            return null;
        default:
            if (__DEV__) {
                console.warn("beginWork未实现的类型");
            }
            break;
    }
}

function updateHostRoot(wip: FiberNode) {
    const baseState = wip.memorizedState;
    const updateQueue = wip.updateQueue as UpdateQueue<Element>;
    const pendings = updateQueue.shared.pending;
    updateQueue.shared.pending = null;
    const { memorizedState } = processUpdateQueue(baseState, pendings);
    wip.memorizedState = memorizedState;

    const nextChildren = wip.memorizedState;
    reconcilerChildren(wip, nextChildren);
    return wip.child;
}

function updateHostComponent(wip: FiberNode) {
    const nextProps = wip.pendingProps;
    const nextChildren = nextProps.children;
    reconcilerChildren(wip, nextChildren);
    return wip.child;
}

function reconcilerChildren(wip: FiberNode, children?: ReactElementType) {
    const current = wip.alternate;

    if (current !== null) {
        // update
        wip.child = reconcilChildFibers(wip, current?.child, children);
    } else {
        // mount
        wip.child = mountChildFibers(wip, null, children);
    }
}
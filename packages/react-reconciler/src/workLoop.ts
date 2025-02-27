import { createWorkInProgress, FiberNode, FiberRootNode, PendingsPassiveEffects } from "./fiber";
import { beginWork } from "./beginWork";
import { completeWork } from "./completeWork";
import { HostRoot } from "./workTags";
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlags";
import { commitHookEffectListCreate, commitHookEffectListDestroy, commitHookEffectListUnmount, commitMutationEffects } from "./commitWork";
import { getHighestPriorityLane, Lane, markRootFinished, mergeLanes, NoLane, SyncLane } from "./fiberLanes";
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue";
import { scheduleMicroTask } from "hostConfig";
import {
    unstable_scheduleCallback as scheduleCallback,
    unstable_NormalPriority as NormalPriority
} from "scheduler"
import { HookHasEfffect, Passive } from "./hookEffectTags";

// 全局指针，指向现在当前正在工作的fiberNode
let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane; // 本次更新的lane
let rootDoesHasPaassiveEffects: Boolean = false;

// 用于执行初始化操作
// 主要用于将workInProgress赋值为当前工作的fiberNode
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
    workInProgress = createWorkInProgress(root.current, {});
    wipRootRenderLane = lane;
}


// 连接renderRoot和updateContainer方法
// 在fiber中调度update
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
    // 调度功能

    // 首屏渲染传入的fiber是hostRootFiber
    // 对于setState是根节点fiberRootNode

    // 从节点一级一级遍历到root 就是fiberRootNode
    const root = markUpdateFromFiberToRoot(fiber);
    markRootUpdated(root, lane);
    // renderRoot(root);
    ensureRootIsScheduled(root);
} 

// schedule阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
    const updateLane = getHighestPriorityLane(root.pendingLanes);
    if (updateLane === NoLane) return;
    if (updateLane === SyncLane) {
        // 同步优先级 用微任务调度
        if (__DEV__) {
            console.log("在微任务中调度，优先级：", updateLane);
        }
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
        scheduleMicroTask(flushSyncCallbacks);
    } else {
        // 其他优先级 用宏任务调度 
    }
}

// 记录lane到fiberRootNode上
function markRootUpdated(root: FiberRootNode, lane: Lane) {
    root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}


// 遍历到fiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
    let node = fiber;
    let parent = node.return;
    while (parent !== null) {
        node = parent;
        parent = node.return;
    }

    if (node.tag === HostRoot) {
        return node.stateNode;
    }
    return null;
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
    const nextLanes = getHighestPriorityLane(root.pendingLanes);
    
    if (nextLanes != SyncLane) {
        // 其他比SyncLane低的优先级
        // NoLane
        ensureRootIsScheduled(root);
        return
    }
    // 初始化
    // 让workInProgress指向当前的fiberNode
    prepareFreshStack(root, lane);


    // 递归流程
    do {
        try {
            workLoop();
            break;
        } catch(e) {
            if (__DEV__) {
                console.warn("workLoop发生错误", e);
            }
            workInProgress = null;
        }
    } while(true)

    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = lane;
    wipRootRenderLane = NoLane;

    // wip fiberNode树 以及树中的flags
    commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
    const finishedWork = root.finishedWork;

    if (finishedWork === null) return;

    if (__DEV__) console.warn("commit阶段开始", finishedWork);

    const lane = root.finishedLane;
    if (lane === NoLane && __DEV__) {
        console.warn("commit阶段finishedLane不应该是NoLane")
    }
    // 重置操作
    root.finishedWork = null;
    root.finishedLane = NoLane;

    markRootFinished(root, lane);

    if (
        (finishedWork.flags & PassiveMask) !== NoFlags ||
        (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
    ) {
        // 当前函数组件存在useEffect
        if (!rootDoesHasPaassiveEffects) {
            rootDoesHasPaassiveEffects = true;
            
            scheduleCallback(NormalPriority, () => {
                // 执行副作用
                // 执行副作用 
                flushPassiveEffects(root.pendingPassiveEffects);
                return
            })
        }
    }

    // 判断是否存在3个子阶段需要执行的操作
    // root本身的flags 以及root的subFlags
    const subtreeHasEffect = 
        (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
    const rootHasEffect = 
        (finishedWork.flags & MutationMask) !== NoFlags;


    if ( subtreeHasEffect || rootHasEffect ) {
        // beforeMutation

        // mutation Placement
        commitMutationEffects(finishedWork, root);

        root.current = finishedWork; 
        // layout阶段
    } else {
        root.current = finishedWork;
    }

    rootDoesHasPaassiveEffects = false;
    ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingsPassiveEffects) {
    pendingPassiveEffects.unmount.forEach(effect => {
        // 首先卸载的情况
        commitHookEffectListUnmount(Passive, effect );
    })
    pendingPassiveEffects.unmount = [];

    pendingPassiveEffects.update.forEach(effect => {
        commitHookEffectListDestroy(Passive | HookHasEfffect, effect);
    })

    pendingPassiveEffects.update.forEach(effect => {
        commitHookEffectListCreate(Passive | HookHasEfffect, effect);
    })
    pendingPassiveEffects.update = [];
    flushSyncCallbacks();
}

function workLoop() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(fiber: FiberNode) {
    // next为子fiber就继续向下遍历 如果为null就结束
    const next = beginWork(fiber, wipRootRenderLane);
    // 开始工作前的props pendingProps
    // 工作完之后是memorizedProps
    fiber.memorizedProps = fiber.pendingProps;

    if (next === null) {
        // 到子为空了就需要归
        completeUnitOfWork(fiber);
    } else {
        workInProgress = next;
    }
}

// 遍历兄弟节点
function completeUnitOfWork(fiber: FiberNode) {
    let node: FiberNode | null = fiber;

    do {
        completeWork(node); // dom保存stateNode
        // 找兄弟节点
        const sibling = node.sibling;

        if (sibling !== null) {
            workInProgress = sibling;
            return;
        }

        node = node.return;
        workInProgress = node;
    } while(node !== null)
}
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber";
import { beginWork } from "./beginWork";
import { completeWork } from "./completeWork";
import { HostRoot } from "./workTags";
import { MutationMask, NoFlags } from "./fiberFlags";
import { commitMutationEffects } from "./commitWork";

// 全局指针，指向现在当前正在工作的fiberNode
let workInProgress: FiberNode | null = null;

// 用于执行初始化操作
// 主要用于将workInProgress赋值为当前工作的fiberNode
function prepareFreshStack(root: FiberRootNode) {
    workInProgress = createWorkInProgress(root.current, {});
}


// 连接renderRoot和updateContainer方法
// 在fiber中调度update
export function scheduleUpdateOnFiber(fiber: FiberNode) {
    // 调度功能

    // 首屏渲染传入的fiber是hostRootFiber
    // 对于setState是根节点fiberRootNode

    // 这个root就是fiberRootNode
    const root = markUpdateFromFiberToRoot(fiber);
    renderRoot(root);
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

function renderRoot(root: FiberRootNode) {
    // 初始化
    // 让workInProgress指向当前的fiberNode
    prepareFreshStack(root);


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

    // wip fiberNode树 以及树中的flags
    commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
    const finishedWork = root.finishedWork;

    if (finishedWork === null) return;

    if (__DEV__) console.warn("commit阶段开始", finishedWork);

    // 重置操作
    root.finishedWork = null;

    // 判断是否存在3个子阶段需要执行的操作
    // root本身的flags 以及root的subFlags
    const subtreeHasEffect = 
        (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
    const rootHasEffect = 
        (finishedWork.flags & MutationMask) !== NoFlags;


    if ( subtreeHasEffect || rootHasEffect ) {
        // beforeMutation

        // mutation Placement
        commitMutationEffects(finishedWork);

        root.current = finishedWork; 
        // layout阶段
    } else {
        root.current = finishedWork;
    }

}

function workLoop() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(fiber: FiberNode) {
    // next为子fiber就继续向下遍历 如果为null就结束
    const next = beginWork(fiber);
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
        completeWork(node);
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
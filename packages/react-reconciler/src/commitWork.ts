import { Container, appendChildToContainer, commitUpdate, removeChild } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from "./fiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";

let nextEffect: FiberNode | null = null; 

export const commitMutationEffects = (finishedWork: FiberNode) => {
    nextEffect = finishedWork;

    while (nextEffect !== null) {
        // 向下遍历
        const child: FiberNode | null = nextEffect.child;

        if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
            nextEffect = child;
        } else {
            // 向上遍历 DFS 遍历可能不是最深的节点 可能是第一个subtreeFlags 
            up: while (nextEffect !== null) {
                commitMutationEffectsOnFiber(nextEffect);
                const sibling: FiberNode | null = nextEffect.sibling;

                if (sibling !== null) {
                    nextEffect = sibling;
                    break up;
                }
                nextEffect = nextEffect.return;
            }
        }
    }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
    const flags = finishedWork.flags;

    // 先执行对应方法 然后删除
    if ((flags & Placement) !== NoFlags) {
        // 执行对应的方法
        commitPlacement(finishedWork);
        // 移除flags
        finishedWork.flags &= ~Placement;
    }
    // flags Update
    if ((flags & Update) !== NoFlags) {

        commitUpdate(finishedWork);
        finishedWork.flags &= ~Update;
    }
    // flags ChildDeletion
    if ((flags & ChildDeletion) !== NoFlags) {
        const deletions = finishedWork.deletions;
        if (deletions !== null) {
            // 数组中每一个节点都是需要被删除的fiber
            deletions.forEach(childToDelete => {
                commitDeletion(childToDelete);
            })
        }
        finishedWork.flags &= ~ChildDeletion;
    }
}

function commitDeletion(childToDelete: FiberNode) {
    let rootHostNode: FiberNode | null = null; // 根 

    // 递归子树
    commitNestedComponent(childToDelete, unmountFiber => {
        switch(unmountFiber.tag) {
            case HostComponent:
                if (rootHostNode === null) {
                    rootHostNode = unmountFiber; 
                }
                // TODO 解绑ref
                return;
            case HostText:
                if (rootHostNode === null) {
                    rootHostNode = unmountFiber; 
                }
                return
            case FunctionComponent:
                // TODO useEffect unmount
                return;
            default:
                if (__DEV__) {
                    console.warn("未处理的unmount类型", unmountFiber);
                }
                break;
        }
    });
    // 移除rootHostComponent的DOM
    if (rootHostNode !== null) {
        const hostParent = getHostParent(childToDelete);
        removeChild((rootHostNode as FiberNode).stateNode , hostParent!);
    } 

    childToDelete.return = null;
    childToDelete.child = null;
}

function commitNestedComponent(
    root: FiberNode, 
    onCommitUnmount: (fiber: FiberNode) => void
) {
    let node = root;
    while(true) {
        onCommitUnmount(node);

        if (node.child !== null) {
            // 向下遍历
            node.child.return = node;
            node = node.child;
            continue;
        }

        if (node === root) {
            // 终止条件
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === root) {
                return;
            }
            // 向上归
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}

const commitPlacement = (finishedWork: FiberNode) => {
    // 父级的dom
    // finishedWork的DOM节点
    if (__DEV__) {
        console.warn("执行placement", finishedWork);
    }

    // parent DOM 
    const hostParent = getHostParent(finishedWork);
    // finishedWork ~~ Dom append parent dom
    if (hostParent !== null) appendPlacementNodeIntoContainer(finishedWork, hostParent);   
}

/**
 * 获取父级的节点
 * @param fiber 
 * @returns 
 */
function getHostParent(fiber: FiberNode): Container | null{
    let parent = fiber.return;

    while(parent) {
        const parentTag = parent.tag;
        // HostComponent HostRoot
        if (parentTag === HostComponent) {
            return parent.stateNode as Container; 
        }

        if (parentTag === HostRoot ) {
            return (parent.stateNode as FiberRootNode).container;
        }

        parent = parent.return;
    }

    if (__DEV__) {
        console.warn("未找到host parent");
    }

    return null;
}

function appendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container) {
    // fiber host
    if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
        appendChildToContainer(hostParent, finishedWork.stateNode);
        return;
    }

    const child = finishedWork.child;
    
    if (child !== null) {
        appendPlacementNodeIntoContainer(child, hostParent);
        let sibling = child.sibling;

        while (sibling !== null) {
            appendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}
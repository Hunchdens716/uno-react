import { Container, Instance, appendChildToContainer, commitUpdate, insertChildToContainer, removeChild } from "hostConfig";
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

function recordHostChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
    // 1.找到第一个root host节点
    let lastOne = childrenToDelete[childrenToDelete.length - 1];

    if (!lastOne) {
        childrenToDelete.push(unmountFiber);
    } else {
        let node = lastOne.sibling;
        while(node !== null) {
            if (unmountFiber === node) {
                childrenToDelete.push(unmountFiber);
            }
            node = node.sibling;
        }
    }
    // 2.每找到一个Host节点，判断这个节点是不是 1.找到那个节点的兄弟节点

}

function commitDeletion(childToDelete: FiberNode) {
    const rootChildrenToDelete: FiberNode[] = []; // 根 

    // 递归子树
    commitNestedComponent(childToDelete, unmountFiber => {
        switch(unmountFiber.tag) {
            case HostComponent:
                // if (rootHostNode === null) {
                //     rootHostNode = unmountFiber; 
                // }
                recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
                // TODO 解绑ref
                return;
            case HostText:
                // if (rootHostNode === null) {
                //     rootHostNode = unmountFiber; 
                // }
                recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
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
    if (rootChildrenToDelete.length) {
        const hostParent = getHostParent(childToDelete);
        if (hostParent !== null) {
            rootChildrenToDelete.forEach(node => {
                removeChild(node.stateNode, hostParent);
            })
        }
        // removeChild((rootHostNode as FiberNode).stateNode , hostParent!);
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

    // host sibling
    const sibling = getHostSibling(finishedWork);

    // finishedWork ~~ Dom append parent dom
    if (hostParent !== null) {
        insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);  
    } 
}

function getHostSibling(fiber: FiberNode) {
    let node: FiberNode = fiber;

    findSibling: while(true) {
        // 没找到的话 就去找父节点
        while (node.sibling === null) {
            const parent = node.return;

            if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
                return null;
            }
            node = parent;
        }

        // 先遍历同级的兄弟节点
        node.sibling.return = node.return;
        node = node.sibling;

        while (node.tag !== HostText && node.tag !== HostComponent) {
            // 向下遍历找子孙节点
            if ((node.flags & Placement) !== NoFlags ) {
                // 节点正在移动是不稳定的
                continue findSibling;
            }

            if (node.child === null) {
                // 已经找到底了
                continue findSibling;
            } else {
                node.child.return = node;
                node = node.child;
            }
        }

        if ((node.flags & Placement) === NoFlags) {
            return node.stateNode;
        }
    }
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

function insertOrAppendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container, before?: Instance) {
    // fiber host
    if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
        if (before) {
            insertChildToContainer(finishedWork.stateNode, hostParent, before);
        } else {
            appendChildToContainer(hostParent, finishedWork.stateNode);
        }
        
        return;
    }

    const child = finishedWork.child;
    
    if (child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, hostParent);
        let sibling = child.sibling;

        while (sibling !== null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}
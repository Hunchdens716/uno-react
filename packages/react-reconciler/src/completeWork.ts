import { FiberNode } from "./fiber";
import { NoFlags } from "./fiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { createInstance, createTextInstance, appendInitialChild, Container } from "hostConfig";

// 递归中的归阶段
export const completeWork = (wip: FiberNode) => {
    // 比较，返回子 fiberNode

    const newProps = wip.pendingProps;
    const current = wip.alternate;

    switch (wip.tag) {
        case HostComponent:
            // HostComponent的stateNode保存的就是当前的dom节点
            if (current !== null && wip.stateNode) {
                // update
            } else {
                // 1.构建dom
                const instance = createInstance(wip.type, newProps);
                // 2.将dom插入到dom树中
                appendAllChildren(instance, wip);
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            return null;
        case HostText:
            if (current !== null && wip.stateNode) {
                // update
            } else {
                // 1.构建dom              
                const instance = createTextInstance(newProps.content);
                // 不存在child所以不需要挂载
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            return null;
        case HostRoot:
            bubbleProperties(wip);
            return null;
        case FunctionComponent:
            bubbleProperties(wip);
            return null;
        default:
            if (__DEV__) {
                console.warn("来处理的completeWork情况", wip);
            }
            break;
    }

    return null;
}

// parent插入wip
// 但是wip可能有点问题 可能是函数组件
// 需要找到div或者text
// 递归类似begin Complete Work
// 递归过程
function appendAllChildren(parent: Container, wip: FiberNode) {
    let node = wip.child;

    // 插入的可能有兄弟节点
    while(node !== null) {
        if (node?.tag === HostComponent || node?.tag === HostText) {
            appendInitialChild(parent, node.stateNode);
        } else if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }

        if (node === wip) return;

        while (node.sibling === null) {
            if (node.return === null || node.return === wip) {
                return;
            }
            node = node?.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}


// 因为是向上的过程 可以将子节点的props冒泡到父节点
function bubbleProperties(wip: FiberNode) {
    let subtreeFlags = NoFlags;
    let child = wip.child; 

    // 遍历所有子节点的childFlags
    while (child !== null) {
        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        child.return = wip;
        child = child.sibling;
    }
    wip.subtreeFlags |= subtreeFlags; 
}
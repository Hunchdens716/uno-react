import { Props, Key, Ref } from "../../shared/ReactTypes";
import { WorkTag } from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";

/**
 * jsx("div")
 * 
 * null
 * 
 * placement fiberNode
 */

export class FiberNode {
    type: any;
    tag: WorkTag;
    pendingProps: Props;
    key: Key;
    stateNode: any;
    ref: Ref;

    return: FiberNode | null;
    child: FiberNode | null;
    sibling: FiberNode | null;
    index: number;

    memorizedProps: Props | null;
    memorizedState: any;

    /** fiber树切换 */
    alternate: FiberNode | null;   // 当前是current 就指向 alternate // 当前是alternate 就指向 current
    /** 副作用 */
    flags: Flags; // 保存对应的标记

    updateQueue: unknown;

    constructor(tag: WorkTag, pendingProps: Props, key: Key) {
        this.tag = tag;
        this.key =key,
        // HostComponent 如果是<div>的话 保存的就是 div 这个 DOM
        this.stateNode = null;
        // FunctionComponent () => {} FiberNode的类型
        this.type = null;

        // 构成树状结构(节点间的关系)
        // 指向父fibernode 
        this.return = null;
        // 兄弟
        this.sibling = null;
        // 子
        this.child = null;
        // 同级有很多个 
        this.index = 0;

        this.ref = null;

        // 作为工作单元
        // 刚开始的props
        this.pendingProps = pendingProps;
        // 工作完后的props 确定的props
        this.memorizedProps = null;
        this.memorizedState = null;
        this.updateQueue = null;

        this.alternate = null;
        this.flags = NoFlags;
    }
}

export class FiberRootNode {
    container: Container;
    current: FiberNode;
    // 更新完成后的FiberNode 
    finishedWork: FiberNode | null;
    constructor(container: Container, hostRootFiberNode: FiberNode) {
        this.container = container;
        this.current = hostRootFiberNode;

        hostRootFiberNode.stateNode = this;
        this.finishedWork = null;
    }
} 

export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
    let wip = current.alternate;

    if (wip === null) {
        // mount
        wip = new FiberNode(current.tag, pendingProps, current.key);
        wip.type = current.type;
        wip.stateNode = current.stateNode;

        wip.alternate = current;
        current.alternate = wip;
    } else {
        // update
        wip.pendingProps = pendingProps;
        wip.flags = NoFlags;
    }

    wip.type = current.type; 
    wip.updateQueue = current.updateQueue;
    wip.child = current.child;
    wip.memorizedProps = current.memorizedProps;
    wip.memorizedState = current.memorizedState;

    return wip;
}
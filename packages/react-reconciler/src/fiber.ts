import { Props, Key, Ref, ReactElementType } from "../../shared/ReactTypes";
import { Fragment, FunctionComponent, HostComponent, WorkTag } from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "hostConfig";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";

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
    flags: Flags; // 保存对应的标记, 就是插入之类的操作
    subtreeFlags: Flags;
    updateQueue: unknown;
    deletions: FiberNode[] | null;

    constructor(tag: WorkTag, pendingProps: Props, key: Key) {
        this.tag = tag;
        this.key = key || null,
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
        // 工作完成后的state
        this.memorizedState = null;
        this.updateQueue = null;

        this.alternate = null;
        this.flags = NoFlags;
        this.subtreeFlags = NoFlags;
        this.deletions = null;
    }
}

/** 做为全局根节点 */
export class FiberRootNode {
    container: Container; // 保存rootElement 不同环境不一样
    current: FiberNode; // 指向hostRootFiber
    finishedWork: FiberNode | null; // 更新完成后的FiberNode 
    pendingLanes: Lanes;
    finishedLane: Lane;
    constructor(container: Container, hostRootFiberNode: FiberNode) {
        this.container = container;
        this.current = hostRootFiberNode;

        hostRootFiberNode.stateNode = this;
        this.finishedWork = null;
        this.pendingLanes = NoLanes;
        this.finishedLane = NoLane;
    }
} 

/**
 * 用来创建workinProgress
 * @param current 
 * @param pendingProps 
 * @returns 
 */
export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
    let wip = current.alternate;

    if (wip === null) {
        // 对于首屏渲染，他就是null
        // mount
        wip = new FiberNode(current.tag, pendingProps, current.key);
        wip.type = current.type;
        wip.stateNode = current.stateNode;

        wip.alternate = current;
        current.alternate = wip;
    } else {
        // update
        wip.pendingProps = pendingProps;
        // 副作用都清除掉 可能是上次
        wip.flags = NoFlags;
        wip.subtreeFlags = NoFlags;
        wip.deletions = null;
    }

    wip.type = current.type; 
    wip.updateQueue = current.updateQueue; // updateQueue使用pending对象的好处是可以公用一个
    wip.child = current.child;
    wip.memorizedProps = current.memorizedProps;
    wip.memorizedState = current.memorizedState;

    return wip;
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
    const { type, key, props } = element;
    let fiberTag: WorkTag = FunctionComponent;

    if (typeof type === "string") {
        // <div/> type: "div"
        fiberTag = HostComponent;
    } else if (typeof type !== "function" && __DEV__) {
        console.warn("未定义的type类型", element)
    }
    const fiber = new FiberNode(fiberTag, props, key);
    fiber.type = type;
    return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
    const fiber = new FiberNode(Fragment, elements, key);
    return fiber;
}
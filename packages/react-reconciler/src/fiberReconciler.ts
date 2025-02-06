import { Container } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { HostRoot } from "./workTags";
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from "./updateQueue";
import { ReactElementType } from "shared/ReactTypes";
import { Update } from "./fiberFlags";
import { scheduleUpdateOnFiber } from "./workLoop";
import { requestUpdateLanes } from "./fiberLanes";


// fiberRootNode -> hostRootFiber -> App

// createRoot执行
// ReactDOM.createRoot内部执行createContainer
export function createContainer(container: Container) {
    // 1. 创建hostRootFiber
    const hostRootFiber = new FiberNode(HostRoot, {}, null);
    // 2. 创建fiberRootNode
    const root = new FiberRootNode(container, hostRootFiber);

    hostRootFiber.updateQueue = createUpdateQueue();

    return root;
}

// render方法 执行updateContainer
export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
    const hostRootFiber = root.current;
    const lane = requestUpdateLanes();
    const update = createUpdate<ReactElementType | null>(element, lane);
    // 插入updateQueue
    enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>, update);
    
    scheduleUpdateOnFiber(hostRootFiber, lane)
    return element;
}
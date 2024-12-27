import { Container } from "hostConfig";
import { FiberNode, FiberRootNode } from "./fiber";
import { HostRoot } from "./workTags";
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from "./updateQueue";
import { ReactElementType } from "shared/ReactTypes";
import { Update } from "./fiberFlags";
import { scheduleUpdateOnFiber } from "./workLoop";


// fiberRootNode -> hostRootFiber -> App

// createRoot执行
export function createContainer(container: Container) {
    const hostRootFiber = new FiberNode(HostRoot, {}, null);
    const root = new FiberRootNode(container, hostRootFiber);

    hostRootFiber.updateQueue = createUpdateQueue();

    return root;
}

// render方法
export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
    const hostRootFiber = root.current;
    const update = createUpdate<ReactElementType | null>(element);

    enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>, update);
    
    scheduleUpdateOnFiber(hostRootFiber)
    return element;
}
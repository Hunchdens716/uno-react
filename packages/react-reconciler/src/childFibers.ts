import { Props, ReactElementType } from "shared/ReactTypes";
import { createFiberFromElement, createWorkInProgress, FiberNode } from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { HostText } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

/**
 * 生成子节点
 * 标记的方法
 * @param shouldTrackEffects 
 * @returns 
 */
function ChildReconciler(shouldTrackEffects: boolean) {

    function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
        if (!shouldTrackEffects) return;
        // deletions保存父节点需要删除的子节点
        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        } else {
            deletions.push(childToDelete);
        }
    }

    function reconcilSingleElement(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        element: ReactElementType
    ) {
        const key = element.key;
        work: if (currentFiber !== null) {
            // update情况
            if (currentFiber.key === key) {
                // type相同
                if (element.$$typeof === REACT_ELEMENT_TYPE) {
                    // 单节点情况
                    if (currentFiber.type === element.type) {
                        // type相同
                        const exiting = useFiber(currentFiber, element.props);
                        exiting.return = returnFiber;
                        return exiting;
                    }
                    // 删掉旧的
                    deleteChild(returnFiber, currentFiber);
                    break work;
                } else {
                    if (__DEV__) {
                        console.warn("还未实现的react类型", element);
                        break work;
                    }
                }
            } else {
                // 删掉旧的
                deleteChild(returnFiber, currentFiber);
            }
        }
        // 根据element创建fiber返回
        const fiber = createFiberFromElement(element);
        fiber.return = returnFiber;
        // 生成子fiber
        return fiber;
    }

    function reconcilSingleTextNode(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        content: string | number
    ) {
        if (currentFiber !== null) {
            // update
            if (currentFiber.tag = HostText) {
                // 类型没变，可以复用
                const exiting = useFiber(currentFiber, { content });
                exiting.return = returnFiber;
                return exiting;
            }
            // 一开始是div现在是text
            deleteChild(returnFiber, currentFiber);
        }
        const fiber = new FiberNode(HostText, {content}, null);
        fiber.return = returnFiber;
        return fiber;
    }

    function placeSingleChild(fiber: FiberNode) {
        // current为null就是首屏
        // 传进来的是刚创建的fiber 并且fiber为wip 因此alternate为current
        // 首屏为null
        if (shouldTrackEffects && fiber.alternate === null) {
            // 首屏渲染
            fiber.flags |= Placement;
        }
        return fiber;
    }


    // 利用shouldTrackEffects做性能优化
    return function reconcilerChildFibers(
        returnFiber: FiberNode, // 父亲fiber
        currentFiber: FiberNode | null, // 当前子节点的current fiberNode
        newChild?: ReactElementType // ReactElement
    ) {
        // 判断当前fiber的类型
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcilSingleElement(returnFiber, currentFiber, newChild));
                default:
                    if (__DEV__) {
                        console.warn("未实现的reconcile类型", newChild);
                    }
                    break;
            }
        }
        // TODO 多节点的情况 ul > 3li

        // HostText
        if (typeof newChild === "number" || typeof newChild === "string") {
            return placeSingleChild(reconcilSingleTextNode(returnFiber, currentFiber, newChild));
        }

        if (currentFiber !== null) {
            // 兜底情况
            deleteChild(returnFiber, currentFiber);
        }
        

        if (__DEV__) {
            console.warn("未实现的reconcile类型", newChild);
        }

        return null;
    }
}

/**
 * 处理复用情况
 * @param fiber 
 * @param pendingProps 
 * @returns 
 */
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
}

export const reconcilChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
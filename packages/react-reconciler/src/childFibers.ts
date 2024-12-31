import { ReactElementType } from "shared/ReactTypes";
import { createFiberFromElement, FiberNode } from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { HostText } from "./workTags";
import { Placement } from "./fiberFlags";

/**
 * 生成子节点
 * 标记的方法
 * @param shouldTrackEffects 
 * @returns 
 */
function ChildReconciler(shouldTrackEffects: boolean) {

    function reconcilSingleElement(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        element: ReactElementType
    ) {
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

        if (__DEV__) {
            console.warn("未实现的reconcile类型", newChild);
        }

        return null;
    }
}

export const reconcilChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
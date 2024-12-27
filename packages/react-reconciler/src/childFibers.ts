import { ReactElementType } from "shared/ReactTypes";
import { FiberNode } from "./fiber";

function ChildReconciler(shouldTrackEffects: boolean) {
    return function reconcilerChildFibers(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        newChild?: ReactElementType
    ) {
        // 判断当前fiber的类型
    }
}

export const reconcilChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
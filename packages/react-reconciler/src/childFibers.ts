import { Key, Props, ReactElementType } from "shared/ReactTypes";
import { createFiberFromElement, createFiberFromFragment, createWorkInProgress, FiberNode } from "./fiber";
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";
import { Fragment, HostText } from "./workTags";
import { ChildDeletion, Placement } from "./fiberFlags";

type ExistingChildren = Map<string | number, FiberNode>;
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

    function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null) {
        if (!shouldTrackEffects) {
            return;
        }
        let childToDelete = currentFirstChild;
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
    }

    function reconcilSingleElement(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        element: ReactElementType
    ) {
        const key = element.key;
        while (currentFiber !== null) {
            // update情况
            if (currentFiber.key === key) {
                // key相同
                if (element.$$typeof === REACT_ELEMENT_TYPE) {
                    // 单节点情况
                    if (currentFiber.type === element.type) {
                        let props = element.props;
                        if (element.type === REACT_FRAGMENT_TYPE) {
                            props = element.props.children;
                        }
                        // type相同(复用当前节点)
                        const exiting = useFiber(currentFiber, props);
                        exiting.return = returnFiber;
                        // 当前节点可服用，标记剩下节点删除
                        deleteRemainingChildren(returnFiber, currentFiber.sibling);
                        return exiting;
                    }
                    // key相同，type不同，删掉所有旧的
                    // deleteChild(returnFiber, currentFiber);
                    deleteRemainingChildren(returnFiber, currentFiber);
                    break;
                } else {
                    if (__DEV__) {
                        console.warn("还未实现的react类型", element);
                        break;
                    }
                }
            } else {
                // key不同，删掉旧的,再去遍历其他的
                deleteChild(returnFiber, currentFiber);
                currentFiber = currentFiber.sibling;
            }
        }
        // 遍历完，根据element创建fiber返回
        let fiber;
        if (element.type === REACT_FRAGMENT_TYPE) {
            fiber = createFiberFromFragment(element.props.children, key);
        } else {
            fiber = createFiberFromElement(element);
        }
        fiber.return = returnFiber;
        // 生成子fiber
        return fiber;
    }

    function reconcilSingleTextNode(
        returnFiber: FiberNode,
        currentFiber: FiberNode | null,
        content: string | number
    ) {
        while (currentFiber !== null) {
            // update
            if (currentFiber.tag = HostText) {
                // 类型没变，可以复用
                const exiting = useFiber(currentFiber, { content });
                exiting.return = returnFiber;
                deleteRemainingChildren(returnFiber, currentFiber.sibling);
                return exiting;
            }
            // 一开始是div现在是text
            // 当前节点不能复用
            deleteChild(returnFiber, currentFiber);
            currentFiber = currentFiber.sibling;
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

    function reconcileChildrenArray(returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild: any[]) {
        
        // 最后一个可复用fiber在current中的index
        let lastPlaceIndex: number = 0;
        // 创建的最后一个fiber
        let lastNewFiber: FiberNode | null = null;
        // 创建的第一个fiber
        let firstNewFiber: FiberNode | null = null;

        // 1.将current保存在map中
        const exitingChildren: ExistingChildren = new Map();
        let current = currentFirstChild;
        while (current !== null) {
            // 使用key或者索引位置作为key
            const keyToUse = current.key !== null ? current.key : current.index;
            exitingChildren.set(keyToUse, current);
            current = current.sibling;
        }

        for (let i = 0; i < newChild.length; i++) {
            // 2.遍历newChild,寻找是否可复用
            const after = newChild[i];
            
            const newFiber = updateFromMap(returnFiber, exitingChildren, i, after);

            if (newFiber === null) {
                continue;
            }

            // 3.标记移动还是插入
            newFiber.index = i;
            newFiber.return = returnFiber;

            if (lastNewFiber === null) {
                lastNewFiber = newFiber;
                firstNewFiber = newFiber;
            } else {
                lastNewFiber.sibling = newFiber;
                lastNewFiber = lastNewFiber.sibling;
            }

            if (!shouldTrackEffects) {
                continue;
            }

            const current = newFiber.alternate;
            if (current !== null) {
                const oldIndex = current.index;
                if (oldIndex < lastPlaceIndex) {
                    // 移动
                    newFiber.flags |= Placement;
                    continue;
                } else {
                    // 不移动
                    lastPlaceIndex = oldIndex;
                }
            } else {
                // mount插入
                newFiber.flags |= Placement;
            }
        }
        
        // 4.将Map中剩下的标记为删除
        exitingChildren.forEach(fiber => {
            deleteChild(returnFiber, fiber);
        });

        return firstNewFiber;
    }

    function updateFromMap(returnFiber: FiberNode, exitingChildren: ExistingChildren, index: number, element: any): FiberNode | null {
        const keyToUse = element.key !== null ? element.key : element.index;
        const before = exitingChildren.get(keyToUse) || null;

        // HostText
        if (typeof element === "string" || typeof element === "number") {
            
            if (before) {
                if (before.tag === HostText) {
                    exitingChildren.delete(keyToUse);
                    return useFiber(before, { content: element + '' });
                }
            }
            return new FiberNode(HostText, { content: element + '' }, null);
        }

        // ReactElement
        if ( typeof element === "object" && element !== null) {
            switch(element.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    if (element.type === REACT_FRAGMENT_TYPE) {
                        // 数组某一项是fragment
                        return updateFragment(returnFiber, before, element, keyToUse, exitingChildren);
                    }
                    if (before) {
                        if (before.type === element.type) {
                            exitingChildren.delete(keyToUse);
                            return useFiber(before, element.props);
                        }
                    }
                    return createFiberFromElement(element);
            }

            // TODO 数组类型
            if (Array.isArray(element) && __DEV__) {
                console.warn("还未实现数组类型的child");
                return null;
            }
        }

        if (Array.isArray(element)) {
            return updateFragment(returnFiber, before, element, keyToUse, exitingChildren);
        }

        return null;         
    }


    // 利用shouldTrackEffects做性能优化
    return function reconcilerChildFibers(
        returnFiber: FiberNode, // 父亲fiber
        currentFiber: FiberNode | null, // 当前子节点的current fiberNode
        newChild?: any // ReactElement
    ) {
        // 判断Fragment
        const isUnkeyedTopLevelFragment = typeof newChild === "object" && newChild !== null && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null;
        if (isUnkeyedTopLevelFragment) {
            newChild = newChild.props.children; // 是个数组
        }
        // 判断当前fiber的类型
        if (typeof newChild === 'object' && newChild !== null) {
            // TODO 多节点的情况 ul > 3li
            if (Array.isArray(newChild)) {
                return reconcileChildrenArray(returnFiber, currentFiber, newChild)
            }
            
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcilSingleElement(returnFiber, currentFiber, newChild));
                default:
                    if (__DEV__) {
                        console.warn("未实现的reconcile类型", newChild);
                    }
                    break;
            }
            // TODO 多节点的情况 ul > 3li
            if (Array.isArray(newChild)) {
                return reconcileChildrenArray(returnFiber, currentFiber, newChild)
            }
        }
        

        // HostText
        if (typeof newChild === "number" || typeof newChild === "string") {
            return placeSingleChild(reconcilSingleTextNode(returnFiber, currentFiber, newChild));
        }

        if (currentFiber !== null) {
            // 兜底情况
            deleteRemainingChildren(returnFiber, currentFiber);
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

function updateFragment(returnFiber: FiberNode, current: FiberNode | null, elements: any[], key: Key, exitingChildren: ExistingChildren) {
    let fiber;
    if (!current || current.tag !== Fragment) {
        fiber = createFiberFromFragment(elements, key);
    } else {
        // 复用
        exitingChildren.delete(key);
        fiber = useFiber(current, elements);
    }
    fiber.return = returnFiber;
    return fiber;
}

export const reconcilChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
import { FiberRootNode } from "./fiber";

export type Lane = number;
export type Lanes = number;

// 对于lane越小 优先级越高
export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
    return laneA | laneB;
}

export function requestUpdateLanes() {
    return SyncLane;
}

/**
 * 返回Lane中优先级最高的Lane
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
    return lanes & -lanes;
}

/**
 * 移除传入的lane
 * @param root 
 * @param lane 
 */
export function markRootFinished(root: FiberRootNode, lane: Lane) {
    root.pendingLanes &= ~lane;
}
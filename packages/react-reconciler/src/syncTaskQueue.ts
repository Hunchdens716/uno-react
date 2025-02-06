let syncQueue: ((...args: any) => void)[] | null = null;
let isFlushingSyncQueue = false;
// 调度
export function scheduleSyncCallback(callback: (...args: any) => void) {
     if (syncQueue === null) {
        // 传人的回调函数是同步调度的第一个回调函数
        syncQueue = [callback];
     } else {
        syncQueue.push(callback);
     }
}

// 执行
export function flushSyncCallbacks() {
    if (!isFlushingSyncQueue && syncQueue) {
        isFlushingSyncQueue = true;
        try {
            syncQueue.forEach(callback => callback());
        } catch(e) {
            if (__DEV__) {
                console.error("flushSyncCallback报错", e);
            }
        } finally {
            isFlushingSyncQueue = false;
            syncQueue = null;
        }
    }
}
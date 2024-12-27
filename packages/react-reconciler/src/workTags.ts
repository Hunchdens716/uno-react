/**
 * fiberNode是一个什么类型的节点
 */

export type WorkTag = |
    typeof FunctionComponent | 
    typeof HostRoot | 
    typeof HostComponent |
    typeof HostText;

export const FunctionComponent = 0;
export const HostRoot = 3; // ReactDOM.render() 挂载的根节点
export const HostComponent = 5; // div 节点
export const HostText = 6; // 123 文本
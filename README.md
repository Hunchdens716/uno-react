# 1.实现jsx方法
+ jsxDev方法 (dev环境)
+ jsx方法 (prod环境)
+ React.createElement方法

# 2.reconciler

jquery过程驱动 调用`宿主API`实现dom更新

UI框架状态驱动 

描述UI的方法(jsx/编译语法) ->[编译优化] 运行时核心框架(reconciler/renderer) -> 宿主API ->显示真实UI

+ 消费jsx
+ 没有编译优化(纯运行时前端框架)
+ 开放通用API供宿主环境使用

## 核心模块消费jsx过程

jsx(<div>111</div>) =>  _jsx =>(生成) ReactElement

ReactElement作为核心模块操作数据存在问题

+ 无法表达节点之间的关系
+ 字段有限，不好扩展（比如无法表达状态）
 
新的数据结构

+ 介于ReactElement与真实ui节点之间
+ 能够表达节点之间的关系
+ 方便拓展(不仅作为数据存储单元，也作为工作单元)

fiberNode 虚拟dom在React中的实现

jsx -> babel解析 -> ReactElement -> fiberNode(reconciler操作) -> Dom Element

ReactElement与fiberNode进行比较，根据比较结果生成子FiberNode
并且生成各种不同标记，对应不同宿主的API

### reconciler工作方式

对于同一个节点，比较其`ReactElement`和`FiberNode`, 生成子`FiberNode`, 并根据比较结果生成
不同标记（插入、删除、移动...），对应不同`宿主环境API`执行

当所有ReactElment比较完成后会生成一个fiberNode树，一共存在两颗fiberNode树

current 与视图中真实UI对应的fiberNode树
workInProgress 触发更新后，正在reconciler中计算的fiberNode树

** 双缓冲技术 **

![alt text](image.png)
export type Type = any;
export type Key = any;
export type Ref = any;
export type Props = any;
export type ElementType = any;

export interface ReactElementType {
    $$typeof: symbol | number;
    type: ElementType;
    key: Key;
    props: Props;
    ref: Ref;
    __mark: string;
}

// 本质就是个对象或者返回对象的方法
export type Action<State> = State | ((prevState: State) => State);
export interface Class {
    new(...args: any[]): any;
}

export type Instance<T extends Class> = InstanceType<T>;

export type FunctionLike = Function | Class;

export type FunctionWithReturn = (...args: any) => any;

export type FunctionWithPromiseReturn<T> = (...args: any) => Promise<T>;

export type AsyncType<T> =
    Promise<T> |
    FunctionWithPromiseReturn<T>;


export type Binding<Name extends string, I> = {[key in Name]: I};
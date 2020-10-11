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


export type Binding<Name extends string, T> = {[key in Name]: T};


export type ClassParam1<T extends new (p1: any, ...rest: any) => any> = T extends new(p1: infer P, ...rest: any) => any ? P : never;

export type ClassParam2<T extends new (p1: any, p2: any, ...rest: any) => any> = T extends new(p1: any, p2: infer P, ...rest: any) => any ? P : never;
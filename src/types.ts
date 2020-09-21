export interface Class {
    new(...args: any[]): any;
}

export type Instance<T extends Class> = InstanceType<T>;

export type FunctionLike = Function | Class;

export type FunctionWithReturn = (...args: any) => any;

export interface DependencyTree {
    leafs: DependencyTree[];
}


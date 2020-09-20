export interface Class {
    new(...args: any[]): any;
}

export type Instance<T> = T extends Class ? InstanceType<T> : any;

export type FunctionLike = Function | Class;

export interface DependencyTree {
    leafs: DependencyTree[];
}

export const enum FunctionType {
    Function, Class, ArrowFunction
}

export interface FunctionLikeStructure {
    type: FunctionType;
    arguments: string[];
    name: string;
    ref: FunctionLike;
}


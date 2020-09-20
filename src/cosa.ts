import {FunctionLike, Instance} from "./types";


interface ResolverOptions {
    depsTree?: any;
}

const enum Directive {
    Singleton,
    Stateless,
    SharedSigleton
}


export class Resolver {

    private readonly funs: FunctionLike[] = [];
    private dependencyTreeCache = null;

    add(fun: FunctionLike, ...funs: FunctionLike[]) {
        this.dependencyTreeCache = null; // invalidates cache
    }

    addWithTree() {

    }

    get(fun: FunctionLike): Instance<typeof fun> {

    }

    private buildDependencyTree(fun: FunctionLike): DependencyTree {

    }

    simulate(fun: FunctionLike) {

    }

    simulateAll() {

    }
}




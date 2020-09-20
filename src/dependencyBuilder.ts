import {DependencyTree, FunctionLikeStructure} from "./types";

// this is an idea :)
export const enum ArgumentNamingStyle {
    Exact, // uses the exact parameter value to search for a constructor function
    LowerCase, // whateverservice
    UpperCase, // WHATEVERSERVICE
    CamelCase, // whateverService
    PascalCase, // WhateverService,
    SnakeCase, // whatever_service
    SnakeUpperCase, // WHATEVER_SERVICE
    LeadingUnderscore = 32, // _(anything)
    TrailingUnderscore = 64, // (anything)_
    LeadingDollar = 128 // $(anything)
}


export function buildDependencyTree(funs: FunctionLikeStructure[]): DependencyTree {

}


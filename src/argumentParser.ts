import {FunctionLike, FunctionLikeStructure, FunctionType} from "./types";
import {includes} from "./pollyfills";

interface ParsedFunctionStructure {
    type: FunctionType,
    src: string,
    name: string
}

export function parse(fun: FunctionLike): FunctionLikeStructure {
    const str = getFunctionStructure(fun);
    const args = FunctionLikeArgumentParser.build(str.type).getArguments(str.src);

    return {
        name: str.name,
        type: str.type,
        arguments: args,
        ref: fun
    };
}

function getFunctionStructure(fun: FunctionLike): ParsedFunctionStructure {
    if (typeof fun !== 'function')
        throw `The type is ${typeof fun} and type function is required`;

    const name = fun.name;
    if (name == null || name.length === 0)
        throw 'Anonymous functions are not supported due to untraceability';

    const props = Object.getOwnPropertyNames(fun);
    const src = getCleanedSource(fun);

    if (isFunction(props, src))
        return {name, type: FunctionType.Function, src};

    if (isClass(props, src))
        return {name, type: FunctionType.Class, src};

    if (isArrow(props))
        return {name, type: FunctionType.ArrowFunction, src};

    throw `The type is composed of ${props} and it is not recognized`;

    function isFunction(props: string[], src: string) {
        const fi = src.indexOf('function');
        const bi = src.indexOf('{'); // this before function indicates a class instance
        // 'caller' and 'prototype' also part of function only when in non-strict mode but they are not meaningful
        return fi < bi && [ 'length', 'prototype', 'name' ].every(p => includes(props, p));
    }
    function isClass(props: string[], src: string) {
        const ci = src.indexOf('class');
        const bi = src.indexOf('{'); // this before function indicates a class instance
        return ci < bi && [ 'length', 'prototype', 'name' ].every(p => includes(props, p));
    }
    function isArrow(props: string[]) {
        return [ 'length', 'name' ].every(p => includes(props, p));
    }
}

function getCleanedSource(fun: FunctionLike) {
    return fun.toString()
        .replace(/\/\/.*/g, '')
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\/\*[^*]+\*\//g, '')
}

abstract class FunctionLikeArgumentParser {

    abstract getArguments(fun: string): string[];

    splitParams(match: RegExpExecArray | null) {
        if (match == null) {
            throw 'Could not find the parameters section';
        }
        return match[1].length === 0 ? [] : match[1]
            .replace(/\s/g, '')
            .split(',')
    }

    static build(funType: FunctionType): FunctionLikeArgumentParser {
        switch (funType) {
            case FunctionType.Function: return new FunctionArgumentParser();
            case FunctionType.Class: return new ClassArgumentParser();
            case FunctionType.ArrowFunction: return new ArrowArgumentParser();
        }
    }
}

class FunctionArgumentParser extends FunctionLikeArgumentParser{
    getArguments(src: string): string[] {
        const match = /function\s+[^(]*\(([^)]*)\)/.exec(src);
        return this.splitParams(match);
    }
}

class ClassArgumentParser extends FunctionLikeArgumentParser {
    getArguments(src: string): string[] {
        const match = /(?<!\w)constructor\s+[^(]*\(([^)]*)\)/.exec(src);
        return this.splitParams(match);
    }
}

class ArrowArgumentParser extends FunctionLikeArgumentParser {
    getArguments(src: string): string[] {
        const match = /\(([^)]*)\)\s*=>/.exec(src);
        return this.splitParams(match);
    }
}
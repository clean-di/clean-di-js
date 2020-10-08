


export class ArrayUtils {

    static find<T>(ar: T[], p: (e: T) => boolean): T | undefined {
        for (let i = 0; i < ar.length; i++) {
            if (p(ar[i])) return ar[i];
        }
        return undefined;
    }

    static includes<T>(ar: T[], e: T) {
        for (let i = 0; i < ar.length; i++) {
            if (ar[i]===e) return true;
        }
        return false;
    }
}


export class PromiseUtils {

    static timeout(p: Promise<any>, ms: number) {
        return Promise.race([
            p,
            new Promise((resolve, reject) => setTimeout(reject, ms))
        ]);
    }
}
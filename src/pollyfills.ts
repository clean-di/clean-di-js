export function includes<T>(ar: T[], e: T) {
    for (let i = 0; i < ar.length; i++) {
        if (ar[i]===e) return true;
    }
    return false;
}
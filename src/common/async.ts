/**
 * Race an array of promises, returning whichever finishes first
 */
export function race <T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
     for(const promise of promises)
        promise.then(resolve, reject);
  });
}

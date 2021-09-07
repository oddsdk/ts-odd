

export async function* previous(end, start) {
    console.log(end, start)
    if (start >= end) {
        throw ["lol", end, start]
    }
    const endL = (end / 100) | 0
    const startL = (start / 100) | 0
    const startLPlus = (startL + 1) * 100

    if (endL === startL || end === startLPlus) {
        const endM = (end / 10) | 0
        const startM = (start / 10) | 0
        const startMPlus = (startM + 1) * 10

        if (endM === startM || end === startMPlus) {
            const startPlus = start + 1

            if (end === startPlus) {
                console.log(start)
                yield start
            } else {
                yield* previous(end, startPlus)
                yield* previous(startPlus, start)
            }
        } else {
            yield* previous(end, startMPlus)
            yield* previous(startMPlus, start)
        }
    } else {
        yield* previous(end, startLPlus)
        yield* previous(startLPlus, start)
    }
}

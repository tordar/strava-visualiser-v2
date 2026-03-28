export function decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = []
    let index = 0, lat = 0, lng = 0

    while (index < encoded.length) {
        for (let field = 0; field < 2; field++) {
            let shift = 0, result = 0, byte: number
            do {
                byte = encoded.charCodeAt(index++) - 63
                result |= (byte & 0x1f) << shift
                shift += 5
            } while (byte >= 0x20)
            const delta = result & 1 ? ~(result >> 1) : result >> 1
            if (field === 0) lat += delta; else lng += delta
        }
        points.push([lat / 1e5, lng / 1e5])
    }
    return points
}

import { END, START, type Point } from './data'
import { premiers } from './premiers'

// Interpolate only at government boundaries so the stroke changes color exactly
// there. These drawing points are never presented as source observations.
export function splitByTerm(points: Point[], step = false) {
  return premiers.map((p, i) => {
    const start = Math.max(START, p.time)
    const end = premiers[i + 1]?.time ?? END
    const segment = points.filter(point => point.time >= start && point.time <= end)
    for (const time of [start, end]) {
      if (segment.some(point => point.time === time)) continue
      const next = points.findIndex(point => point.time > time)
      if (next <= 0) continue
      const a = points[next - 1], b = points[next]
      segment.push({ time, period: '', value: step ? a.value : a.value + (b.value - a.value) * (time - a.time) / (b.time - a.time) })
    }
    return segment.sort((a, b) => a.time - b.time)
  })
}

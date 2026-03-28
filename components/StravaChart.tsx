"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, Scatter, Cell } from "recharts"
import { StravaActivity } from "@/types/strava"
import { decodePolyline } from '@/lib/polyline'
import { AnimatedNumber } from './AnimatedNumber'
import { SpotlightCard } from './SpotlightCard'
import { Trophy, Medal } from 'lucide-react'

interface ChartComponentProps {
    activities: StravaActivity[]
}

interface ChartEntry {
    date: string
    fullDate: string
    name: string
    distance: number
    movingTime: number
    elevation: number
    isRace: boolean
    raceDistance: number | null
    polyline: [number, number][] | null
    pbMarkers?: PBMarker[]
    pbDistance?: number | null
}

interface PBMarker {
    distanceName: string
    displayName: string
    prRank: number
    movingTime: number
    effortDistance: number
    activityName: string
    fullDate: string
    polyline: [number, number][] | null
}

const PB_DISTANCES = ['1K', '5K', '10K', 'Half-Marathon', 'Marathon', '50K'] as const
const PB_DISPLAY_NAMES: Record<string, string> = {
    '1K': '1K', '5K': '5K', '10K': '10K',
    'Half-Marathon': 'Half Marathon', 'Marathon': 'Marathon', '50K': '50K',
}
const PB_RANK_COLORS: Record<number, { fill: string; stroke: string; glow: string }> = {
    1: { fill: '#fbbf24', stroke: '#fcd34d', glow: 'rgba(251,191,36,0.15)' },
    2: { fill: '#9ca3af', stroke: '#d1d5db', glow: 'rgba(156,163,175,0.15)' },
    3: { fill: '#d97706', stroke: '#f59e0b', glow: 'rgba(217,119,6,0.15)' },
}

function formatPace(seconds: number, meters: number): string {
    if (meters === 0) return '—'
    const paceSeconds = seconds / (meters / 1000)
    const m = Math.floor(paceSeconds / 60)
    const s = Math.round(paceSeconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
}

function MiniRoute({ points, size = 160 }: { points: [number, number][]; size?: number }) {
    if (points.length < 2) return null
    const lats = points.map(p => p[0])
    const lngs = points.map(p => p[1])
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)

    const midLat = (minLat + maxLat) / 2
    const lngScale = Math.cos((midLat * Math.PI) / 180)

    const rawW = (maxLng - minLng) * lngScale || 0.0001
    const rawH = (maxLat - minLat) || 0.0001

    // Fit into fixed square, centered
    const pad = 12
    const inner = size - pad * 2
    const scale = inner / Math.max(rawW, rawH)
    const routeW = rawW * scale
    const routeH = rawH * scale
    const offsetX = pad + (inner - routeW) / 2
    const offsetY = pad + (inner - routeH) / 2

    const coords = points.map(([lat, lng]) => {
        const x = offsetX + (lng - minLng) * lngScale * scale
        const y = offsetY + (maxLat - lat) * scale
        return [x, y] as [number, number]
    })

    const svgPoints = coords.map(([x, y]) => `${x},${y}`).join(' ')
    const [sx, sy] = coords[0]
    const [ex, ey] = coords[coords.length - 1]

    return (
        <svg width={size} height={size}>
            <polyline points={svgPoints} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
            <circle cx={sx} cy={sy} r={2.5} fill="#22c55e" />
            <circle cx={ex} cy={ey} r={2.5} fill="#ef4444" />
        </svg>
    )
}

function RacePopup({ entry }: { entry: ChartEntry }) {
    return (
        <div className="bg-[#1c1c26]/95 backdrop-blur-sm border border-amber-500/20 rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[200px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-amber-400 font-semibold text-xs uppercase tracking-wide">Race</p>
                    <p className="text-white font-semibold text-sm leading-tight truncate max-w-[180px]">{entry.name}</p>
                </div>
            </div>
            <p className="text-[#52525b] text-[10px] mb-2">{entry.fullDate}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Distance</p>
                    <p className="text-white text-sm font-bold tabular-nums">{entry.distance.toFixed(2)} km</p>
                </div>
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Time</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatDuration(entry.movingTime)}</p>
                </div>
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Pace</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatPace(entry.movingTime, entry.distance * 1000)} /km</p>
                </div>
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Elevation</p>
                    <p className="text-white text-sm font-bold tabular-nums">{Math.round(entry.elevation)} m</p>
                </div>
            </div>
            {entry.polyline && entry.polyline.length > 1 && (
                <div className="mt-2 flex justify-center">
                    <MiniRoute points={entry.polyline} />
                </div>
            )}
        </div>
    )
}

function PBPopup({ marker }: { marker: PBMarker }) {
    const colors = PB_RANK_COLORS[marker.prRank] || PB_RANK_COLORS[1]
    const rankLabel = marker.prRank === 1 ? '1st' : marker.prRank === 2 ? '2nd' : '3rd'

    return (
        <div className="bg-[#1c1c26]/95 backdrop-blur-sm border rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[200px]"
            style={{ borderColor: `${colors.fill}33` }}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: `${colors.fill}33` }}>
                    <Medal className="h-3.5 w-3.5" style={{ color: colors.fill }} />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-xs uppercase tracking-wide" style={{ color: colors.fill }}>{rankLabel} Best</p>
                    <p className="text-white font-semibold text-sm leading-tight">{marker.displayName}</p>
                </div>
            </div>
            <p className="text-[#52525b] text-[10px] mb-2">{marker.fullDate}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Time</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatDuration(marker.movingTime)}</p>
                </div>
                <div>
                    <p className="text-[#52525b] text-[9px] uppercase tracking-wide">Pace</p>
                    <p className="text-white text-sm font-bold tabular-nums">{formatPace(marker.movingTime, marker.effortDistance)} /km</p>
                </div>
            </div>
            <p className="text-[#52525b] text-[10px] mt-2 truncate max-w-[200px]">{marker.activityName}</p>
            {marker.polyline && marker.polyline.length > 1 && (
                <div className="mt-2 flex justify-center">
                    <MiniRoute points={marker.polyline} />
                </div>
            )}
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const entry = payload[0]?.payload as ChartEntry | undefined
    if (!entry || entry.isRace) return null // races handled by RacePopup
    if (entry.distance === 0) return null   // empty days in year view

    return (
        <div className="bg-[#1c1c26]/95 backdrop-blur-sm border border-white/[0.08] rounded-lg px-3 py-2.5 shadow-2xl text-sm">
            <p className="text-[#71717a] text-xs mb-1">{entry.fullDate}</p>
            <p className="text-[#FC4C02] font-semibold">{entry.distance.toFixed(2)} km</p>
            <p className="text-[#52525b] text-[10px] mt-0.5">{entry.name}</p>
        </div>
    )
}

export default function ChartComponent({ activities }: ChartComponentProps) {
    const [showRaces, setShowRaces] = React.useState(true)
    const [hoveredRace, setHoveredRace] = React.useState<{ entry: ChartEntry; x: number; y: number } | null>(null)
    const chartWrapperRef = React.useRef<HTMLDivElement>(null)
    const [showPBs, setShowPBs] = React.useState(true)
    const [hoveredPB, setHoveredPB] = React.useState<{ marker: PBMarker; x: number; y: number } | null>(null)

    const [selectedYear, setSelectedYear] = React.useState<number | null>(null)

    const availableYears = React.useMemo(() => {
        if (!activities || activities.length === 0) return []
        const years = new Set(activities.map(a => new Date(a.start_date_local).getFullYear()))
        return Array.from(years).sort((a, b) => b - a) // newest first
    }, [activities])

    const chartData = React.useMemo<ChartEntry[]>(() => {
        if (!activities || activities.length === 0) return []

        const sorted = [...activities]
            .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())

        if (selectedYear === null) {
            // All-time view: current behavior
            return sorted.map(activity => {
                const isRace = activity.workout_type === 1
                const dist = parseFloat((activity.distance / 1000).toFixed(2))
                return {
                    date: new Date(activity.start_date_local).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                    fullDate: new Date(activity.start_date_local).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                    name: activity.name,
                    distance: dist,
                    movingTime: activity.moving_time,
                    elevation: activity.total_elevation_gain,
                    isRace,
                    raceDistance: isRace ? dist : null,
                    polyline: isRace && activity.map?.summary_polyline
                        ? decodePolyline(activity.map.summary_polyline)
                        : null,
                }
            })
        }

        // Year view: one entry per calendar day
        const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0
        const daysInYear = isLeap ? 366 : 365

        // Group activities by day-of-year
        const yearActivities = sorted.filter(a => new Date(a.start_date_local).getFullYear() === selectedYear)
        const dayMap = new Map<string, typeof yearActivities>()
        for (const a of yearActivities) {
            const dateKey = a.start_date_local.slice(0, 10) // "YYYY-MM-DD"
            if (!dayMap.has(dateKey)) dayMap.set(dateKey, [])
            dayMap.get(dateKey)!.push(a)
        }

        const entries: ChartEntry[] = []
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for (let d = 0; d < daysInYear; d++) {
            const date = new Date(selectedYear, 0, 1 + d)
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            const dateKey = `${selectedYear}-${mm}-${dd}`
            const dayActivities = dayMap.get(dateKey)
            const isFirstOfMonth = date.getDate() === 1
            const label = isFirstOfMonth ? monthNames[date.getMonth()] : ''

            if (dayActivities && dayActivities.length > 0) {
                const totalDist = dayActivities.reduce((sum, a) => sum + a.distance / 1000, 0)
                const totalTime = dayActivities.reduce((sum, a) => sum + a.moving_time, 0)
                const totalElev = dayActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0)
                const hasRace = dayActivities.some(a => a.workout_type === 1)
                const raceActivity = dayActivities.find(a => a.workout_type === 1)
                entries.push({
                    date: label,
                    fullDate: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                    name: dayActivities.length === 1 ? dayActivities[0].name : `${dayActivities.length} activities`,
                    distance: parseFloat(totalDist.toFixed(2)),
                    movingTime: totalTime,
                    elevation: totalElev,
                    isRace: hasRace,
                    raceDistance: hasRace ? parseFloat(totalDist.toFixed(2)) : null,
                    polyline: raceActivity?.map?.summary_polyline
                        ? decodePolyline(raceActivity.map.summary_polyline)
                        : null,
                })
            } else {
                entries.push({
                    date: label,
                    fullDate: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                    name: '',
                    distance: 0,
                    movingTime: 0,
                    elevation: 0,
                    isRace: false,
                    raceDistance: null,
                    polyline: null,
                })
            }
        }
        return entries
    }, [activities, selectedYear])

    const chartDataWithPBs = React.useMemo(() => {
        const pbByFullDate = new Map<string, PBMarker[]>()

        for (const activity of activities) {
            if (!activity.best_efforts) continue
            for (const effort of activity.best_efforts) {
                if (!PB_DISTANCES.includes(effort.name as typeof PB_DISTANCES[number])) continue
                if (!effort.pr_rank || effort.pr_rank > 3) continue

                const fullDate = new Date(activity.start_date_local).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

                const marker: PBMarker = {
                    distanceName: effort.name,
                    displayName: PB_DISPLAY_NAMES[effort.name] || effort.name,
                    prRank: effort.pr_rank,
                    movingTime: effort.moving_time,
                    effortDistance: effort.distance,
                    activityName: activity.name,
                    fullDate,
                    polyline: activity.map?.summary_polyline
                        ? decodePolyline(activity.map.summary_polyline)
                        : null,
                }

                if (!pbByFullDate.has(fullDate)) pbByFullDate.set(fullDate, [])
                pbByFullDate.get(fullDate)!.push(marker)
            }
        }

        return chartData.map(entry => {
            const markers = pbByFullDate.get(entry.fullDate)
            if (markers && markers.length > 0) {
                return { ...entry, pbMarkers: markers, pbDistance: entry.distance || 0.1 }
            }
            return { ...entry, pbMarkers: undefined, pbDistance: null }
        })
    }, [chartData, activities])

    const pbTotal = React.useMemo(() =>
        chartDataWithPBs.filter(d => d.pbMarkers && d.pbMarkers.length > 0).length
    , [chartDataWithPBs])

    const total = React.useMemo(() => ({
        distance: chartDataWithPBs.reduce((acc, curr) => acc + curr.distance, 0),
        races: chartDataWithPBs.filter(d => d.isRace).length,
    }), [chartDataWithPBs])

    if (!activities || activities.length === 0) {
        return (
            <div className="rounded-xl bg-[#16161d] border border-white/[0.06] h-full flex items-center justify-center">
                <p className="text-[#52525b] text-sm">No activities to display</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
        >
        <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden h-full flex flex-col card-glow mobile-flush" spotlightSize={350}>
            <div className="h-0.5 w-full bg-gradient-to-r from-[#FC4C02] to-amber-400" />
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0 gap-2">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white">Activity Chart</h2>
                    <p className="text-xs text-[#52525b] mt-0.5">{activities.length} activities</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
                    <select
                        value={selectedYear ?? ''}
                        onChange={e => setSelectedYear(e.target.value === '' ? null : Number(e.target.value))}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FC4C02]/30 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
                    >
                        <option value="">All time</option>
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-[#52525b]">Total Distance</p>
                        <p className="text-sm font-bold text-white tabular-nums">
                            <AnimatedNumber value={total.distance} format={(v) => `${v.toFixed(1)} km`} />
                        </p>
                    </div>
                    {total.races > 0 && (
                        <button
                            onClick={() => setShowRaces(!showRaces)}
                            className={`text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                showRaces
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                                    : 'bg-white/[0.04] border-white/[0.08] text-[#71717a] hover:text-white hover:border-white/[0.12]'
                            }`}
                        >
                            <Trophy className="h-3 w-3" />
                            <span className="hidden sm:inline">Races</span>
                            <span className="text-[10px] opacity-70">{total.races}</span>
                        </button>
                    )}
                    {pbTotal > 0 && (
                        <button
                            onClick={() => setShowPBs(!showPBs)}
                            className={`text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                showPBs
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                    : 'bg-white/[0.04] border-white/[0.08] text-[#71717a] hover:text-white hover:border-white/[0.12]'
                            }`}
                        >
                            <Medal className="h-3 w-3" />
                            <span className="hidden sm:inline">PBs</span>
                            <span className="text-[10px] opacity-70">{pbTotal}</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 px-0 sm:px-4 py-2 sm:py-4 min-h-0 relative" ref={chartWrapperRef}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartDataWithPBs} margin={{ top: 16, right: 4, left: -20, bottom: 4 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FC4C02" stopOpacity={1} />
                                <stop offset="100%" stopColor="#FC4C02" stopOpacity={0.6} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="transparent"
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval={selectedYear !== null ? undefined : Math.max(0, Math.floor(chartDataWithPBs.length / 8) - 1)}
                            angle={selectedYear !== null ? 0 : -35}
                            textAnchor={selectedYear !== null ? 'middle' : 'end'}
                            height={selectedYear !== null ? 30 : 50}
                            tickFormatter={selectedYear !== null ? (value: string) => value : undefined}
                        />
                        <YAxis stroke="transparent" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip
                            content={hoveredRace || hoveredPB ? () => null : <CustomTooltip />}
                            cursor={hoveredRace || hoveredPB ? false : { fill: 'rgba(252,76,2,0.04)' }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={20}
                        />
                        <Bar
                            dataKey="distance"
                            fill="url(#barGradient)"
                            name="Distance (km)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        {showRaces && (
                            <Scatter
                                dataKey="raceDistance"
                                name="Race"
                                shape={(props: { cx?: number; cy?: number; payload?: ChartEntry }) => {
                                    if (!props.payload?.isRace || !props.cx || !props.cy) return null
                                    const entry = props.payload
                                    return (
                                        <g
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={(e) => {
                                                const rect = chartWrapperRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                setHoveredRace({
                                                    entry,
                                                    x: e.clientX - rect.left,
                                                    y: e.clientY - rect.top,
                                                })
                                            }}
                                            onMouseLeave={() => setHoveredRace(null)}
                                        >
                                            {/* Generous hit target */}
                                            <circle cx={props.cx} cy={props.cy - 10} r={16} fill="transparent" />
                                            {/* Soft glow behind */}
                                            <circle cx={props.cx} cy={props.cy - 10} r={10} fill="#f59e0b" fillOpacity={0.15} />
                                            {/* Main circle */}
                                            <circle cx={props.cx} cy={props.cy - 10} r={7} fill="#f59e0b" stroke="#fbbf24" strokeWidth={1.5} />
                                            {/* Trophy SVG path, centered in circle */}
                                            <g transform={`translate(${props.cx - 5}, ${props.cy - 15}) scale(0.42)`}>
                                                <path d="M6 2h12v2h4v6c0 1.1-.9 2-2 2h-2.3c-.5 1.2-1.4 2.2-2.7 2.7V18h2v2H7v-2h2v-3.3C7.6 14.2 6.7 13.2 6.3 12H4c-1.1 0-2-.9-2-2V4h4V2zm-2 4v4h2V6H4zm16 0h-2v4h2V6z" fill="#451a03" />
                                            </g>
                                        </g>
                                    )
                                }}
                            >
                                {chartDataWithPBs.map((entry, i) => (
                                    <Cell key={i} fill={entry.isRace ? '#f59e0b' : 'transparent'} />
                                ))}
                            </Scatter>
                        )}
                        {showPBs && (
                            <Scatter
                                dataKey="pbDistance"
                                name="PB"
                                shape={(props: { cx?: number; cy?: number; payload?: ChartEntry }) => {
                                    if (!props.payload?.pbMarkers || !props.cx || !props.cy) return null
                                    const markers = props.payload.pbMarkers
                                    const best = markers.reduce((a, b) => a.prRank <= b.prRank ? a : b)
                                    const colors = PB_RANK_COLORS[best.prRank] || PB_RANK_COLORS[1]
                                    const yOffset = props.payload.isRace ? -28 : -10

                                    return (
                                        <g
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={(e) => {
                                                const rect = chartWrapperRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                setHoveredPB({
                                                    marker: best,
                                                    x: e.clientX - rect.left,
                                                    y: e.clientY - rect.top,
                                                })
                                            }}
                                            onMouseLeave={() => setHoveredPB(null)}
                                        >
                                            <circle cx={props.cx} cy={props.cy + yOffset} r={16} fill="transparent" />
                                            <circle cx={props.cx} cy={props.cy + yOffset} r={10} fill={colors.fill} fillOpacity={0.15} />
                                            <circle cx={props.cx} cy={props.cy + yOffset} r={7} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5} />
                                            <g transform={`translate(${props.cx - 4.5}, ${props.cy + yOffset - 4.5}) scale(0.375)`}>
                                                <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7L12 2z" fill="#1c1c26" />
                                            </g>
                                        </g>
                                    )
                                }}
                            >
                                {chartDataWithPBs.map((entry, i) => (
                                    <Cell key={i} fill={entry.pbMarkers ? PB_RANK_COLORS[entry.pbMarkers[0]?.prRank || 1].fill : 'transparent'} />
                                ))}
                            </Scatter>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
                {/* Custom race popup — positioned via mouse coordinates, flips if overflowing */}
                {hoveredRace && chartWrapperRef.current && (() => {
                    const rect = chartWrapperRef.current!.getBoundingClientRect()
                    const popupH = 320
                    const popupW = 230
                    const spaceBelow = rect.height - hoveredRace.y
                    const spaceRight = rect.width - hoveredRace.x
                    const top = spaceBelow < popupH ? hoveredRace.y - popupH + 20 : hoveredRace.y - 40
                    const left = spaceRight < popupW + 20 ? hoveredRace.x - popupW - 8 : hoveredRace.x + 16
                    return (
                        <div className="absolute z-50 pointer-events-none" style={{ left, top }}>
                            <RacePopup entry={hoveredRace.entry} />
                        </div>
                    )
                })()}
                {hoveredPB && chartWrapperRef.current && (() => {
                    const rect = chartWrapperRef.current!.getBoundingClientRect()
                    const popupH = 280
                    const popupW = 230
                    const spaceBelow = rect.height - hoveredPB.y
                    const spaceRight = rect.width - hoveredPB.x
                    const top = spaceBelow < popupH ? hoveredPB.y - popupH + 20 : hoveredPB.y - 40
                    const left = spaceRight < popupW + 20 ? hoveredPB.x - popupW - 8 : hoveredPB.x + 16
                    return (
                        <div className="absolute z-50 pointer-events-none" style={{ left, top }}>
                            <PBPopup marker={hoveredPB.marker} />
                        </div>
                    )
                })()}
            </div>
        </SpotlightCard>
        </motion.div>
    )
}

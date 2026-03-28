'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip } from 'recharts'
import { Medal, ChevronDown } from 'lucide-react'
import { SpotlightCard } from './SpotlightCard'
import { StravaActivity, BestEffort } from '@/types/strava'

const PB_DISTANCES = ['1K', '5K', '10K', 'Half-Marathon', 'Marathon', '50K'] as const
const PB_DISPLAY_NAMES: Record<string, string> = {
    '1K': '1K',
    '5K': '5K',
    '10K': '10K',
    'Half-Marathon': 'Half Marathon',
    'Marathon': 'Marathon',
    '50K': '50K',
}

interface PBRecord {
    movingTime: number
    distance: number
    date: string
    activityName: string
    prRank: number
}

interface DistancePBData {
    distanceName: string
    displayName: string
    currentBest: PBRecord
    progression: PBRecord[]
    top3: PBRecord[]
}

function formatPace(seconds: number, meters: number): string {
    if (meters === 0) return '—'
    const paceSeconds = seconds / (meters / 1000)
    const m = Math.floor(paceSeconds / 60)
    const s = Math.round(paceSeconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PBCard({ data }: { data: DistancePBData }) {
    const [expanded, setExpanded] = useState(false)

    const chartPoints = useMemo(() =>
        data.progression.map(p => ({
            time: p.movingTime,
            date: formatDateShort(p.date),
        }))
    , [data.progression])

    const maxTime = Math.max(...chartPoints.map(p => p.time))
    const minTime = Math.min(...chartPoints.map(p => p.time))

    return (
        <SpotlightCard className="rounded-xl bg-[#16161d] border border-white/[0.06] overflow-hidden card-glow">
            <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20">
                        <Medal className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-base font-semibold text-white">{data.displayName}</span>
                </div>

                <div className="mb-3">
                    <p className="text-[10px] text-[#52525b] uppercase tracking-wide mb-1">Current PB</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-white tabular-nums">{formatTime(data.currentBest.movingTime)}</span>
                        <span className="text-sm text-[#71717a] tabular-nums">{formatPace(data.currentBest.movingTime, data.currentBest.distance)} /km</span>
                    </div>
                    <p className="text-xs text-[#52525b] mt-0.5 truncate">
                        {data.currentBest.activityName} — {formatDateShort(data.currentBest.date)}
                    </p>
                </div>

                {data.top3.length > 1 && (
                    <div className="space-y-1.5 mb-3">
                        {data.top3.map((record, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className={`w-4 text-center font-bold tabular-nums ${
                                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : 'text-amber-600'
                                }`}>{i + 1}</span>
                                <span className="text-white tabular-nums font-medium">{formatTime(record.movingTime)}</span>
                                <span className="text-[#52525b] tabular-nums">{formatPace(record.movingTime, record.distance)} /km</span>
                                <span className="text-[#3f3f46] ml-auto">{formatDateShort(record.date)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {data.progression.length > 1 && (
                    <>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center justify-between w-full py-2 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                        >
                            <span>Progression ({data.progression.length} PRs)</span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                >
                                    {chartPoints.length > 1 && (
                                        <div className="h-24 mb-3">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartPoints}>
                                                    <defs>
                                                        <linearGradient id="pbLineGradient" x1="0" y1="0" x2="1" y2="0">
                                                            <stop offset="0%" stopColor="#71717a" />
                                                            <stop offset="100%" stopColor="#fbbf24" />
                                                        </linearGradient>
                                                    </defs>
                                                    <YAxis domain={[minTime * 0.95, maxTime * 1.05]} hide reversed />
                                                    <RechartsTooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload?.length) return null
                                                            const p = payload[0]?.payload as { time: number; date: string }
                                                            if (!p) return null
                                                            return (
                                                                <div className="bg-[#1c1c26]/95 backdrop-blur-sm border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs">
                                                                    <p className="text-white font-medium tabular-nums">{formatTime(p.time)}</p>
                                                                    <p className="text-[#52525b]">{p.date}</p>
                                                                </div>
                                                            )
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="time"
                                                        stroke="url(#pbLineGradient)"
                                                        strokeWidth={2}
                                                        dot={{ r: 3, fill: '#fbbf24', stroke: '#fbbf24' }}
                                                        activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fcd34d', strokeWidth: 2 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        {data.progression.slice().reverse().map((record, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="w-4 text-center text-[#3f3f46] tabular-nums">{data.progression.length - i}</span>
                                                <span className="text-white tabular-nums font-medium">{formatTime(record.movingTime)}</span>
                                                <span className="text-[#52525b] tabular-nums">{formatPace(record.movingTime, record.distance)} /km</span>
                                                <span className="text-[#3f3f46] ml-auto">{formatDateShort(record.date)}</span>
                                                {i === 0 && <span className="text-amber-400 text-[10px]">★</span>}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </SpotlightCard>
    )
}

export function PBStats({ activities }: { activities: StravaActivity[] }) {
    const pbData = useMemo(() => {
        const effortsByDistance = new Map<string, { effort: BestEffort; activity: StravaActivity }[]>()

        for (const activity of activities) {
            if (!activity.best_efforts) continue
            for (const effort of activity.best_efforts) {
                if (!PB_DISTANCES.includes(effort.name as typeof PB_DISTANCES[number])) continue
                if (!effortsByDistance.has(effort.name)) effortsByDistance.set(effort.name, [])
                effortsByDistance.get(effort.name)!.push({ effort, activity })
            }
        }

        const results: DistancePBData[] = []

        for (const distName of PB_DISTANCES) {
            const efforts = effortsByDistance.get(distName)
            if (!efforts || efforts.length === 0) continue

            const sortedByTime = [...efforts].sort((a, b) => a.effort.moving_time - b.effort.moving_time)
            const top3: PBRecord[] = sortedByTime.slice(0, 3).map(e => ({
                movingTime: e.effort.moving_time,
                distance: e.effort.distance,
                date: e.effort.start_date_local || e.activity.start_date_local,
                activityName: e.activity.name,
                prRank: e.effort.pr_rank || 0,
            }))

            const prOnes = efforts
                .filter(e => e.effort.pr_rank === 1)
                .sort((a, b) => new Date(a.activity.start_date_local).getTime() - new Date(b.activity.start_date_local).getTime())
                .map(e => ({
                    movingTime: e.effort.moving_time,
                    distance: e.effort.distance,
                    date: e.effort.start_date_local || e.activity.start_date_local,
                    activityName: e.activity.name,
                    prRank: 1,
                }))

            results.push({
                distanceName: distName,
                displayName: PB_DISPLAY_NAMES[distName] || distName,
                currentBest: top3[0],
                progression: prOnes.length > 0 ? prOnes : [top3[0]],
                top3,
            })
        }

        return results
    }, [activities])

    if (pbData.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Medal className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Personal Bests</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pbData.map(data => (
                    <PBCard key={data.distanceName} data={data} />
                ))}
            </div>
        </motion.div>
    )
}

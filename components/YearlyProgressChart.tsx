'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, TooltipProps } from 'recharts'
import { SpotlightCard } from './SpotlightCard'
import { StravaActivity } from '@/types/strava'

interface YearlyProgressChartProps {
    activities: StravaActivity[]
}

interface YearlyData {
    [year: number]: { [month: number]: number }
}

interface ChartData {
    date: string
    [key: string]: number | string | null
}

const YEAR_COLORS = ['#FC4C02', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ec4899']
const PROJ_KEY_SUFFIX = '_proj'

function dayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1)
    return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function daysAtEndOfMonth(year: number, month: number): number {
    return dayOfYear(new Date(year, month + 1, 0))
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const visible = payload.filter(e => e.value != null)
    if (!visible.length) return null
    return (
        <div className="bg-[#1c1c26] border border-white/[0.08] rounded-lg px-3 py-2.5 shadow-xl text-sm space-y-1">
            <p className="text-[#71717a] text-xs mb-1">{label}</p>
            {visible.map((entry) => {
                const isProj = String(entry.name).endsWith(PROJ_KEY_SUFFIX)
                const year = String(entry.name).replace(PROJ_KEY_SUFFIX, '')
                return (
                    <p key={entry.name} className="font-medium" style={{ color: entry.color }}>
                        {isProj ? `${year} projected` : year}: {(entry.value as number).toFixed(1)} km
                    </p>
                )
            })}
        </div>
    )
}

export default function YearlyProgressChart({ activities }: YearlyProgressChartProps) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const daysElapsed = dayOfYear(now)

    const { chartData, years, projectedYearEnd } = useMemo(() => {
        const yearlyData: YearlyData = {}

        activities.forEach((activity) => {
            const date = new Date(activity.start_date_local)
            const year = date.getFullYear()
            const month = date.getMonth()
            if (!yearlyData[year]) yearlyData[year] = {}
            yearlyData[year][month] = (yearlyData[year][month] || 0) + activity.distance / 1000
        })

        // Current year cumulative distance so far
        const currentYearMonths = yearlyData[currentYear] || {}
        const currentCumulative = Object.values(currentYearMonths).reduce((s, v) => s + v, 0)
        const dailyAvg = daysElapsed > 0 ? currentCumulative / daysElapsed : 0
        const projectedYearEnd = parseFloat((dailyAvg * 365).toFixed(1))

        const data: ChartData[] = []
        for (let month = 0; month < 12; month++) {
            const point: ChartData = {
                date: new Date(2000, month, 1).toLocaleString('default', { month: 'short' })
            }

            // Actual lines for all years
            Object.keys(yearlyData).forEach((year) => {
                let cumulative = 0
                for (let i = 0; i <= month; i++) cumulative += yearlyData[parseInt(year)][i] || 0
                // For future months in current year, leave actual line as null
                if (parseInt(year) === currentYear && month > currentMonth) {
                    point[year] = null
                } else {
                    point[year] = parseFloat(cumulative.toFixed(2))
                }
            })

            // Projected line for current year: from current month onwards
            if (month >= currentMonth) {
                const daysToEndOfMonth = daysAtEndOfMonth(currentYear, month)
                const projected = currentCumulative + dailyAvg * Math.max(0, daysToEndOfMonth - daysElapsed)
                point[`${currentYear}${PROJ_KEY_SUFFIX}`] = parseFloat(projected.toFixed(2))
            } else {
                point[`${currentYear}${PROJ_KEY_SUFFIX}`] = null
            }

            data.push(point)
        }

        const years = Object.keys(yearlyData).sort()
        return { chartData: data, years, projectedYearEnd }
    }, [activities, currentYear, currentMonth, daysElapsed])

    const currentYearColor = YEAR_COLORS[years.indexOf(String(currentYear)) % YEAR_COLORS.length]

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
                    <h2 className="text-sm font-semibold text-white">Yearly Progress</h2>
                    <p className="text-xs text-[#52525b] mt-0.5">Cumulative distance by year</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                    {years.map((year, i) => (
                        <div key={year} className="flex items-center gap-1">
                            <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length] }} />
                            <span className={`text-[10px] sm:text-xs ${year === String(currentYear) ? 'text-white font-medium' : 'text-[#52525b]'}`}>{year}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1 hidden sm:flex">
                        <svg width="12" height="2" className="overflow-visible">
                            <line x1="0" y1="1" x2="12" y2="1" stroke={currentYearColor} strokeWidth="1.5" strokeDasharray="3 2" />
                        </svg>
                        <span className="text-[10px] sm:text-xs text-[#52525b]">proj. {projectedYearEnd} km</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 px-4 py-4 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                        <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="transparent" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
                        {years.map((year, i) => (
                            <Line
                                key={year}
                                type="monotone"
                                dataKey={year}
                                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                                strokeWidth={year === String(currentYear) ? 2.5 : 1.5}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                connectNulls={false}
                            />
                        ))}
                        <Line
                            key="projection"
                            type="monotone"
                            dataKey={`${currentYear}${PROJ_KEY_SUFFIX}`}
                            stroke={currentYearColor}
                            strokeWidth={1.5}
                            strokeDasharray="5 4"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </SpotlightCard>
        </motion.div>
    )
}

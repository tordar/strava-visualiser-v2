'use client'

import dynamic from 'next/dynamic'
import { StravaActivity } from '@/types/strava'

const HeatmapContent = dynamic(() => import('./HeatmapContent'), {
    ssr: false,
    loading: () => (
        <div className="rounded-xl bg-[#16161d] border border-white/[0.06] h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#FC4C02]/30 border-t-[#FC4C02] rounded-full animate-spin" />
                <p className="text-[#52525b] text-sm">Loading map…</p>
            </div>
        </div>
    ),
})

interface HeatmapTabProps {
    activities: StravaActivity[]
}

export default function HeatmapTab({ activities }: HeatmapTabProps) {
    return <HeatmapContent activities={activities} />
}

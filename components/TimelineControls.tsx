'use client'

import { Play, Pause, RotateCcw, Locate, Maximize, Minimize } from 'lucide-react'

interface TimelineControlsProps {
    currentIndex: number
    total: number
    isPlaying: boolean
    speed: number
    followMode: boolean
    currentDate: string | undefined
    onTogglePlay: () => void
    onSpeedChange: (speed: number) => void
    onSliderChange: (index: number) => void
    onReset: () => void
    onToggleFollow: () => void
    isFullscreen: boolean
    onToggleFullscreen: () => void
}

const SPEEDS = [1, 2, 4, 8]

function formatDate(iso: string | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(iso: string | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function TimelineControls({
    currentIndex,
    total,
    isPlaying,
    speed,
    currentDate,
    followMode,
    onTogglePlay,
    onSpeedChange,
    onSliderChange,
    onReset,
    onToggleFollow,
    isFullscreen,
    onToggleFullscreen,
}: TimelineControlsProps) {
    const progress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0

    return (
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-white/[0.06] flex-shrink-0 space-y-2 sm:space-y-3">
            {/* Slider */}
            <input
                type="range"
                min={0}
                max={Math.max(total - 1, 0)}
                value={currentIndex}
                onChange={(e) => onSliderChange(parseInt(e.target.value))}
                className="timeline-slider w-full"
                style={{
                    background: `linear-gradient(to right, #FC4C02 0%, #FC4C02 ${progress}%, rgba(255,255,255,0.06) ${progress}%, rgba(255,255,255,0.06) 100%)`,
                }}
            />

            {/* Controls row */}
            <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Play/Pause */}
                <button
                    onClick={onTogglePlay}
                    className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FC4C02] hover:bg-[#e84402] text-white transition-colors cursor-pointer flex-shrink-0"
                >
                    {isPlaying
                        ? <Pause className="h-3.5 w-3.5" fill="white" />
                        : <Play className="h-3.5 w-3.5 ml-0.5" fill="white" />
                    }
                </button>

                {/* Reset */}
                <button
                    onClick={onReset}
                    className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-lg text-[#52525b] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex-shrink-0"
                    title="Reset"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Follow mode */}
                <button
                    onClick={onToggleFollow}
                    className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-lg transition-all cursor-pointer flex-shrink-0 ${
                        followMode
                            ? 'bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/30'
                            : 'text-[#52525b] hover:text-white hover:bg-white/[0.06] border border-transparent'
                    }`}
                    title={followMode ? 'Follow mode on' : 'Follow mode off'}
                >
                    <Locate className="h-3.5 w-3.5" />
                </button>

                {/* Speed — hide labels on very small screens */}
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {SPEEDS.map(s => (
                        <button
                            key={s}
                            onClick={() => onSpeedChange(s)}
                            className={`text-[10px] px-1.5 sm:px-2 py-1.5 sm:py-1 rounded-md font-medium transition-all cursor-pointer ${
                                speed === s
                                    ? 'bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/30'
                                    : 'text-[#52525b] hover:text-[#71717a] border border-transparent'
                            }`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1 min-w-0" />

                {/* Date — short format on mobile */}
                <span className="text-[10px] sm:text-xs text-[#71717a] tabular-nums flex-shrink-0">
                    <span className="hidden sm:inline">{formatDate(currentDate)}</span>
                    <span className="sm:hidden">{formatDateShort(currentDate)}</span>
                </span>

                {/* Counter */}
                <span className="text-[10px] sm:text-xs text-[#52525b] tabular-nums flex-shrink-0 hidden xs:inline">
                    {currentIndex + 1}/{total}
                </span>

                {/* Fullscreen */}
                <button
                    onClick={onToggleFullscreen}
                    className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-lg text-[#52525b] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex-shrink-0"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    )
}

'use client'

import { useRef, useState, type ReactNode, type MouseEvent } from 'react'

interface SpotlightCardProps {
    children: ReactNode
    className?: string
    spotlightColor?: string
    spotlightSize?: number
}

export function SpotlightCard({
    children,
    className = '',
    spotlightColor = 'rgba(252,76,2,0.07)',
    spotlightSize = 250,
}: SpotlightCardProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const handleMouseMove = (e: MouseEvent) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            className={`relative overflow-hidden ${className}`}
        >
            <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-out"
                style={{
                    opacity,
                    background: `radial-gradient(circle ${spotlightSize}px at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
                }}
            />
            {children}
        </div>
    )
}

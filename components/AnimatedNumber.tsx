'use client'

import { useEffect, useRef, useCallback } from 'react'
import { animate, useInView } from 'framer-motion'

interface AnimatedNumberProps {
    value: number
    duration?: number
    format?: (n: number) => string
    className?: string
}

export function AnimatedNumber({ value, duration = 1.2, format, className }: AnimatedNumberProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: true, margin: '-40px' })

    const formatter = useCallback(
        (v: number) => (format ? format(v) : v.toFixed(0)),
        [format]
    )

    useEffect(() => {
        if (!ref.current || !inView) return
        const controls = animate(0, value, {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate(v) {
                if (ref.current) ref.current.textContent = formatter(v)
            },
        })
        return () => controls.stop()
    }, [value, duration, inView, formatter])

    return <span ref={ref} className={className}>0</span>
}

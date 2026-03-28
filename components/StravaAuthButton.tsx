'use client'

import { Button } from "@/components/ui/button"

export default function StravaAuthButton() {
    const handleAuth = () => {
        window.location.href = '/api/strava/auth'
    }
    
    return (
        <button
            onClick={handleAuth}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#FC4C02] hover:bg-[#e84402] text-white font-semibold text-sm transition-all duration-200 cursor-pointer glow-pulse hover:scale-[1.02] active:scale-[0.98]"
        >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect with Strava
        </button>
    )
}
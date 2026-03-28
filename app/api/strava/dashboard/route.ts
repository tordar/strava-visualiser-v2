import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const PER_PAGE = 200
const MAX_PAGES = 25 // up to 5000 activities

async function getValidAccessToken(): Promise<string | null> {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('strava_access_token')?.value
    if (accessToken) return accessToken

    const refreshToken = cookieStore.get('strava_refresh_token')?.value
    if (!refreshToken) return null

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    })

    if (!response.ok) return null

    const data = await response.json()
    cookies().set('strava_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: data.expires_in,
    })
    return data.access_token
}

async function stravaGet(accessToken: string, path: string) {
    const res = await fetch(`https://www.strava.com/api/v3/${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Strava ${path} → ${res.status}`)
    return res.json()
}

export async function GET() {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        // Round 1: athlete + first page in parallel
        const [athlete, page1] = await Promise.all([
            stravaGet(accessToken, 'athlete'),
            stravaGet(accessToken, `athlete/activities?page=1&per_page=${PER_PAGE}`),
        ])

        let activities = [...page1]

        // Fetch remaining pages in batches of 5 until we get a short page
        if (page1.length === PER_PAGE) {
            let nextPage = 2
            let done = false
            while (!done && nextPage <= MAX_PAGES) {
                const batchSize = Math.min(5, MAX_PAGES - nextPage + 1)
                const pages = await Promise.all(
                    Array.from({ length: batchSize }, (_, i) =>
                        stravaGet(accessToken, `athlete/activities?page=${nextPage + i}&per_page=${PER_PAGE}`)
                    )
                )
                for (const page of pages) {
                    if (!page.length) { done = true; break }
                    activities = [...activities, ...page]
                    if (page.length < PER_PAGE) { done = true; break }
                }
                nextPage += batchSize
            }
        }

        const athleteStats = await stravaGet(accessToken, `athletes/${athlete.id}/stats`)
        return NextResponse.json({ athlete, athleteStats, activities })

    } catch (error) {
        console.error('Dashboard fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch Strava data' }, { status: 500 })
    }
}

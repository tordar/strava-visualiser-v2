import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getValidAccessToken(): Promise<string | null> {
    const cookieStore = await cookies()
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
    const cs = await cookies()
    cs.set('strava_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: data.expires_in,
    })
    return data.access_token
}

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const accessToken = await getValidAccessToken()
    if (!accessToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    try {
        const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.status === 429) {
            return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
        }
        if (!res.ok) {
            return NextResponse.json({ error: `Strava error ${res.status}` }, { status: res.status })
        }
        const detail = await res.json()
        return NextResponse.json({ best_efforts: detail.best_efforts || [] })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code'
        }),
    })

    const tokenData = await tokenResponse.json()

    const cookieStore = await cookies()
    cookieStore.set('strava_access_token', tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: tokenData.expires_in
    })
    cookieStore.set('strava_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60
    })

    return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL!)
}

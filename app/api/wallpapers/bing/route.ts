import { NextResponse } from 'next/server';
import { fetchAndCacheBingWallpaper } from '@/lib/bing-wallpaper';
import { ensureSqliteDbSchema } from '@/lib/db-migrate';

export async function POST() {
    try {
        await ensureSqliteDbSchema();
        const wallpaper = await fetchAndCacheBingWallpaper();
        if (!wallpaper) {
            return NextResponse.json({ error: 'Failed to fetch Bing wallpaper' }, { status: 500 });
        }
        return NextResponse.json({ success: true, wallpaper });
    } catch (error) {
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}

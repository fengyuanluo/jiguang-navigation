import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [sites, categories, settings, user] = await Promise.all([
            prisma.site.findMany({ orderBy: { order: 'asc' } }),
            prisma.category.findMany({ orderBy: { order: 'asc' } }),
            prisma.globalSettings.findUnique({ where: { id: 1 } }),
            prisma.user.findUnique({ where: { username: 'admin' } })
        ]);

        // Parse JSON fields in settings
        const parsedSettings = settings ? {
            layout: JSON.parse(settings.layout),
            config: JSON.parse(settings.config),
            theme: JSON.parse(settings.theme),
            searchEngine: settings.searchEngine
        } : null;

        return NextResponse.json({
            sites,
            categories,
            settings: parsedSettings,
            hasUser: !!user
        });
    } catch (error) {
        console.error('Init API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch initial data' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { layout, config, theme } = body;

        const settings = await prisma.globalSettings.upsert({
            where: { id: 1 },
            update: {
                layout: layout ? JSON.stringify(layout) : undefined,
                config: config ? JSON.stringify(config) : undefined,
                theme: theme ? JSON.stringify(theme) : undefined,
                searchEngine: body.searchEngine
            } as any,
            create: {
                id: 1,
                layout: JSON.stringify(layout || {}),
                config: JSON.stringify(config || {}),
                theme: JSON.stringify(theme || {}),
                searchEngine: body.searchEngine || 'Google'
            } as any
        });

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

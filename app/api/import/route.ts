import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { sites, categories, categoryColors, layout, config, theme } = data;

        // 1. Update Settings
        await prisma.globalSettings.upsert({
            where: { id: 1 },
            update: {
                layout: layout ? JSON.stringify(layout) : undefined,
                config: config ? JSON.stringify(config) : undefined,
                theme: theme ? JSON.stringify(theme) : undefined,
            },
            create: {
                id: 1,
                layout: JSON.stringify(layout || {}),
                config: JSON.stringify(config || {}),
                theme: JSON.stringify(theme || {}),
            }
        });

        // 2. Update Categories
        // We'll delete existing and recreate to ensure sync (simple approach)
        // Or upsert. For simplicity and to match import behavior (replace), we might want to clear and add.
        // However, clearing might break foreign keys if we don't handle sites first.
        // Let's try upserting categories.
        if (categories && Array.isArray(categories)) {
            // First, ensure all categories exist
            for (const catName of categories) {
                await prisma.category.upsert({
                    where: { name: catName },
                    update: {
                        order: categories.indexOf(catName),
                        color: categoryColors?.[catName] || '#6366F1',
                        // We don't have isHidden in the simple array, but we can default or ignore
                    },
                    create: {
                        name: catName,
                        order: categories.indexOf(catName),
                        color: categoryColors?.[catName] || '#6366F1',
                    }
                });
            }
        }

        // 3. Update Sites
        if (sites && Array.isArray(sites)) {
            // We'll upsert sites based on ID
            for (const site of sites) {
                await prisma.site.upsert({
                    where: { id: site.id },
                    update: {
                        name: site.name,
                        url: site.url,
                        desc: site.desc,
                        category: site.category,
                        color: site.color,
                        icon: site.icon,
                        iconType: site.iconType,
                        customIconUrl: site.customIconUrl,
                        order: site.order || 0
                    },
                    create: {
                        id: site.id,
                        name: site.name,
                        url: site.url,
                        desc: site.desc,
                        category: site.category,
                        color: site.color,
                        icon: site.icon,
                        iconType: site.iconType,
                        customIconUrl: site.customIconUrl,
                        order: site.order || 0
                    }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Import failed:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}

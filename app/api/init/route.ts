import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        console.log('[Init API] Loading data...');
        console.log('[Init API] DATABASE_URL:', process.env.DATABASE_URL);

        const [sites, categories, settings, user] = await Promise.all([
            prisma.site.findMany({ orderBy: { order: 'asc' } }),
            prisma.category.findMany({ orderBy: { order: 'asc' } }),
            prisma.globalSettings.findUnique({ where: { id: 1 } }),
            prisma.user.findUnique({ where: { username: 'admin' } })
        ]);

        let categoriesList = categories;

        // Fallback: 若分类表为空但站点存在，基于站点动态生成分类并尝试补齐数据库
        if (!categoriesList.length && sites.length) {
            const unique = Array.from(new Set(sites.map((s) => s.category).filter(Boolean)));
            categoriesList = unique.map((name, index) => ({
                id: name,
                name,
                order: index,
                color: '#6366F1',
                isHidden: false
            }));

            // 尝试写回数据库，确保下次直接有分类
            for (const cat of categoriesList) {
                try {
                    await prisma.category.upsert({
                        where: { name: cat.name },
                        update: {},
                        create: {
                            name: cat.name,
                            order: cat.order,
                            color: cat.color,
                            isHidden: cat.isHidden
                        }
                    });
                } catch (e) {
                    console.error('[Init API] Fallback category upsert failed:', e);
                }
            }
        }

        console.log('[Init API] Settings raw:', settings ? 'found' : 'null');
        console.log('[Init API] Settings config:', settings?.config?.substring(0, 200));

        // Parse JSON fields in settings
        const parsedSettings = settings ? {
            layout: JSON.parse(settings.layout),
            config: JSON.parse(settings.config),
            theme: JSON.parse(settings.theme),
            searchEngine: settings.searchEngine
        } : null;

        if (parsedSettings && parsedSettings.layout) {
            console.log('[Init API] Loaded layout bgUrl:', parsedSettings.layout.bgUrl);
        }

        console.log('[Init API] Parsed privateMode:', parsedSettings?.config?.privateMode);

        // [Fix] Auto-inject latest Bing Wallpaper for offline support (Cross-browser fix)
        if (parsedSettings && parsedSettings.layout && parsedSettings.layout.bgType === 'bing') {
            const latestBing = await prisma.wallpaper.findFirst({
                where: { type: 'bing' },
                orderBy: { createdAt: 'desc' }
            });
            if (latestBing) {
                parsedSettings.layout.bgUrl = latestBing.url;
            }
        }

        return NextResponse.json({
            sites,
            categories: categoriesList,
            settings: parsedSettings,
            hasUser: !!user
        });
    } catch (error) {
        console.error('[Init API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch initial data' }, { status: 500 });
    }
}

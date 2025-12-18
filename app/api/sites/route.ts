import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadAndSaveIcon, saveBase64Icon, deleteIcon } from '@/lib/icon-downloader';
import { ensureSqliteDbSchema } from '@/lib/db-migrate';
import { normalizeSiteOrder } from '@/lib/site-order';

const getFaviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const DEFAULT_CATEGORY_COLOR = '#6366F1';

function safeTrim(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeUrl(raw: unknown) {
    const val = safeTrim(raw);
    if (!val) return { ok: false as const, url: '' };
    try {
        // 仅用于校验合法性：尽量保留用户输入，避免自动补 `/` 导致 URL 变化
        new URL(val);
        return { ok: true as const, url: val };
    } catch (_) {
        // 兼容用户输入 google.com 这种“无协议”形式
        try {
            new URL(`https://${val}`);
            return { ok: true as const, url: `https://${val}` };
        } catch (_) {
            return { ok: false as const, url: '' };
        }
    }
}

async function ensureCategory(name?: string | null) {
    if (!name) return;
    try {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: {
                name,
                order: 0,
                color: DEFAULT_CATEGORY_COLOR,
                isHidden: false
            }
        });
    } catch (error) {
        console.error('[Sites API] ensureCategory error:', error);
    }
}

export async function POST(request: Request) {
    try {
        await ensureSqliteDbSchema();
        const body = await request.json();

        const name = safeTrim(body?.name);
        const category = safeTrim(body?.category);
        const urlInfo = normalizeUrl(body?.url);
        if (!name || !category || !urlInfo.ok) {
            return NextResponse.json(
                { error: '缺少必要字段或 URL 非法', details: { name: !!name, category: !!category, url: urlInfo.ok } },
                { status: 400 }
            );
        }

        let initialIconType = body.iconType;
        let initialCustomIconUrl = body.customIconUrl;
        let shouldDownload = false;
        let downloadUrl = '';

        // Logic: If auto, use Google Favicon URL initially.
        // If custom URL (http), use it.
        // If Base64, save to disk.

        if (body.iconType === 'auto' && urlInfo.url) {
            try {
                const domain = new URL(urlInfo.url).hostname;
                downloadUrl = getFaviconUrl(domain);
                initialIconType = 'upload'; // Switch to upload so frontend uses the URL
                initialCustomIconUrl = downloadUrl; // Temporary remote URL
                shouldDownload = true;
            } catch (e) { }
        } else if (body.iconType === 'upload' && body.customIconUrl) {
            if (body.customIconUrl.startsWith('http')) {
                downloadUrl = body.customIconUrl;
                shouldDownload = true;
            } else if (body.customIconUrl.startsWith('data:image')) {
                // Handle Base64 Upload immediately
                const savedPath = await saveBase64Icon(body.id || 'temp', body.customIconUrl);
                if (savedPath) {
                    initialCustomIconUrl = savedPath;
                }
            }
        }

        await ensureCategory(category);

        const site = await prisma.site.create({
            data: {
                id: body.id,
                name,
                url: urlInfo.url,
                desc: body.desc,
                category,
                color: body.color,
                icon: body.icon,
                iconType: initialIconType,
                customIconUrl: initialCustomIconUrl,
                titleFont: body.titleFont,
                descFont: body.descFont,
                titleColor: body.titleColor,
                descColor: body.descColor,
                titleSize: body.titleSize ? parseInt(body.titleSize) : null,
                descSize: body.descSize ? parseInt(body.descSize) : null,
                order: normalizeSiteOrder(body.order, 0),
                isHidden: body.isHidden || false
            }
        });

        // If we used a temp ID for filename, we might want to rename it, but it's fine for now.
        // Ideally we should use the real ID.
        // If we saved base64 with 'temp', we can't easily rename without FS ops.
        // Optimization: If we really want the ID in filename, we'd need to create site first then save file then update site.
        // But for now, let's just use the timestamp in filename which is unique enough.

        // Trigger background download for HTTP urls
        if (shouldDownload && downloadUrl) {
            downloadAndSaveIcon(site.id, downloadUrl).catch(console.error);
        }

        return NextResponse.json(site);
    } catch (error) {
        console.error('[Sites API] POST error:', error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('does not exist in the current database')) {
            return NextResponse.json(
                {
                    error: '数据库结构不兼容（可能是旧版 dev.db 未升级），请先完成数据库迁移/重建。',
                    details: process.env.NODE_ENV === 'production' ? undefined : message
                },
                { status: 500 }
            );
        }
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await ensureSqliteDbSchema();
        const body = await request.json();
        // Console log strictly limited
        if (!Array.isArray(body)) {
            console.log('[Sites API] Single PUT:', JSON.stringify(body).substring(0, 200));
        }

        if (Array.isArray(body)) {
            // 串行更新，避免SQLite锁冲突
            for (const site of body) {
                const id = typeof site?.id === 'string' ? site.id : String(site?.id ?? '');
                if (!id) continue;
                await ensureCategory(site.category);
                await prisma.site.update({
                    where: { id },
                    data: {
                        order: normalizeSiteOrder(site.order, 0),
                        category: site.category,
                        isHidden: site.isHidden // Added isHidden support for batch update
                    }
                });
            }
            return NextResponse.json({ success: true });
        }

        if (!body?.id) {
            return NextResponse.json({ error: '缺少站点 ID' }, { status: 400 });
        }

        const urlInfo = normalizeUrl(body?.url);
        if (body?.url && !urlInfo.ok) {
            return NextResponse.json({ error: 'URL 非法' }, { status: 400 });
        }

        let initialIconType = body.iconType;
        let initialCustomIconUrl = body.customIconUrl;
        let shouldDownload = false;
        let downloadUrl = '';

        if (body.iconType === 'auto' && urlInfo.url) {
            try {
                const domain = new URL(urlInfo.url).hostname;
                downloadUrl = getFaviconUrl(domain);
                initialIconType = 'upload';
                initialCustomIconUrl = downloadUrl;
                shouldDownload = true;
            } catch (e) { }
        } else if (body.iconType === 'upload' && body.customIconUrl) {
            if (body.customIconUrl.startsWith('http')) {
                if (!body.customIconUrl.startsWith('/uploads/')) {
                    downloadUrl = body.customIconUrl;
                    shouldDownload = true;
                }
            } else if (body.customIconUrl.startsWith('data:image')) {
                // Handle Base64 Upload
                const savedPath = await saveBase64Icon(body.id, body.customIconUrl);
                if (savedPath) {
                    initialCustomIconUrl = savedPath;
                }
            }
        }

        await ensureCategory(body.category);

        const site = await prisma.site.update({
            where: { id: body.id },
            data: {
                name: body.name,
                url: body.url ? urlInfo.url : undefined,
                desc: body.desc,
                category: body.category,
                color: body.color,
                icon: body.icon,
                iconType: initialIconType,
                customIconUrl: initialCustomIconUrl,
                titleFont: body.titleFont,
                descFont: body.descFont,
                titleColor: body.titleColor,
                descColor: body.descColor,
                titleSize: body.titleSize ? parseInt(body.titleSize) : null,
                descSize: body.descSize ? parseInt(body.descSize) : null,
                order: body.order === undefined ? undefined : normalizeSiteOrder(body.order, 0),
                isHidden: body.isHidden
            }
        });

        if (shouldDownload && downloadUrl) {
            downloadAndSaveIcon(site.id, downloadUrl).catch(console.error);
        }

        return NextResponse.json(site);
    } catch (error) {
        console.error('[Sites API] PUT error:', error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('does not exist in the current database')) {
            return NextResponse.json(
                {
                    error: '数据库结构不兼容（可能是旧版 dev.db 未升级），请先完成数据库迁移/重建。',
                    details: process.env.NODE_ENV === 'production' ? undefined : message
                },
                { status: 500 }
            );
        }
        return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }
}



export async function DELETE(request: Request) {
    try {
        await ensureSqliteDbSchema();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const site = await prisma.site.findUnique({ where: { id } });
        if (site && site.customIconUrl) {
            await deleteIcon(site.customIconUrl);
        }

        await prisma.site.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Sites API] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
    }
}

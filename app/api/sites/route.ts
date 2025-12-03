import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadAndSaveIcon } from '@/lib/icon-downloader';

const getFaviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export async function POST(request: Request) {
    try {
        const body = await request.json();

        let initialIconType = body.iconType;
        let initialCustomIconUrl = body.customIconUrl;
        let shouldDownload = false;
        let downloadUrl = '';

        // Logic: If auto, use Google Favicon URL initially.
        // If custom URL (http), use it.
        // In both cases, trigger background download.

        if (body.iconType === 'auto' && body.url) {
            try {
                const domain = new URL(body.url).hostname;
                downloadUrl = getFaviconUrl(domain);
                initialIconType = 'upload'; // Switch to upload so frontend uses the URL
                initialCustomIconUrl = downloadUrl; // Temporary remote URL
                shouldDownload = true;
            } catch (e) { }
        } else if (body.iconType === 'upload' && body.customIconUrl && body.customIconUrl.startsWith('http')) {
            downloadUrl = body.customIconUrl;
            shouldDownload = true;
        }

        const site = await prisma.site.create({
            data: {
                id: body.id,
                name: body.name,
                url: body.url,
                desc: body.desc,
                category: body.category,
                color: body.color,
                icon: body.icon,
                iconType: initialIconType,
                customIconUrl: initialCustomIconUrl,
                order: body.order || 0
            }
        });

        // Trigger background download
        if (shouldDownload && downloadUrl) {
            // Do not await this, let it run in background
            downloadAndSaveIcon(site.id, downloadUrl).catch(console.error);
        }

        return NextResponse.json(site);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        if (Array.isArray(body)) {
            await prisma.$transaction(
                body.map((site: any) =>
                    prisma.site.update({
                        where: { id: site.id },
                        data: {
                            order: site.order,
                            category: site.category
                        }
                    })
                )
            );
            return NextResponse.json({ success: true });
        }

        let initialIconType = body.iconType;
        let initialCustomIconUrl = body.customIconUrl;
        let shouldDownload = false;
        let downloadUrl = '';

        // Only trigger download if URL changed or type changed to auto
        // We can't easily check "changed" without fetching first, but for PUT we can just check inputs.
        // If user explicitly sets 'auto', we re-download.
        // If user sets 'upload' with http, we re-download.

        if (body.iconType === 'auto' && body.url) {
            try {
                const domain = new URL(body.url).hostname;
                downloadUrl = getFaviconUrl(domain);
                initialIconType = 'upload';
                initialCustomIconUrl = downloadUrl;
                shouldDownload = true;
            } catch (e) { }
        } else if (body.iconType === 'upload' && body.customIconUrl && body.customIconUrl.startsWith('http')) {
            // Check if it's already a local path
            if (!body.customIconUrl.startsWith('/uploads/')) {
                downloadUrl = body.customIconUrl;
                shouldDownload = true;
            }
        }

        const site = await prisma.site.update({
            where: { id: body.id },
            data: {
                name: body.name,
                url: body.url,
                desc: body.desc,
                category: body.category,
                color: body.color,
                icon: body.icon,
                iconType: initialIconType,
                customIconUrl: initialCustomIconUrl,
                order: body.order
            }
        });

        if (shouldDownload && downloadUrl) {
            downloadAndSaveIcon(site.id, downloadUrl).catch(console.error);
        }

        return NextResponse.json(site);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }
}

import { deleteIcon } from '@/lib/icon-downloader';

export async function DELETE(request: Request) {
    try {
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
        return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
    }
}

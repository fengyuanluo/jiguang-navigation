import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const getFaviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export async function POST(request: Request) {
    try {
        const sites = await prisma.site.findMany();
        let count = 0;

        for (const site of sites) {
            let downloadUrl = '';
            let shouldDownload = false;

            // Case 1: Icon Type is Auto, but we haven't cached it yet (still using default logic on frontend, but backend sees it as just 'auto')
            // Actually, if it's 'auto', the frontend calculates the URL. We want to make it 'upload' with a local path.
            if (site.iconType === 'auto' && site.url) {
                try {
                    const domain = new URL(site.url).hostname;
                    downloadUrl = getFaviconUrl(domain);
                    shouldDownload = true;
                } catch (e) { }
            }
            // Case 2: Icon Type is Upload, but URL is remote (http...)
            else if (site.iconType === 'upload' && site.customIconUrl && site.customIconUrl.startsWith('http')) {
                downloadUrl = site.customIconUrl;
                shouldDownload = true;
            }

            if (shouldDownload && downloadUrl) {
                // We await here to avoid overwhelming the server/network with hundreds of requests at once
                // or we could use Promise.all with chunks. For simplicity and safety, sequential or small chunks is better.
                // Given it's a background admin task, sequential is fine.
                await downloadAndSaveIcon(site.id, downloadUrl);
                count++;
            }
        }

        return NextResponse.json({ success: true, processed: count });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to sync icons' }, { status: 500 });
    }
}

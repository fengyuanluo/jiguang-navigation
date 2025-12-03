import fs from 'fs';
import path from 'path';
import https from 'https';
import { prisma } from './prisma';

const WALLPAPER_DIR = path.join(process.cwd(), 'public', 'uploads', 'wallpapers');
const BING_DIR = path.join(WALLPAPER_DIR, 'bing');

// Ensure directories exist
if (!fs.existsSync(BING_DIR)) {
    fs.mkdirSync(BING_DIR, { recursive: true });
}

export async function fetchAndCacheBingWallpaper() {
    try {
        // 1. Fetch Bing JSON
        const bingJsonUrl = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
        const bingData: any = await new Promise((resolve, reject) => {
            https.get(bingJsonUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
                res.on('error', reject);
            });
        });

        if (!bingData?.images?.[0]) throw new Error('Invalid Bing API response');

        const image = bingData.images[0];
        // Try to get UHD, fallback to default if replacement fails
        let imageUrl = `https://www.bing.com${image.url}`;
        if (imageUrl.includes('1920x1080')) {
            imageUrl = imageUrl.replace('1920x1080', 'UHD');
        } else {
            // If URL doesn't have 1920x1080, try appending _UHD before extension (less reliable, but worth a try if base)
            // Actually, Bing JSON usually gives 1920x1080. Let's stick to replacement or appending _UHD if using urlbase.
            // Safer: Use urlbase + _UHD.jpg
            if (image.urlbase) {
                imageUrl = `https://www.bing.com${image.urlbase}_UHD.jpg`;
            }
        }
        const dateStr = image.startdate; // YYYYMMDD
        const filename = `bing-${dateStr}.jpg`;
        const filepath = path.join(BING_DIR, filename);
        const publicPath = `/uploads/wallpapers/bing/${filename}`;

        // 2. Check if already cached
        const existing = await (prisma as any).wallpaper.findFirst({
            where: { filename, type: 'bing' }
        });

        if (existing && fs.existsSync(filepath)) {
            return existing;
        }

        // 3. Download if not exists
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filepath);
            https.get(imageUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download wallpaper: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(true);
                });
            }).on('error', (err) => {
                fs.unlink(filepath, () => { });
                reject(err);
            });
        });

        // 4. Save to DB
        const wallpaper = await (prisma as any).wallpaper.create({
            data: {
                url: publicPath,
                type: 'bing',
                filename,
                size: fs.statSync(filepath).size
            }
        });

        // 5. Handle Cache Mode (Cleanup)
        const settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
        const cacheMode = settings?.bingCacheMode || 'keep-daily';

        if (cacheMode === 'keep-daily') {
            // Delete all other Bing wallpapers
            const others = await (prisma as any).wallpaper.findMany({
                where: { type: 'bing', id: { not: wallpaper.id } }
            });

            for (const w of others) {
                // Delete file
                const p = path.join(process.cwd(), 'public', w.url);
                if (fs.existsSync(p)) fs.unlinkSync(p);
                // Delete DB record
                await (prisma as any).wallpaper.delete({ where: { id: w.id } });
            }
        }

        return wallpaper;

    } catch (error) {
        console.error('Error fetching Bing wallpaper:', error);
        return null;
    }
}

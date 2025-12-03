import fs from 'fs';
import path from 'path';
import https from 'https';
import { prisma } from './prisma';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'icons');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function downloadAndSaveIcon(siteId: string, iconUrl: string) {
    try {
        const filename = `site-${siteId}-${Date.now()}.png`;
        const filepath = path.join(UPLOAD_DIR, filename);
        const publicPath = `/uploads/icons/${filename}`;

        // Download image
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filepath);
            https.get(iconUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download icon: ${response.statusCode}`));
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

        // Update database with local path
        await prisma.site.update({
            where: { id: siteId },
            data: {
                iconType: 'upload',
                customIconUrl: publicPath
            }
        });

        console.log(`Icon downloaded and saved for site ${siteId}: ${publicPath}`);
        return publicPath;

    } catch (error) {
        console.error(`Error downloading icon for site ${siteId}:`, error);
        return null;
    }
}

export async function deleteIcon(customIconUrl: string) {
    if (!customIconUrl || !customIconUrl.startsWith('/uploads/')) return;

    try {
        const filename = customIconUrl.split('/').pop();
        if (!filename) return;

        const filepath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Deleted local icon: ${filepath}`);
        }
    } catch (error) {
        console.error('Error deleting icon:', error);
    }
}

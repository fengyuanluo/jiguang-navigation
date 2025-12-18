import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSqliteDbSchema } from '@/lib/db-migrate';

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        await ensureSqliteDbSchema();
        const params = await props.params;
        const id = params.id;
        await prisma.customFont.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete font' }, { status: 500 });
    }
}

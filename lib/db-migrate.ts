import { prisma } from '@/lib/prisma';

type SqliteTableInfoRow = {
  name: string;
};

const INT32_MAX = 2147483647;
// 1e11：覆盖毫秒时间戳（13 位量级），避免误伤“未来秒时间戳”
const MS_TIMESTAMP_THRESHOLD = 100_000_000_000;

let ensurePromise: Promise<void> | null = null;

function isSqliteDatabaseUrl(url?: string) {
  return typeof url === 'string' && url.startsWith('file:');
}

async function hasTable(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}' LIMIT 1;`
  );
  return rows.length > 0;
}

async function getColumns(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<SqliteTableInfoRow[]>(`PRAGMA table_info('${tableName}');`);
  return new Set(rows.map((r) => r.name));
}

async function addColumnIfMissing(tableName: string, columnName: string, ddl: string) {
  const cols = await getColumns(tableName);
  if (cols.has(columnName)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${ddl};`);
  console.log(`[DB Migrate] 已补齐列: ${tableName}.${columnName}`);
}

/**
 * 保障历史 SQLite 数据库能“自我升级”到当前 Prisma schema 所需的最小结构。
 *
 * 背景：Docker 使用持久化卷保留 `/app/data/dev.db`，升级镜像时若不做迁移，
 * Prisma 会因为缺列/缺表直接报错（例如插件 POST /api/sites 时触发）。
 *
 * 设计原则：
 * - 幂等：重复调用不产生副作用
 * - 最小必要：只补齐缺失列/表，不做破坏性重建
 * - 仅针对 SQLite：避免未来切库时误执行
 */
export async function ensureSqliteDbSchema() {
  if (!isSqliteDatabaseUrl(process.env.DATABASE_URL)) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    console.log('[DB Migrate] 开始检查/补齐 SQLite 数据库结构...');
    // 1) 补齐缺失表（极端情况：数据库为空或非常老的版本）
    if (!(await hasTable('Site'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Site" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "desc" TEXT,
          "category" TEXT NOT NULL,
          "color" TEXT,
          "icon" TEXT,
          "iconType" TEXT,
          "customIconUrl" TEXT,
          "titleFont" TEXT,
          "descFont" TEXT,
          "titleColor" TEXT,
          "descColor" TEXT,
          "titleSize" INTEGER,
          "descSize" INTEGER,
          "isHidden" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('[DB Migrate] 已创建缺失表: Site');
    }

    if (!(await hasTable('Category'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Category" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "color" TEXT,
          "isHidden" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");`);
      console.log('[DB Migrate] 已创建缺失表: Category');
    } else {
      // 某些历史库可能缺少唯一索引，导致 upsert(where: {name}) 不稳定
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");`);
    }

    if (!(await hasTable('User'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "username" TEXT NOT NULL PRIMARY KEY,
          "passwordHash" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('[DB Migrate] 已创建缺失表: User');
    }

    if (!(await hasTable('GlobalSettings'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GlobalSettings" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
          "layout" TEXT NOT NULL,
          "config" TEXT NOT NULL,
          "theme" TEXT NOT NULL,
          "searchEngine" TEXT NOT NULL DEFAULT 'Google',
          "bingCacheMode" TEXT NOT NULL DEFAULT 'keep-all',
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('[DB Migrate] 已创建缺失表: GlobalSettings');
    }

    if (!(await hasTable('Wallpaper'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Wallpaper" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "url" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "filename" TEXT NOT NULL,
          "size" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DB Migrate] 已创建缺失表: Wallpaper');
    }

    if (!(await hasTable('CustomFont'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomFont" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "family" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "provider" TEXT NOT NULL DEFAULT 'google',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DB Migrate] 已创建缺失表: CustomFont');
    }

    // 2) 补齐 Site 表演进字段（最常见的崩溃点：titleSize/isHidden 等字段缺失）
    await addColumnIfMissing('Site', 'titleFont', 'TEXT');
    await addColumnIfMissing('Site', 'descFont', 'TEXT');
    await addColumnIfMissing('Site', 'titleColor', 'TEXT');
    await addColumnIfMissing('Site', 'descColor', 'TEXT');
    await addColumnIfMissing('Site', 'titleSize', 'INTEGER');
    await addColumnIfMissing('Site', 'descSize', 'INTEGER');
    await addColumnIfMissing('Site', 'isHidden', 'BOOLEAN NOT NULL DEFAULT false');

    // 2.1) 补齐 Category 关键字段（避免 upsert/update 时因缺列报错）
    await addColumnIfMissing('Category', 'color', 'TEXT');
    await addColumnIfMissing('Category', 'isHidden', 'BOOLEAN NOT NULL DEFAULT false');
    await addColumnIfMissing('Category', 'order', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing('Category', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('Category', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    // 3) 补齐 GlobalSettings 演进字段
    await addColumnIfMissing('GlobalSettings', 'searchEngine', "TEXT NOT NULL DEFAULT 'Google'");
    await addColumnIfMissing('GlobalSettings', 'bingCacheMode', "TEXT NOT NULL DEFAULT 'keep-all'");
    await addColumnIfMissing('GlobalSettings', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    // 3.1) 保障 CustomFont/Walpaper 基础字段存在（旧库可能缺表/缺列）
    await addColumnIfMissing('CustomFont', 'provider', "TEXT NOT NULL DEFAULT 'google'");
    await addColumnIfMissing('CustomFont', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('Wallpaper', 'size', 'INTEGER');
    await addColumnIfMissing('Wallpaper', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

    // 4) 兼容旧数据：若 order 被写入毫秒级时间戳导致 Int32 溢出，做一次性修复
    await prisma.$executeRawUnsafe(`
      UPDATE "Site"
      SET "order" = CAST("order" / 1000 AS INTEGER)
      WHERE "order" >= ${MS_TIMESTAMP_THRESHOLD};
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "Site"
      SET "order" = ${INT32_MAX}
      WHERE "order" > ${INT32_MAX};
    `);

    console.log('[DB Migrate] SQLite 数据库结构检查完成');
  })().catch((err) => {
    // 允许下次请求重试（避免一次失败后永远卡死）
    ensurePromise = null;
    console.error('[DB Migrate] SQLite schema ensure failed:', err);
    throw err;
  });

  return ensurePromise;
}

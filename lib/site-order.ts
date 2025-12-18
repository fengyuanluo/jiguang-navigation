const INT32_MAX = 2147483647;
const INT32_MIN = -2147483648;

// 1e11：可以覆盖 1973 年至今的毫秒时间戳（13 位量级），同时避免误伤“未来秒时间戳”
const MS_TIMESTAMP_THRESHOLD = 100_000_000_000;

/**
 * 将站点排序字段规范化为 Prisma Int(32位) 可接受的范围。
 *
 * - 若输入是毫秒时间戳（>= 1e11），自动换算成秒
 * - 若仍超出范围，做上限钳制，避免 Prisma 因溢出直接报错
 */
export function normalizeSiteOrder(value: unknown, fallback = 0) {
  const num = typeof value === 'string' ? Number(value) : Number(value);
  if (!Number.isFinite(num)) return fallback;

  const int = Math.trunc(num);
  if (int > INT32_MAX) {
    if (int >= MS_TIMESTAMP_THRESHOLD) {
      const seconds = Math.trunc(int / 1000);
      if (seconds >= INT32_MIN && seconds <= INT32_MAX) return seconds;
    }
    return INT32_MAX;
  }

  if (int < INT32_MIN) return INT32_MIN;
  return int;
}

export const SITE_ORDER_INT32_MAX = INT32_MAX;
export const SITE_ORDER_MS_THRESHOLD = MS_TIMESTAMP_THRESHOLD;


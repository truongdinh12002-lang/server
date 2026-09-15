/**
 * Tiện ích xử lý danh sách Origin được phép gọi API.
 *
 * Trên Railway biến môi trường thường bị thiếu, bị thừa dấu `/` ở cuối hoặc
 * chứa nhiều domain (web chính + preview). Khi đó `@fastify/cors` coi request
 * preflight là không hợp lệ và gọi `reply.callNotFound()`, tạo ra log
 * `Invalid API address: OPTIONS /auth/login` và trình duyệt báo lỗi CORS.
 */

const ORIGIN_ENV_KEYS = ['ORIGIN_URL', 'CORS_ORIGINS', 'ALLOWED_ORIGINS'] as const;

/** Bỏ khoảng trắng và dấu `/` thừa ở cuối để so sánh chính xác với header Origin. */
export const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/+$/, '');

/**
 * Đọc mọi biến môi trường khai báo origin, tách theo dấu `,` (hoặc khoảng trắng)
 * và trả về danh sách đã chuẩn hoá, không trùng lặp.
 */
export const getAllowedOrigins = (
  env: NodeJS.ProcessEnv = process.env,
): string[] => {
  const origins = ORIGIN_ENV_KEYS
    .flatMap((key) => (env[key] ?? '').split(/[\s,]+/))
    .map(normalizeOrigin)
    .filter((origin) => origin.length > 0);

  return [...new Set(origins)];
};

/** Danh sách rỗng nghĩa là chưa cấu hình -> cho phép mọi origin để API không chết. */
export const isOriginAllowed = (
  requestOrigin: string | undefined,
  allowedOrigins: string[],
): boolean => {
  // Request không có header Origin (curl, health check, server-to-server).
  if (!requestOrigin) return true;
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes('*')) return true;

  return allowedOrigins.includes(normalizeOrigin(requestOrigin));
};

/**
 * Giá trị dùng cho header `Access-Control-Allow-Origin` khi phải tự set thủ công
 * (ví dụ response SSE đã `reply.hijack()` nên plugin CORS không can thiệp được).
 */
export const resolveAllowOriginHeader = (
  requestOrigin: string | undefined,
  allowedOrigins: string[] = getAllowedOrigins(),
): string | undefined => {
  if (requestOrigin && isOriginAllowed(requestOrigin, allowedOrigins)) {
    return normalizeOrigin(requestOrigin);
  }
  // Railway có thể không chuyển tiếp header Origin trên kết nối GET dài:
  // fallback về origin đầu tiên đã cấu hình.
  return allowedOrigins.find((origin) => origin !== '*');
};

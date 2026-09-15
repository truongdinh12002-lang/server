import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { getAllowedOrigins, isOriginAllowed } from "../utils/cors-origins";

/**
 * Plugin cấu hình CORS (Cross-Origin Resource Sharing)
 * Cho phép Frontend ở domain khác gọi được API của Backend.
 *
 * Trước đây plugin truyền thẳng `process.env.ORIGIN_URL` vào option `origin`.
 * Nếu biến này thiếu trên Railway, sai chính tả, thừa dấu `/` ở cuối hoặc cần
 * nhiều domain thì `@fastify/cors` từ chối request preflight bằng
 * `reply.callNotFound()` -> rơi vào notFoundHandler và log
 * `Invalid API address: OPTIONS /auth/login`.
 */
export default fp(async (fastify, opts) => {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    fastify.log.warn(
      'ORIGIN_URL/CORS_ORIGINS chưa được cấu hình. CORS đang cho phép mọi origin. '
      + 'Hãy set ORIGIN_URL trên Railway (có thể liệt kê nhiều domain, cách nhau bởi dấu phẩy).',
    );
  }

  await fastify.register(cors, {
    origin: (requestOrigin, callback) => {
      if (isOriginAllowed(requestOrigin ?? undefined, allowedOrigins)) {
        // Trả về chính origin của request để hoạt động cùng `credentials: true`
        // (không được dùng `*` khi gửi cookie/Authorization).
        callback(null, requestOrigin ?? true);
        return;
      }

      fastify.log.warn(`CORS đã chặn origin: ${requestOrigin}`);
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    exposedHeaders: ['Content-Disposition'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Chấp nhận cả preflight không kèm `Access-Control-Request-Headers`.
    strictPreflight: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  fastify.log.info(
    `CORS is active. Allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*'}`,
  );
});

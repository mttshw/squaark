declare module 'fastify' {
  interface FastifyRequest {
    cartId: string;
  }
  interface Session {
    adminId: string;
  }
}

export {};

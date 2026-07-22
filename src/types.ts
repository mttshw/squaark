declare module 'fastify' {
  interface FastifyRequest {
    cartId: string;
  }
  interface Session {
    adminId: string;
    pendingOrderId?: string;
    pendingCheckoutAddress?: string;
    pendingCheckoutEmail?: string;
  }
}

export {};

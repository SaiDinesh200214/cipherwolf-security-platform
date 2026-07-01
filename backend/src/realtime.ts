import type { WebSocket } from "@fastify/websocket";

const clients = new Set<WebSocket>();

export function addRealtimeClient(client: WebSocket) {
  clients.add(client);
  client.on("close", () => clients.delete(client));
}

export function broadcastRealtime(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload, sentAt: new Date().toISOString() });

  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

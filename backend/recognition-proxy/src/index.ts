/**
 * Cloudflare Worker: Proxy für die Foto-Erkennung.
 * Der API-Schlüssel liegt ausschließlich als Secret im Worker, nie in der App.
 */
import { handleRequest, type Env } from './handler';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

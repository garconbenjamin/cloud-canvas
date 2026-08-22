declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

declare interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

declare interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

declare type DurableObjectState = object;

declare class DurableObject<Env = unknown> {
  protected ctx: DurableObjectState;
  protected env: Env;
  constructor(ctx: DurableObjectState, env: Env);
}

declare module 'cloudflare:workers' {
  export { DurableObject };
}

declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare type DurableObjectId = object;

declare interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

declare interface WebSocket {
  accept(): void;
}

declare interface ResponseInit {
  webSocket?: WebSocket;
}

export interface Env {
  ASSETS: Fetcher;
  VISITORS_COUNTER: DurableObjectNamespace;
}

// Durable Object 用于管理访问者计数
export class VisitorsCounter {
  private sessions: Set<WebSocket>;

  constructor(_state: DurableObjectState, _env: Env) {
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws/visitors') {
      return this.handleWebSocket(request);
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(request: Request): Promise<Response> {
    // 检查是否是 WebSocket 升级请求
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    // 创建 WebSocket 对
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // 接受 WebSocket 连接
    server.accept();

    // 添加到会话集合
    this.sessions.add(server);

    // 立即向新连接发送当前用户数
    this.sendUserCount(server);

    // 向所有其他连接广播新的用户数
    this.broadcastUserCount();

    // 监听连接关闭
    server.addEventListener('close', () => {
      this.sessions.delete(server);
      this.broadcastUserCount();
    });

    // 监听连接错误
    server.addEventListener('error', () => {
      this.sessions.delete(server);
      this.broadcastUserCount();
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private sendUserCount(ws: WebSocket) {
    const count = this.sessions.size;
    const message = JSON.stringify({ type: 'userCount', count });
    
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch {
      // 发送用户数量失败
    }
  }

  private broadcastUserCount() {
    const count = this.sessions.size;
    const message = JSON.stringify({ type: 'userCount', count });

    // 清理断开的连接并向活跃连接发送消息
    const activeSessions = new Set<WebSocket>();

    this.sessions.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          activeSessions.add(ws);
        }
      } catch {
        // 连接已断开，从集合中移除
        // 移除失效连接
      }
    });

    // 更新活跃会话集合
    this.sessions = activeSessions;
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 访问者计数端点
    if (url.pathname === '/ws/visitors') {
      // 获取 Durable Object 实例
      const durableObjectId = env.VISITORS_COUNTER.idFromName('global');
      const durableObject = env.VISITORS_COUNTER.get(durableObjectId);
      
      // 转发请求到 Durable Object
      return durableObject.fetch(request);
    }

    // 静态文件处理
    return env.ASSETS.fetch(request);
  },
};

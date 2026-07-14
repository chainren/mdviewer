// AIGC START
import * as net from 'net';

export const MAX_SOCKET_PORT = 65535;

export type PortAvailabilityChecker = (port: number) => Promise<boolean>;

export function getMaxHttpPort(wsOffset: number): number {
  return MAX_SOCKET_PORT - wsOffset;
}

export function parsePortValue(
  cliValue: string | undefined,
  envValue: string | undefined,
  defaultPort: number,
  wsOffset: number
): number {
  const rawValue = cliValue || envValue;
  const maxHttpPort = getMaxHttpPort(wsOffset);
  const value = rawValue === undefined ? defaultPort : Number(rawValue);

  if (!Number.isInteger(value) || value < 0 || value > maxHttpPort) {
    throw new Error(`--port 必须是 0 到 ${maxHttpPort} 之间的整数（当前 WebSocket 偏移为 ${wsOffset}）`);
  }

  return value;
}

export async function isPortAvailable(port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port < 0 || port > MAX_SOCKET_PORT) {
    return false;
  }

  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '0.0.0.0');
  });
}

export async function findAvailableHttpPort(
  startPort: number,
  wsOffset: number,
  checker: PortAvailabilityChecker = isPortAvailable
): Promise<number> {
  const maxHttpPort = getMaxHttpPort(wsOffset);

  if (!Number.isInteger(startPort) || startPort < 0 || startPort > maxHttpPort) {
    throw new Error(`HTTP 起始端口必须是 0 到 ${maxHttpPort} 之间的整数（当前值：${startPort}）`);
  }

  for (let candidate = startPort; candidate <= maxHttpPort; candidate++) {
    const httpOk = await checker(candidate);
    const wsOk = await checker(candidate + wsOffset);
    if (httpOk && wsOk) {
      return candidate;
    }
  }

  throw new Error(`未找到可用端口：HTTP 端口范围 ${startPort}-${maxHttpPort}，且需预留 WebSocket 偏移 ${wsOffset}`);
}
// AIGC END

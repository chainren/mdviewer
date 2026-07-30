// AIGC START
export const APP_NAME = 'mdviewer';
export const APP_VERSION = '1.1.0';

export function getVersionText(): string {
  return `${APP_NAME} ${APP_VERSION}`;
}

export function hasVersionFlag(args: string[]): boolean {
  return args.includes('--version') || args.includes('-v');
}
// AIGC END

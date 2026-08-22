/**
 * Google AuthSession returns to `/oauthredirect`, which is a callback path
 * rather than an application screen. Let AuthSession consume the URL while
 * keeping Expo Router from rendering an unmatched-route page.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // Expo may provide either a path (`/oauthredirect?...`) or the complete
    // custom-scheme URL (`com.bestfriends.bloom://oauthredirect?...`).
    const url = new URL(path, 'com.bestfriends.bloom://app.home');
    if (url.hostname === 'oauthredirect' || url.pathname === '/oauthredirect') {
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}

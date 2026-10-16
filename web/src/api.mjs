const publicOrigin='https://selim.cloud/adesso';
export const onlineApi = location.protocol !== 'file:';
export function api(path) {
  if (!onlineApi) return null;
  // The Android WebView can load the bundled UI from a file, while the
  // production WebView loads selim.cloud. Keep API requests on the public
  // backend instead of accidentally targeting a local device/server.
  const prefix = location.hostname === 'selim.cloud' ? publicOrigin : (location.pathname.startsWith('/adesso') ? '/adesso' : '');
  return `${prefix}/api${path}`;
}

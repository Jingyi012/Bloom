export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kuala_Lumpur';
  } catch {
    return 'Asia/Kuala_Lumpur';
  }
}

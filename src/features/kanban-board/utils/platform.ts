type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } }

export function detectMac(nav: Navigator | undefined = globalThis.navigator): boolean {
  if (!nav) return false
  const platform = (nav as NavigatorWithUAData).userAgentData?.platform ?? nav.platform ?? ''
  return /mac|iphone|ipad/i.test(platform)
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest('input, textarea, select, [contenteditable]') !== null
}

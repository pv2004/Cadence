export type HapticStyle =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning';

export const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 8,
  light: 12,
  medium: 20,
  heavy: 30,
  success: [14, 35, 22],
  warning: [25, 45, 25],
};

let hapticsEnabled = true;
let lastTriggeredAt = 0;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

/**
 * Fires native iOS Safari Taptic Engine switch trick when WebKit does not expose
 * navigator.vibrate, while always prioritizing window.navigator.vibrate when present.
 */
function triggerIOSTapticFallback(): void {
  if (typeof document === 'undefined') return;
  try {
    let label = document.getElementById('ios-taptic-switch-label') as HTMLLabelElement | null;
    if (!label) {
      label = document.createElement('label');
      label.id = 'ios-taptic-switch-label';
      label.setAttribute('aria-hidden', 'true');
      label.style.position = 'fixed';
      label.style.width = '1px';
      label.style.height = '1px';
      label.style.opacity = '0';
      label.style.pointerEvents = 'none';
      label.style.left = '-9999px';
      label.style.top = '-9999px';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
    }
    label.click();
  } catch {
    // Ignore DOM fallback errors
  }
}

/**
 * Triggers tactile vibration using window.navigator.vibrate with iOS-tuned millisecond
 * cadence patterns (and iOS Taptic switch fallback if navigator.vibrate is absent).
 */
export function triggerHaptic(style: HapticStyle = 'light'): boolean {
  if (!hapticsEnabled) return false;

  const now = Date.now();
  // Prevent duplicate double-firing within the same 15ms event bubble frame
  if (now - lastTriggeredAt < 15 && style === 'selection') {
    return false;
  }
  lastTriggeredAt = now;

  const pattern = HAPTIC_PATTERNS[style] ?? HAPTIC_PATTERNS.light;

  if (
    typeof window !== 'undefined' &&
    typeof window.navigator !== 'undefined' &&
    typeof window.navigator.vibrate === 'function'
  ) {
    try {
      return window.navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  // Fallback for iPhone Safari where WebKit uses <input type="checkbox" switch> for Taptic Engine
  triggerIOSTapticFallback();
  return false;
}

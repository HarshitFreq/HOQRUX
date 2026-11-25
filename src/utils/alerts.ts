import { Alert, Platform } from 'react-native';

export interface ConfirmActionOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function confirmAction(options: ConfirmActionOptions): void {
  if (Platform.OS === 'web') {
    const text = options.title ? `${options.title}\n\n${options.message}` : options.message;
    const ok = typeof window !== 'undefined' ? window.confirm(text) : true;
    if (ok) {
      void options.onConfirm();
    } else {
      options.onCancel?.();
    }
    return;
  }

  Alert.alert(
    options.title,
    options.message,
    [
      { text: options.cancelText || 'CANCEL', style: 'cancel', onPress: options.onCancel },
      {
        text: options.confirmText || 'CONFIRM',
        style: options.destructive ? 'destructive' : 'default',
        onPress: options.onConfirm,
      },
    ]
  );
}

export function showAlert(title: string, message?: string, onOk?: () => void): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const text = [title, message].filter(Boolean).join('\n\n');
      window.alert(text);
      onOk?.();
    }
    return;
  }

  Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
}

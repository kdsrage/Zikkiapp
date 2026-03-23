import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Bestätigen', message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

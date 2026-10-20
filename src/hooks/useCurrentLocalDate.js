import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useCurrentLocalDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setCurrentDate(new Date());
    const intervalId = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  return currentDate;
}


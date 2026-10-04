import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { deleteScan, listOpenScans } from '@/db/repositories/pending-scan';
import type { PendingScan } from '@/domain/types';
import { processPendingScans } from '@/services/barcode-service';

/**
 * Offene Scans der Warteschlange. Wartende Scans werden automatisch abgerufen, sobald eine
 * Internetverbindung besteht – beim Öffnen des Screens und bei jedem Verbindungswechsel.
 */
export function usePendingScans(): { scans: PendingScan[]; discard: (id: number) => Promise<void> } {
  const db = useSQLiteContext();
  const [scans, setScans] = useState<PendingScan[]>([]);
  const syncing = useRef(false);

  const refresh = useCallback(async () => {
    setScans(await listOpenScans(db));
  }, [db]);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const open = await listOpenScans(db);
      if (open.some((s) => s.status === 'pending')) await processPendingScans(db);
    } finally {
      syncing.current = false;
      await refresh();
    }
  }, [db, refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      NetInfo.fetch().then((s) => {
        if (s.isConnected && s.isInternetReachable !== false) sync();
      });
    }, [refresh, sync]),
  );

  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        if (s.isConnected && s.isInternetReachable !== false) sync();
      }),
    [sync],
  );

  const discard = useCallback(
    async (id: number) => {
      await deleteScan(db, id);
      await refresh();
    },
    [db, refresh],
  );

  return { scans, discard };
}

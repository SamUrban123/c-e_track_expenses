import { useEffect } from 'react';
import { syncService } from '../services/SyncService';

export const useSync = () => {
    useEffect(() => {
        const run = () => syncService.processQueue();

        window.addEventListener('online', run);
        // Poll every 30s
        const interval = setInterval(run, 30000);

        // Initial run
        run();

        return () => {
            window.removeEventListener('online', run);
            clearInterval(interval);
        };
    }, []);

    return {
        syncNow: () => syncService.processQueue()
    };
};

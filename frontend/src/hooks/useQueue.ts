import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import { calcETA } from '../utils/eta';

interface QueueState {
  queueLength: number;
  eta: number;
  confidence: number;
  loading: boolean;
}

export const useQueue = (): QueueState => {
  const [state, setState] = useState<QueueState>({ queueLength:0, eta:0, confidence:94, loading:true });

  const refresh = useCallback(() => {
    api.get('/orders/queue-status')
      .then(res => setState({ queueLength:res.data.queueLength, eta:res.data.estimatedWait, confidence:res.data.confidence??94, loading:false }))
      .catch(() => setState(s => ({ ...s, loading:false })));
  }, []);

  useEffect(() => {
    refresh();
    const socket = getSocket();
    socket.on('queueUpdate', ({ queueLength, eta }: { queueLength:number; eta?:number }) => {
      setState(s => ({ ...s, queueLength, eta: eta ?? calcETA(5, queueLength), loading:false }));
    });
    return () => { socket.off('queueUpdate'); };
  }, [refresh]);

  return state;
};

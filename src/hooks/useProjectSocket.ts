'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/providers/SocketContext';

export const useProjectSocket = (projectId: string, onEvent?: (event: string, data: any) => void) => {
  const { socket } = useSocket();
  // Use a ref so the event handler always sees the latest callback without recreating listeners
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!socket || !projectId) return;

    const join = () => socket.emit('join:project', projectId);

    // Join immediately if the socket is already connected
    if (socket.connected) join();

    // Re-join after every reconnect — socket.io auto-reconnects but the server
    // forgets which rooms each client was in, so we must re-emit join:project.
    socket.on('connect', join);

    const events = [
      'plans:updated',
      'issue:created',
      'issue:updated',
      'snag:created',
      'snag:updated',
      'material:updated',
      'boq:updated',
      'budget:updated',
      'milestones:updated',
    ];

    // Named handlers so we can remove exactly these, not all listeners for the event
    const handlers: Record<string, (data: any) => void> = {};
    events.forEach(event => {
      const handler = (data: any) => {
        if (onEventRef.current) onEventRef.current(event, data);
      };
      handlers[event] = handler;
      socket.on(event, handler);
    });

    return () => {
      socket.off('connect', join);
      events.forEach(event => socket.off(event, handlers[event]));
      socket.emit('leave:project', projectId);
    };
  }, [socket, projectId]);
};

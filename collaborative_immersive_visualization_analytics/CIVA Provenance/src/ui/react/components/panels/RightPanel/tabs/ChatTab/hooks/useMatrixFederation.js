/**
 * @file useMatrixFederation.js
 * @description Hook for Matrix federation status and federated users.
 * Phase 6: Frontend Federation Indicators
 *
 * @example
 * const { federatedUsers, federationStatus, isLoading } = useMatrixFederation(roomId);
 */

import { useState, useEffect } from 'react';
import { sync as log } from '@Utils/logger.js';

/**
 * Hook for Matrix federation status and user tracking.
 *
 * @param {string} roomId - Current room ID
 * @returns {Object} Federation state
 */
export function useMatrixFederation(roomId) {
  const [federatedUsers, setFederatedUsers] = useState([]);
  const [federationStatus, setFederationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Matrix federation status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/matrix/status');
        if (response.ok) {
          const status = await response.json();
          setFederationStatus(status);
        }
      } catch (error) {
        log.warn('Failed to fetch Matrix status:', error.message);
      }
    };

    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch federated users for current room
  useEffect(() => {
    if (!roomId) {
      setFederatedUsers([]);
      setIsLoading(false);
      return;
    }

    const fetchFederatedUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/matrix/users/room/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setFederatedUsers(data.federatedUsers || []);
          log.debug('Fetched federated users:', data.count);
        }
      } catch (error) {
        log.warn('Failed to fetch federated users:', error.message);
        setFederatedUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFederatedUsers();
    // Poll every 60 seconds
    const interval = setInterval(fetchFederatedUsers, 60000);
    return () => clearInterval(interval);
  }, [roomId]);

  return {
    federatedUsers,
    federatedUserCount: federatedUsers.length,
    federationStatus,
    isFederationEnabled: federationStatus?.enabled || false,
    isFederationConnected: federationStatus?.connected || false,
    isLoading,
  };
}

export default useMatrixFederation;

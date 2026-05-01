import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================
vi.mock('@Utils/logger.js', () => ({
  view: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn(), trace: vi.fn() }
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn(() => 'local-user'),
  getUserName: vi.fn(() => 'Local User')
}));

const mockPresenceSystem = {
  getOnlineUsers: vi.fn(() => []),
  setActivity: vi.fn()
};

vi.mock('@Collaboration/presence/presenceSystem.js', () => ({
  presenceSystem: mockPresenceSystem
}));

const mockProvenanceManager = {
  commitState: vi.fn(),
  getLatestNode: vi.fn(() => null)
};

vi.mock('@Collaboration/provenance/ProvenanceManager.js', () => ({
  default: mockProvenanceManager
}));

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(() => Promise.resolve({ view: {} })) }
}));

vi.mock('@Collaboration/yjs/yjsSetup.js', () => ({
  ydoc: { getMap: vi.fn(() => ({ set: vi.fn() })) }
}));

// Import target under test (since it's a singleton, we might want to interact carefully or create instances if possible, but manager exports a singleton usually. BaseManager handles instances)
import { viewConfigurationManager } from './ViewConfigurationManager';
import { ViewConfiguration } from '../models/ViewConfiguration';

describe('ViewConfigurationManager (Sections 5.1 & 5.2 Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Clear the maps to ensure clean state
    viewConfigurationManager._viewConfigs.clear();
    
    // Seed a ViewConfiguration
    const view = new ViewConfiguration({
      id: 'test-view-1',
      name: 'Test View',
      ownerUserId: 'local-user'
    });
    
    // Mock class methods so we don't need real Data/VTK implementations for tests
    view.addFilter = vi.fn(() => 'filter-1');
    view.updateFilter = vi.fn();
    view.removeFilter = vi.fn();
    view.addWidget = vi.fn(() => 'widget-1');
    view.updateWidget = vi.fn();
    
    viewConfigurationManager._viewConfigs.set(view.id, view);
    
    // Spy on internal sync function to verify we aren't bypassing floor control
    vi.spyOn(viewConfigurationManager, '_syncToServer').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Section 5.1: Temporal Provenance Hooks', () => {
    it('should fire ProvenanceManager.commitState when adding a filter', () => {
      viewConfigurationManager.addFilter('test-view-1', { type: 'density' });
      
      expect(mockProvenanceManager.commitState).toHaveBeenCalledTimes(1);
      
      const [intent] = mockProvenanceManager.commitState.mock.calls[0];
      expect(intent).toBe('Added density filter'); // Checking intent interpolation logic
    });

    it('should use debouncing when updating a filter to avoid network flooding', () => {
      // First update
      viewConfigurationManager.updateFilter('test-view-1', 'filter-1', { value: 50 });
      // Second update inside the debounce window
      viewConfigurationManager.updateFilter('test-view-1', 'filter-1', { value: 75 });
      
      // Provenance commit should not have fired yet
      expect(mockProvenanceManager.commitState).toHaveBeenCalledTimes(0);
      
      // Advance timers by 1000ms
      vi.advanceTimersByTime(1000);
      
      // Should only be called ONCE despite two continuous drags
      expect(mockProvenanceManager.commitState).toHaveBeenCalledTimes(1);
      const [intent] = mockProvenanceManager.commitState.mock.calls[0];
      expect(intent).toBe('Adjusted filter settings');
    });

    it('updateView should properly merge cloned updates into a view', () => {
      const view = viewConfigurationManager._viewConfigs.get('test-view-1');
      view.camera = { distance: 10 };
      
      viewConfigurationManager.updateView('test-view-1', {
        name: 'Restored View',
        camera: { distance: 50 }
      });
      
      expect(view.name).toBe('Restored View');
      expect(view.camera.distance).toBe(50);
      expect(viewConfigurationManager._syncToServer).toHaveBeenCalled();
    });
  });

  describe('Section 5.2: Social Translucence & Floor Control (Presenter Lock)', () => {
    it('should allow edits if there is no presenter in the room', () => {
      mockPresenceSystem.getOnlineUsers.mockReturnValue([
        { id: 'user-b', role: 'viewer' }
      ]);
      
      const result = viewConfigurationManager.addFilter('test-view-1', { type: 'threshold' });
      
      expect(result).toBe('filter-1');
      expect(viewConfigurationManager._syncToServer).toHaveBeenCalled();
    });

    it('should allow edits if the local user is the current presenter', () => {
      mockPresenceSystem.getOnlineUsers.mockReturnValue([
        { id: 'local-user', userId: 'local-user', role: 'presenter' }
      ]);
      
      const result = viewConfigurationManager.addFilter('test-view-1', { type: 'threshold' });
      
      expect(result).toBe('filter-1');
      expect(viewConfigurationManager._syncToServer).toHaveBeenCalled();
    });

    it('should maliciously block filter edits if a DIFFERENT user holds the presenter lock', () => {
      mockPresenceSystem.getOnlineUsers.mockReturnValue([
        { id: 'other-user', userId: 'other-user', role: 'presenter' },
        { id: 'local-user', userId: 'local-user', role: 'viewer' }
      ]);
      
      const originalName = viewConfigurationManager._viewConfigs.get('test-view-1').name;
      
      // Try to edit
      const result = viewConfigurationManager.addFilter('test-view-1', { type: 'threshold' });
      const renameResult = viewConfigurationManager.renameView('test-view-1', 'Hacked');
      
      // All edits blocked
      expect(result).toBeNull();
      expect(renameResult).toBeNull();
      
      // Server sync blocked
      expect(viewConfigurationManager._syncToServer).not.toHaveBeenCalled();
      
      // Provenance history blocked
      expect(mockProvenanceManager.commitState).not.toHaveBeenCalled();

      // Ensure model was untouched
      expect(viewConfigurationManager._viewConfigs.get('test-view-1').name).toBe(originalName);
    });

    it('should fire presenceSystem.setActivity telemetry upon discrete interaction hooks', () => {
      // Act
      viewConfigurationManager.addWidget('test-view-1', { type: 'ruler' });
      
      // Assert
      expect(mockPresenceSystem.setActivity).toHaveBeenCalledWith(
        'measuring', 
        'Added ruler', 
        'test-view-1'
      );
    });

    it('should fire presenceSystem.setActivity on debounced interactions', () => {
      viewConfigurationManager.updateWidget('test-view-1', 'dist', { points: [] });
      
      // The activity badge fires immediately regardless of the provenance latency
      expect(mockPresenceSystem.setActivity).toHaveBeenCalledWith(
        'measuring', 
        'Adjusting Widget', 
        'test-view-1'
      );
    });
  });
});

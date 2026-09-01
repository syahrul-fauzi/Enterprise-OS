/**
 * EOS Core Realtime Package
 * Canonical realtime infrastructure for Phase D implementation
 * Complies with D1 Architecture Truth Audit requirements
 */

export {
  notifyWorkspaceListeners,
  registerWorkspaceListener,
  unregisterWorkspaceListener,
  type WorkspaceListener
} from './workspace-notifier';
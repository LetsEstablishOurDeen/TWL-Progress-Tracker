import { EditRequest, FocusReminder } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  type: 'reminder' | 'request_status' | 'general';
  read: boolean;
}

// Memory cache for active notification callbacks
const listeners = new Set<(notification: AppNotification) => void>();
const permissionListeners = new Set<(permission: NotificationPermission) => void>();

// Track loaded requests and reminders to avoid firing notifications on initial firestore fetch
let initialRequestsLoaded = false;
let initialRemindersLoaded = false;
const knownRequestStatuses = new Map<string, 'pending' | 'approved' | 'rejected'>();
const knownReminderIds = new Set<string>();

/**
 * Play a beautiful, warm, organic synthesized chime using standard Web Audio API.
 * This is zero-dependency and ensures instant feedback regardless of network state.
 */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Soft chime sequence (pleasant hum/ring)
    osc.type = 'sine';
    const now = ctx.currentTime;
    
    // Low-high warm harmony
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5 (Major third)
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.debug('Audio Notification chime skipped or blocked by browser gesture rules:', e);
  }
}

export const notificationService = {
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    try {
      const permission = await Notification.requestPermission();
      this.notifyPermissionChanged(permission);
      return permission;
    } catch (err) {
      console.warn("Notification request failed or is blocked in this sandsboxed iframe environment:", err);
      // Fallback for older browsers
      const permission = (Notification as any).permission;
      this.notifyPermissionChanged(permission);
      return permission;
    }
  },

  subscribeToPermission(callback: (permission: NotificationPermission) => void) {
    permissionListeners.add(callback);
    callback(this.getPermissionStatus());
    return () => {
      permissionListeners.delete(callback);
    };
  },

  notifyPermissionChanged(permission: NotificationPermission) {
    permissionListeners.forEach(cb => cb(permission));
  },

  subscribeToNotifications(callback: (notification: AppNotification) => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  /**
   * Triggers a device-level system notification AND/OR plays audio chime plus triggers fallback callbacks.
   */
  async notify(title: string, body: string, type: AppNotification['type'] = 'general') {
    playNotificationSound();

    const id = Math.random().toString(36).substring(2, 9);
    const notification: AppNotification = {
      id,
      title,
      body,
      createdAt: new Date().toISOString(),
      type,
      read: false
    };

    // Trigger in-app listeners (for live alerts / slide-on toast fallback)
    listeners.forEach(cb => cb(notification));

    // Try device-level Native HTML5 system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const nativeNotification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: id
        });
        
        nativeNotification.onclick = () => {
          window.focus();
        };
      } catch (err) {
        console.warn("Device System notification failed inside security sandsbox sandbox.", err);
      }
    }
  },

  /**
   * Monitor real-time changes in learner's request documents and fire notifications on approval/rejections.
   */
  processRequestsSnapshot(requests: EditRequest[], activeLearnerId: string) {
    if (!activeLearnerId) return;

    const userRequests = requests.filter(r => r.learnerId === activeLearnerId);

    if (!initialRequestsLoaded) {
      // Map initial states without notifications
      userRequests.forEach(req => {
        if (req.id) {
          knownRequestStatuses.set(req.id, req.status);
        }
      });
      initialRequestsLoaded = true;
      return;
    }

    userRequests.forEach(req => {
      if (!req.id) return;
      const prevStatus = knownRequestStatuses.get(req.id);

      if (prevStatus && prevStatus !== req.status) {
        // Status changed!
        if (req.status === 'approved') {
          const detailTitle = req.details?.title || (req.type === 'task' ? `${req.details?.count} Tasks` : 'Learning Item');
          this.notify(
            "🎉 Learning Update Approved!",
            `Your submission for "${detailTitle}" has been approved by admin!`,
            'request_status'
          );
        } else if (req.status === 'rejected') {
          const detailTitle = req.details?.title || (req.type === 'task' ? `${req.details?.count} Tasks` : 'Learning Item');
          this.notify(
            "⚠️ Learning Update Rejected",
            `Your request for "${detailTitle}" was not approved. Check with the administrator.`,
            'request_status'
          );
        }
      }

      knownRequestStatuses.set(req.id, req.status);
    });
  },

  /**
   * Monitor real-time changes in learner's focus reminders/deadline alerts and trigger notifications.
   */
  processRemindersSnapshot(reminders: FocusReminder[], activeLearnerId: string) {
    if (!activeLearnerId) return;

    const pendingReminders = reminders.filter(r => r.learnerId === activeLearnerId && r.status === 'pending');

    if (!initialRemindersLoaded) {
      // Register existing reminders silently
      pendingReminders.forEach(r => {
        if (r.id) knownReminderIds.add(r.id);
      });
      initialRemindersLoaded = true;
      return;
    }

    pendingReminders.forEach(r => {
      if (!r.id) return;

      if (!knownReminderIds.has(r.id)) {
        // New reminder generated!
        knownReminderIds.add(r.id);
        const heading = r.type === 'deadline' ? "⏰ Deadline Reflection Prompt" : "✨ Gentle Learning Progress Question";
        this.notify(heading, r.questionText || "Your course progress update is requested.", 'reminder');
      }
    });

    // Clean up cache for removed reminders
    const currentPendingIds = new Set(pendingReminders.map(r => r.id).filter(Boolean) as string[]);
    knownReminderIds.forEach(id => {
      if (!currentPendingIds.has(id)) {
        // Clean up or keep if we want, but keeping is fine to prevent re-firing on delete. Actually let's keep to prevent re-alerts
      }
    });
  },

  /**
   * Reset snapshots state on user logout/login switch
   */
  resetState() {
    initialRequestsLoaded = false;
    initialRemindersLoaded = false;
    knownRequestStatuses.clear();
    knownReminderIds.clear();
  }
};

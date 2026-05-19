import { EditRequest } from '../types';

const REQUESTS_KEY = 'wisdom_lounge_requests';

function getRequests(): EditRequest[] {
  const data = localStorage.getItem(REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveRequests(requests: EditRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

// Simple event target to simulate real-time updates
export const requestEvents = new EventTarget();

export const requestService = {
  async submitRequest(request: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) {
    const requests = getRequests();
    const newRequest: EditRequest = {
      ...request,
      id: Math.random().toString(36).substring(2, 10),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    requests.push(newRequest);
    saveRequests(requests);
    requestEvents.dispatchEvent(new Event('requests_changed'));
    return newRequest;
  },

  async updateRequestStatus(id: string, status: 'approved' | 'rejected') {
    const requests = getRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
      requests[index].status = status;
      saveRequests(requests);
      requestEvents.dispatchEvent(new Event('requests_changed'));
    }
  },

  async deleteRequest(id: string) {
    let requests = getRequests();
    requests = requests.filter(r => r.id !== id);
    saveRequests(requests);
    requestEvents.dispatchEvent(new Event('requests_changed'));
  },

  subscribeToRequests(callback: (requests: EditRequest[]) => void) {
    // Return sorted requests
    const returnSorted = () => {
      const sorted = getRequests().sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
      callback(sorted);
    };

    returnSorted();
    
    // Listener for changes within the same tab
    const listener = () => returnSorted();
    requestEvents.addEventListener('requests_changed', listener);
    
    // Listener for cross-tab changes
    const storageListener = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) {
        returnSorted();
      }
    };
    window.addEventListener('storage', storageListener);
    
    return () => {
      requestEvents.removeEventListener('requests_changed', listener);
      window.removeEventListener('storage', storageListener);
    };
  }
};

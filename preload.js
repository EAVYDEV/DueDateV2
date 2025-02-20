const { contextBridge } = require('electron');

// Mock Quickbase API initialization for demonstration
const initializeQuickBase = (token) => {
  console.log('Initializing QuickBase with token:', token);
  return {
    api: (endpoint, options) => {
      console.log('Calling QuickBase API:', endpoint, options);
      return new Promise((resolve, reject) => {
        // Mock API response for demonstration purposes
        if (endpoint === 'API_DoQuery') {
          resolve({
            data: [
              ['12345', 'Project A', '2024-07-01', 'Zone 1', 'Scope A', 'AM A'],
              ['67890', 'Project B', '2024-08-01', 'Zone 2', 'Scope B', 'AM B'],
            ],
          });
        } else {
          reject(new Error('Unknown API endpoint'));
        }
      });
    },
  };
};

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('api', {
  initializeQuickBase,
});

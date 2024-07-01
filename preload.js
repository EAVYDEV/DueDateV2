const { contextBridge } = require('electron');
require('dotenv').config();
const QuickBase = require('quickbase');

contextBridge.exposeInMainWorld('api', {
  initializeQuickBase: (token) => new QuickBase({ realm: 'awnexinc', userToken: token }),
  getEnvironmentVariables: () => ({
    QB_USER_TOKEN: process.env.QB_USER_TOKEN,
  }),
});

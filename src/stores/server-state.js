// server state and configuration
import { defineStore } from 'pinia'
import * as Mdf from '../model-common'

export const useServerStateStore = defineStore('server-state', {
  state: () => ({
    omsUrl: (process.env.OMS_URL || ''), // oms web-service url
    config: Mdf.emptyConfig(), // server state and configuration
    diskUse: Mdf.emptyDiskUseState() // disk space usage
  }),

  getters: {
  },

  actions: {
    dispatchServerConfig (cfg) {
      if (Mdf.isConfig(cfg)) this.config = cfg
    },

    dispatchDiskUse (du) {
      if (Mdf.isDiskUseState(du)) this.diskUse = du
    }
  }
})

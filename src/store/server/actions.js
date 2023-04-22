// server state and configuration

// set new value to server config
export const serverConfig = ({ commit }, cfg) => {
  commit('serverConfig', cfg)
}

// set new value of archive state
export const archiveState = ({ commit }, st) => {
  commit('archiveState', st)
}

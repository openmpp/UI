// server state and configuration

// set new value to server config
export const serverConfig = ({ commit }, cfg) => {
  commit('serverConfig', cfg)
}

// set new value to disk usage state
export const diskUse = ({ commit }, du) => {
  commit('diskUse', du)
}

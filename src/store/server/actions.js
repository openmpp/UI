// server state and configuration

// set new value to server config
export const serverConfig = ({ commit }, cfg) => {
  commit('serverConfig', cfg)
}

// set new value of disk space usage
export const diskUse = ({ commit }, st) => {
  commit('diskUse', st)
}

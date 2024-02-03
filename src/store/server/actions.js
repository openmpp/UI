// server state and configuration

// set new value to server config
export const serverConfig = ({ commit }, cfg) => {
  commit('serverConfig', cfg)
}

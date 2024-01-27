// server state and configuration
import * as Mdf from 'src/model-common'

export const serverConfig = (state, cfg) => {
  if (Mdf.isConfig(cfg)) state.config = cfg
}

export const diskUse = (state, st) => {
  if (Mdf.isDiskUseInfo(st)) state.diskUse = st
}

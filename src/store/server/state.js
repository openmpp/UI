// server state and configuration
import * as Mdf from 'src/model-common'

export default function () {
  return {
    omsUrl: (process.env.OMS_URL || ''), // oms web-service url
    config: Mdf.emptyConfig(), // server state and configuration
    diskUse: Mdf.emptyDiskUse() // disk space usage
  }
}

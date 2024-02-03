// server state and configuration

import * as Mlang from './language'

// return empty service configuration
export const emptyConfig = () => {
  return {
    OmsName: '',
    AllowUserHome: false,
    AllowDownload: false,
    AllowUpload: false,
    AllowMicrodata: false,
    IsJobControl: false,
    IsModelDoc: false,
    IsDiskUse: false,
    DiskUse: {
      ScanInterval: 0,
      Limit: 0,
      AllLimit: 0
    },
    Env: {},
    ModelCatalog: {
      ModelDir: '',
      ModelLogDir: '',
      IsLogDirEnabled: false,
      LastTimeStamp: ''
    },
    RunCatalog: {
      RunTemplates: [],
      DefaultMpiTemplate: 'mpi.ModelRun.template.txt',
      MpiTemplates: [],
      Presets: []
    }
  }
}

// return true if this is service config (it can be empty)
export const isConfig = (c) => {
  if (!c) return false
  if (!c.hasOwnProperty('OmsName') || !c.hasOwnProperty('AllowUserHome') ||
    !c.hasOwnProperty('AllowDownload') || !c.hasOwnProperty('AllowUpload') || !c.hasOwnProperty('AllowMicrodata') ||
    !c.hasOwnProperty('IsJobControl') || !c.hasOwnProperty('IsModelDoc') || !c.hasOwnProperty('IsDiskUse') ||
    !c.hasOwnProperty('DiskUse') || !c.hasOwnProperty('Env') || !c.hasOwnProperty('ModelCatalog') ||
    !c.hasOwnProperty('RunCatalog')) {
    return false
  }
  if (!c.ModelCatalog.hasOwnProperty('ModelDir') || !c.ModelCatalog.hasOwnProperty('ModelLogDir') || !c.ModelCatalog.hasOwnProperty('IsLogDirEnabled')) return false
  if (!c.RunCatalog.hasOwnProperty('RunTemplates') || !c.RunCatalog.hasOwnProperty('DefaultMpiTemplate') ||
    !c.RunCatalog.hasOwnProperty('MpiTemplates') || !c.RunCatalog.hasOwnProperty('Presets')) {
    return false
  }
  if (!c.DiskUse.hasOwnProperty('ScanInterval') || typeof c.DiskUse.ScanInterval !== typeof 1) return false
  if (!c.DiskUse.hasOwnProperty('Limit') || typeof c.DiskUse.Limit !== typeof 1) return false
  if (!c.DiskUse.hasOwnProperty('AllLimit') || typeof c.DiskUse.AllLimit !== typeof 1) return false

  return Array.isArray(c.RunCatalog.RunTemplates) && Array.isArray(c.RunCatalog.MpiTemplates) && Array.isArray(c.RunCatalog.Presets)
}

// return value of server environemnt variable by key, if no such variable then return empty '' string
export const configEnvValue = (c, key) => {
  if (!isConfig(c)) return ''
  if (!c.Env.hasOwnProperty(key)) return ''
  return c.Env[key] || ''
}

// return run options presets as array of objects: [{ name, label, descr, opts{....} }, ....]
// name is either starts from 'modelName.' or 'any_model.'
// result sorted by name and 'modelName.' is before 'any_model.'
export const configRunOptsPresets = (c, modelName, uiLang, modelLc) => {
  if (!modelName || typeof modelName !== typeof 'string' || !isConfig(c)) return []

  const pLst = []
  const mnDot = modelName + '.'
  const amDot = 'any_model.'

  for (let k = 0; k < c.RunCatalog.Presets.length; k++) {
    const p = c.RunCatalog.Presets[k]

    // skip if preset does not have name or options string
    if (!p?.Name || typeof p.Name !== typeof 'string') continue
    if (!p?.Options || typeof p.Options !== typeof 'string') continue

    if (!p.Name.startsWith(mnDot) && !p.Name.startsWith(amDot)) continue // must start from 'model_name.' or 'any_model.'

    // parse options json string
    let iOpts = {}
    try {
      iOpts = JSON.parse(p.Options)
    } catch {
      continue // skip incorrect options
    }
    if (!iOpts || !(iOpts instanceof Object) || Array.isArray(iOpts)) continue // must be an object with properties

    // find preset label and description in UI language or current model language
    // if not found then use first label and description
    let descr = ''
    let label = ''

    if (Array.isArray(iOpts?.Text) && iOpts.Text.length > 0) {
      let isFound = false
      let isFirst = false
      let fL = ''
      let fD = ''

      // find label and description by UI language
      const ui2p = Mlang.splitLangCode(uiLang)

      for (let j = 0; !isFound && j < iOpts.Text.length; j++) {
        let lc = iOpts.Text[j]?.LangCode || ''
        if (lc && typeof lc === typeof 'string' && lc !== '') lc = lc.toLowerCase()

        isFound = lc === ui2p.lower
        if (isFound) {
          label = iOpts.Text[j]?.ShortLabel || ''
          descr = iOpts.Text[j]?.Descr || ''
          break // UI language found
        }
        if (lc === ui2p.first) {
          fL = iOpts.Text[j]?.ShortLabel || ''
          fD = iOpts.Text[j]?.Descr || ''
          isFirst = true // first part of UI language found: fr-CA == FR
        }
      }
      // if full language code not found then check if there is matching first part of language code
      if (!isFound && isFirst) {
        label = fL
        descr = fD
        isFound = true
      }

      // if not found then search label and description by current model language
      if (!isFound) {
        const mLc = modelLc.toLowerCase()

        for (let j = 0; !isFound && j < iOpts.Text.length; j++) {
          let lc = iOpts.Text[j]?.LangCode || ''
          if (lc && typeof lc === typeof 'string' && lc !== '') lc = lc.toLowerCase()

          isFound = lc === mLc
          if (isFound) {
            label = iOpts.Text[j]?.ShortLabel || ''
            descr = iOpts.Text[j]?.Descr || ''
          }
        }
      }

      // if not found then use first label and description
      if (label === '') label = iOpts.Text[0]?.ShortLabel || ''
      if (descr === '') descr = iOpts.Text[0]?.Descr || ''
    }

    pLst.push({ name: p.Name, label: (label || p.Name), descr: (descr || label || p.Name), opts: iOpts })
  }

  // sort result by name and put model name before 'any_model.'
  pLst.sort((left, right) => {
    const ln = left.name
    const rn = right.name

    if (ln === rn) return 0
    if (ln.startsWith(mnDot) && rn.startsWith(amDot)) return -1
    if (ln.startsWith(amDot) && rn.startsWith(mnDot)) return 1

    return ln > rn ? 1 : -1
  })

  return pLst
}

/*
// Service state:
{
  IsJobControl: true,
  JobUpdateDateTime: "2022-06-30 23:35:59.456",
  IsQueuePaused: false,
  ActiveTotalRes: {
    Cpu: 32
  },
  ActiveOwnRes: {
    Cpu: 8
  },
  QueueTotalRes: {
    Cpu: 128
  },
  QueueOwnRes: {
    Cpu: 64
  },
  MpiRes: {
    Cpu: 64
  },
  MpiErrorRes: {
    Cpu: 8
  },
  LocalRes: {
    Cpu: 2
  },
  LocalActiveRes {
    Cpu: 1
  },
  LocalQueueRes {
    Cpu: 8
  },
  Queue: [],
  Active: [
    {
      "SubmitStamp": "2022_07_07_15_01_04_557",
      "ModelName": "RiskPaths",
      "ModelDigest": "d90e1e9a49a06d972ecf1d50e684c62b",
      "RunStamp": "2022_07_07_15_01_04_558",
      "Dir": "",
      "Opts": {
        "EN.RunDescription": "run desription in English",
        "FR.RunDescription": "run desription in French",
        "OpenM.BaseRunDigest": "bc5ada86d3f9ec460f4e3599fdcf398b",
        "OpenM.RunName": "RiskPaths_Default_2022_07_07_14_58_29_850",
        "OpenM.SetName": "Default",
        "OpenM.SubValues": "16"
      },
      "Threads": 3,
      "Mpi": {
        "Np": 0
      },
      IsMpi: false,
      "Template": "",
      "Tables": [
        "TG03_Union_Tables"
      ],
      "RunNotes": [
        {
          "LangCode": "EN",
          "Note": "Run notes (English)"
        },
        {
          "LangCode": "FR",
          "Note": "Run notes (French)"
        }
      ],
      Res: {
        Cpu: 3
      },
      IsOverLimit: false,
      LogFileName: "RiskPaths.2022_07_07_15_01_04_558.console.log"
    }
  ],
  History: [
    {
      SubmitStamp: "2022_07_04_20_08_21_158",
      ModelName: "RiskPaths",
      ModelDigest: "d90e1e9a49a06d972ecf1d50e684c62b",
      RunStamp: "2022_07_04_20_08_21_159",
      JobStatus: "success"
    }
  ],
  ComputeState: [{
          Name: "cpc-1",
          State: "off",
          TotalRes: {
              Cpu: 2,
              Mem: 0
          },
          UsedRes: {
              Cpu: 0,
              Mem: 0
          },
          OwnRes: {
              Cpu: 0,
              Mem: 0
          },
          ErrorCount: 0,
          LastUsedTs: 1662747792365
      }
  ]
}
*/
// return empty service state
export const emptyServiceState = () => {
  return {
    IsJobControl: false,
    JobUpdateDateTime: '',
    IsQueuePaused: false,
    ActiveTotalRes: { Cpu: 0 },
    ActiveOwnRes: { Cpu: 0 },
    QueueTotalRes: { Cpu: 0 },
    QueueOwnRes: { Cpu: 0 },
    MpiRes: { Cpu: 0 },
    MpiErrorRes: { Cpu: 0 },
    LocalRes: { Cpu: 0 },
    LocalActiveRes: { Cpu: 0 },
    LocalQueueRes: { Cpu: 0 },
    Queue: [],
    Active: [],
    History: [],
    ComputeState: []
  }
}

// return true if this is service config (it can be empty)
export const isServiceState = (st) => {
  if (!st) return false
  if (!st.hasOwnProperty('IsJobControl') || !st.hasOwnProperty('JobUpdateDateTime') || !st.hasOwnProperty('IsQueuePaused') ||
      !st.hasOwnProperty('Queue') || !st.hasOwnProperty('Active') || !st.hasOwnProperty('History') || !st.hasOwnProperty('ComputeState')) {
    return false
  }
  if (!st.hasOwnProperty('ActiveTotalRes') || !st.ActiveTotalRes.hasOwnProperty('Cpu') || typeof st.ActiveTotalRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('ActiveOwnRes') || !st.ActiveOwnRes.hasOwnProperty('Cpu') || typeof st.ActiveOwnRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('QueueTotalRes') || !st.QueueTotalRes.hasOwnProperty('Cpu') || typeof st.QueueTotalRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('QueueOwnRes') || !st.QueueOwnRes.hasOwnProperty('Cpu') || typeof st.QueueOwnRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('MpiRes') || !st.MpiRes.hasOwnProperty('Cpu') || typeof st.MpiRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('MpiErrorRes') || !st.MpiErrorRes.hasOwnProperty('Cpu') || typeof st.MpiErrorRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('LocalRes') || !st.LocalRes.hasOwnProperty('Cpu') || typeof st.LocalRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('LocalActiveRes') || !st.LocalActiveRes.hasOwnProperty('Cpu') || typeof st.LocalActiveRes.Cpu !== typeof 1) return false
  if (!st.hasOwnProperty('LocalQueueRes') || !st.LocalQueueRes.hasOwnProperty('Cpu') || typeof st.LocalQueueRes.Cpu !== typeof 1) return false

  return Array.isArray(st.Queue) && Array.isArray(st.Active) && Array.isArray(st.History) && Array.isArray(st.ComputeState)
}

/* eslint-disable no-multi-spaces */
/*
// UpDownStatusLog contains download, upload or delete  status info and content of log file
type UpDownStatusLog struct {
  Status        string   // if not empty then one of: progress ready error
  Kind          string   // if not empty then one of: model, run, workset, delete, upload
  ModelDigest   string   // content of "Model Digest:"
  RunDigest     string   // content of "Run  Digest:"
  WorksetName   string   // content of "Scenario Name:"
  IsFolder      bool     // if true then download (or upload) folder exist
  Folder        string   // content of "Folder:"
  FolderModTime int64    // folder modification time in milliseconds since epoch
  IsZip         bool     // if true then download (or upload) zip exist
  ZipFileName   string   // zip file name
  ZipModTime    int64    // zip modification time in milliseconds since epoch
  ZipSize       int64    // zip file size
  LogFileName   string   // log file name
  LogModTime    int64    // log file modification time in milliseconds since epoch
  Lines         []string // file content
}
*/
// return empty UpDownStatusLog
export const emptyUpDownLog = () => {
  return {
    Status: '',       // if not empty then one of: progress, ready, error
    Kind: '',         // if not empty then one of: model, run, workset or delete
    ModelDigest: '',
    RunDigest: '',
    WorksetName: '',
    IsFolder: false,  // if true then download folder exist
    Folder: '',       // folder name with unzipped download content
    FolderModTime: 0, // folder modification time in milliseconds since epoch
    IsZip: false,     // if true then download zip exist
    ZipFileName: '',  // zip file name
    ZipModTime: 0,    // zip modification time in milliseconds since epoch
    ZipSize: 0,       // zip file size
    LogFileName: '',  // log file name
    LogModTime: 0,    // log file modification time in milliseconds since epoch
    Lines: []         // log file lines
  }
}
/* eslint-enable no-multi-spaces */

export const allModelsDownloadLog = 'all-models-download-logs'
export const allModelsUploadLog = 'all-models-upload-logs'

// return true if this is download-or-upload log status info (it can be empty or incomplete)
export const isUpDownLog = (d) => {
  if (!d) return false
  if (!d.hasOwnProperty('Status') || !d.hasOwnProperty('Kind') ||
    !d.hasOwnProperty('ModelDigest') || !d.hasOwnProperty('RunDigest') || !d.hasOwnProperty('WorksetName') ||
    !d.hasOwnProperty('IsFolder') || !d.hasOwnProperty('Folder') || !d.hasOwnProperty('FolderModTime') ||
    !d.hasOwnProperty('IsZip') || !d.hasOwnProperty('ZipFileName') || !d.hasOwnProperty('ZipModTime') || !d.hasOwnProperty('ZipSize') ||
    !d.hasOwnProperty('LogFileName') || !d.hasOwnProperty('LogModTime') || !d.hasOwnProperty('Lines')) {
    return false
  }
  return Array.isArray(d.Lines)
}

// return true if each array element isUpDownLog()
export const isUpDownLogList = (dLst) => {
  if (!dLst) return false
  if (!Array.isArray(dLst)) return false
  for (let k = 0; k < dLst.length; k++) {
    if (!isUpDownLog(dLst[k])) return false
  }
  return true
}

/* eslint-disable no-multi-spaces */
/*
// PathItem contain basic file info after tree walk: relative path, size and modification time
type PathItem struct {
  Path    string // file path in / slash form
  IsDir   bool   // if true then it is a directory
  Size    int64  // file size (may be zero for directories)
  ModTime int64  // file modification time in milliseconds since epoch
}
*/
// return empty  emptyUpDownFileItem
export const emptyUpDownFileItem = () => {
  return {
    Path: '',     // file path in / slash form
    IsDir: false, // if true then it is a directory
    Size: 0,      // file size (may be zero for directories)
    ModTime: 0    // file modification time in milliseconds since epoch
  }
}
/* eslint-enable no-multi-spaces */

// return true if this is download-or-upload file item
export const isUpDownFileItem = (fi) => {
  if (!fi) return false
  if (!fi.hasOwnProperty('Path') || typeof fi.Path !== typeof 'string' ||
    !fi.hasOwnProperty('IsDir') || typeof fi.IsDir !== typeof true ||
    !fi.hasOwnProperty('Size') || typeof fi.Size !== typeof 1 ||
    !fi.hasOwnProperty('ModTime') || typeof fi.ModTime !== typeof 1) {
    return false
  }
  return true
}

// return true if this is not empty download-or-upload file item
export const isNotEmptyUpDownFileItem = (fi) => {
  if (!isUpDownFileItem(fi)) return false
  return (fi.Path || '') !== ''
}

// return true if each array element isUpDownFileItem()
export const isUpDownFileTree = (pLst) => {
  if (!pLst) return false
  if (!Array.isArray(pLst)) return false
  for (let k = 0; k < pLst.length; k++) {
    if (!isUpDownFileItem(pLst[k])) return false
  }
  return true
}

// return empty disk space usage info
export const emptyDiskUse = () => { return {} }

// return true if this is disk space usage info
export const isDiskUseInfo = () => { return true }

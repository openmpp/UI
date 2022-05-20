// server state and configuration

// return empty service configuration
export const emptyConfig = () => {
  return {
    OmsName: '',
    RowPageMaxSize: 100,
    AllowUserHome: false,
    AllowDownload: false,
    AllowUpload: false,
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
  if (!c.hasOwnProperty('OmsName') || !c.hasOwnProperty('RowPageMaxSize') || !c.hasOwnProperty('AllowUserHome') ||
    !c.hasOwnProperty('AllowDownload') || !c.hasOwnProperty('AllowUpload') ||
    !c.hasOwnProperty('Env') || !c.hasOwnProperty('ModelCatalog') || !c.hasOwnProperty('RunCatalog')) {
    return false
  }
  if (!c.ModelCatalog.hasOwnProperty('ModelDir') || !c.ModelCatalog.hasOwnProperty('ModelLogDir') || !c.ModelCatalog.hasOwnProperty('IsLogDirEnabled')) return false
  if (!c.RunCatalog.hasOwnProperty('RunTemplates') || !c.RunCatalog.hasOwnProperty('DefaultMpiTemplate') ||
    !c.RunCatalog.hasOwnProperty('MpiTemplates') || !c.RunCatalog.hasOwnProperty('Presets')) return false

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
export const configRunOptsPresets = (c, modelName, langCode) => {
  if (!modelName || typeof modelName !== typeof 'string' || !isConfig(c)) return []

  const pLst = []
  const mnDot = modelName + '.'
  const amDot = 'any_model.'

  for (let k = 0; k < c.RunCatalog.Presets.length; k++) {
    const p = c.RunCatalog.Presets[k]

    // skip if preset does not have name or options string
    if (!p?.Name || typeof p.Name !== typeof 'string') continue
    if (!p?.Options || typeof p.Options !== typeof 'string') continue

    if (!p.Name.startsWith(mnDot) && !p.Name.startsWith(amDot)) continue // must start from model name or 'any_model.'

    // parse options json string
    let opts = {}
    try {
      opts = JSON.parse(p.Options)
    } catch {
      continue // skip incorrect options
    }
    if (!opts || !(opts instanceof Object) || Array.isArray(opts)) continue // must be an object with properties

    // find preset description in current model language or use first description or preset name
    let descr = ''
    let label

    if (Array.isArray(opts?.Text)) {
      for (let j = 0; j < opts.Text.length; j++) {
        const lc = opts.Text[j]?.LangCode || ''
        const lb = opts.Text[j]?.ShortLabel || ''
        const td = opts.Text[j]?.Descr || ''

        if (j === 0 || lc === langCode) {
          label = label || lb
          descr = td || descr
        }
        if (lc === langCode) break // current model language found
      }
    }

    pLst.push({ name: p.Name, label: (label || p.Name), descr: (descr || label || p.Name), opts: opts })
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

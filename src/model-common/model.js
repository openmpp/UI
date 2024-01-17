// db structures common functions: model and model list

import * as Dnf from './descr-note'

// return true if each list element isModel()
export const isModelList = (ml) => {
  if (!ml) return false
  if (!Array.isArray(ml)) return false
  for (const m of ml) {
    if (!isModel(m)) return false
  }
  return true
}

// return model folder by digest: find first in model list
// digest expected to be unique in models tree
export const modelDirByDigest = (dgst, ml) => {
  if (!dgst || typeof dgst !== typeof 'string') return ''
  if (!ml || !Array.isArray(ml)) return ''
  for (const m of ml) {
    if (modelDigest(m) === dgst) {
      return (!m?.Dir || m.Dir === '.' || m.Dir === '/' || m.Dir === './') ? '' : m.Dir
    }
  }
  return ''
}

// return model extra properties by digest: find first in model list
export const modelExtraByDigest = (dgst, ml) => {
  if (!dgst || typeof dgst !== typeof 'string') return {}
  if (!ml || !Array.isArray(ml)) return {}
  for (const m of ml) {
    if (modelDigest(m) === dgst) {
      if (!m.hasOwnProperty('Extra') || typeof m.Extra !== 'object' || !m.Extra) return {}
      return m.Extra
    }
  }
  return {}
}

// get link to model documentation in current language from ModelName.extra.json
export const modelDocLink = (dgst, ml, uiLang, modelLang) => {
  const me = modelExtraByDigest(dgst, ml) // content of ModelName.extra.json file

  const docLst = me?.ModelDoc
  if (!Array.isArray(docLst) || docLst.length <= 0) return ''

  let docLink = ''
  const uilc = uiLang.toLowerCase() // find link to model documentation in UI language
  const pLst = uilc.split(/[-_]/)
  const flc = (Array.isArray(pLst) && pLst.length > 0) ? pLst[0] : ''
  let fLink = ''

  for (let k = 0; k < docLst.length; k++) {
    const dlc = (docLst[k]?.LangCode || '')
    if (typeof dlc === typeof 'string') {
      if (dlc.toLowerCase() === uilc) {
        docLink = docLst[k]?.Link || ''
        break
      }
      if (fLink === '') fLink = (dlc.toLowerCase() === flc) ? (docLst[k]?.Link || '') : ''
    }
  }
  if (docLink === '' && fLink !== '') {
    docLink = fLink // match UI language by code: en-US => en
  }
  if (docLink !== '') return docLink

  const mlc = modelLang.LangCode.toLowerCase() // find link to model documentation in model language

  for (let k = 0; k < docLst.length; k++) {
    const dlc = (docLst[k]?.LangCode || '')
    if ((typeof dlc === typeof 'string') && dlc.toLowerCase() === mlc) {
      docLink = docLst[k]?.Link || ''
      break
    }
  }

  // if link to model documentation not found by language then use first link
  if (docLink === '') docLink = docLst[0]?.Link || ''

  return docLink
}

// return empty Model
export const emptyModel = () => {
  return {
    Model: {
      Name: '',
      Digest: '',
      CreateDateTime: '',
      DefaultLangCode: '',
      Version: ''
    }
  }
}

// if this is a model
const hasModelProperties = (md) => {
  if (!md) return false
  if (!md.hasOwnProperty('Model')) return false
  return md.Model.hasOwnProperty('Name') && md.Model.hasOwnProperty('Digest') &&
    md.Model.hasOwnProperty('CreateDateTime') && md.Model.hasOwnProperty('DefaultLangCode') && md.Model.hasOwnProperty('Version')
}

// if this is not empty model
export const isModel = (md) => {
  if (!hasModelProperties(md)) return false
  return (md.Model.Name || '') !== '' && (md.Model.Digest || '') !== '' && (md.Model.CreateDateTime || '') !== ''
}

// if this is an empty model: model with empty name and digest
export const isEmptyModel = (md) => {
  if (!hasModelProperties(md)) return false
  return (md.Model.Name || '') === '' || (md.Model.Digest || '') === '' || (md.Model.CreateDateTime || '') === ''
}

// digest of the model
export const modelDigest = (md) => {
  if (!md) return ''
  if (!md.hasOwnProperty('Model')) return ''
  return (md.Model.Digest || '')
}

// name of the model
export const modelName = (md) => {
  if (!md) return ''
  if (!md.hasOwnProperty('Model')) return ''
  return (md.Model.Name || '')
}

// make model title
export const modelTitle = (md) => {
  if (!isModel(md)) return ''
  const descr = Dnf.descrOfDescrNote(md)
  return md.Model.Name + ((md.Model.Version || '') ? ': ' + md.Model.Version : '') + ((descr !== '') ? ': ' + descr : '')
}

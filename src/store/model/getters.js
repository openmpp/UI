// current model and list of the models
import * as Mdf from 'src/model-common'

// return model count or zero if model list empty or invalid
export const modelListCount = (state) => {
  return Mdf.isModelList(state.modelList) ? Mdf.lengthOf(state.modelList) : 0
}

// find model by digest in model list
export const modelByDigest = (state) => (digest) => {
  if (!digest || typeof digest !== typeof 'string') return Mdf.emptyModel()
  for (const m of state.modelList) {
    if (m.Model.Digest === digest) return m
  }
  return Mdf.emptyModel()
}

// return true if run list contain the run: find by model digest and run digest
export const isExistInRunTextList = (state) => (rt) => {
  if (!rt || !rt.hasOwnProperty('ModelDigest') || !rt.hasOwnProperty('RunDigest')) return false
  if (!Mdf.isLength(state.runTextList)) return false
  return state.runTextList.findIndex((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest) >= 0
}

// find run by model digest and run digest, return empty run if not found
export const runTextByDigest = (state) => (rt) => {
  if (!rt || !rt.hasOwnProperty('ModelDigest') || !rt.hasOwnProperty('RunDigest')) return Mdf.emptyRunText()
  if (!Mdf.isLength(state.runTextList)) return Mdf.emptyRunText()
  return state.runTextList.find((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest) || Mdf.emptyRunText()
}

// return true if workset list contain the workset: find by model digest and workset name
export const isExistInWorksetTextList = (state) => (wt) => {
  if (!wt || !wt.hasOwnProperty('ModelDigest') || !wt.hasOwnProperty('Name')) return false
  if (!Mdf.isLength(state.worksetTextList)) return false
  return state.worksetTextList.findIndex((w) => wt.ModelDigest === w.ModelDigest && wt.Name === w.Name) >= 0
}

// find workset by model digest and workset name, return empty workset if not found
export const worksetTextByName = (state) => (wt) => {
  if (!wt || !wt.hasOwnProperty('ModelDigest') || !wt.hasOwnProperty('Name')) return Mdf.emptyWorksetText()
  if (!Mdf.isLength(state.worksetTextList)) return Mdf.emptyWorksetText()
  return state.worksetTextList.find((w) => wt.ModelDigest === w.ModelDigest && wt.Name === w.Name) || Mdf.emptyWorksetText()
}

// return current model language code and name, example: { LangCode: 'EN', Name: 'English' }
export const modelLanguage = (state) => {
  let code = ''
  if (!!state.wordList && state.wordList.hasOwnProperty('ModelLangCode')) {
    code = state.wordList.ModelLangCode || ''
  }
  if (!code && !!state.theModel && state.theModel.hasOwnProperty('Model') && state.theModel.Model.hasOwnProperty('DefaultLangCode')) {
    code = state.theModel.Model.DefaultLangCode || ''
  }
  return {
    LangCode: code,
    Name: Mdf.langNameByCode(state.langList, code)
  }
}

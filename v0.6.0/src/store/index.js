import Vue from 'vue'
import Vuex from 'vuex'
import * as Mdf from '@/modelCommon'

import { mutations } from './mutations'
import { DISPATCH, actions } from './actions'

Vue.use(Vuex)

// getters names
const GET = {
  CONFIG: 'config',
  UI_LANG: 'uiLang',
  WORD_LIST: 'wordList',
  MODEL_LIST: 'modelList',
  MODEL_LIST_COUNT: 'modelListCount',
  THE_MODEL: 'theModel',
  MODEL_LANG: 'modelLangCode',
  IS_EXIST_IN_RUN_TEXT_LIST: 'isExistInRunTextList',
  RUN_TEXT_BY_IDX: 'runTextByIndex',
  RUN_TEXT_BY_DIGEST: 'runTextByDigest',
  RUN_TEXT_BY_DIGEST_OR_NAME: 'runTextByDigestOrName',
  RUN_TEXT_BY_DIGEST_IF_FINAL: 'runTextByDigestIfFinal',
  RUN_TEXT_LIST: 'runTextList',
  WORKSET_TEXT_BY_IDX: 'worksetTextByIndex',
  WORKSET_TEXT_BY_NAME: 'worksetTextByName',
  IS_EXIST_IN_WORKSET_TEXT_LIST: 'isExistInWorksetTextList',
  WORKSET_TEXT_LIST: 'worksetTextList',
  THE_SELECTED: 'theSelected',
  PARAM_VIEW: 'paramView',
  PARAM_VIEW_UPDATED_COUNT: 'paramViewUpdatedCount',
  OMPP_SRV_URL: 'omppServerUrl'
}

// getters
const getters = {
  [GET.CONFIG]: state => state.config,
  [GET.UI_LANG]: state => state.uiLang,
  [GET.WORD_LIST]: state => state.wordList,
  [GET.THE_MODEL]: state => state.theModel,
  [GET.MODEL_LIST]: state => state.modelList,
  [GET.MODEL_LIST_COUNT]: state => state.modelList.length,
  [GET.RUN_TEXT_LIST]: state => state.runTextList,
  [GET.WORKSET_TEXT_LIST]: state => state.worksetTextList,
  [GET.THE_SELECTED]: state => state.theSelected,

  [GET.MODEL_LANG]: state => {
    let lang = ''
    if (!!state.wordList && state.wordList.hasOwnProperty('ModelLangCode')) {
      lang = state.wordList.ModelLangCode || ''
    }
    if (!lang && !!state.theModel && state.theModel.hasOwnProperty('Model') && state.theModel.Model.hasOwnProperty('DefaultLangCode')) {
      lang = state.theModel.Model.DefaultLangCode || ''
    }
    return lang
  },

  [GET.IS_EXIST_IN_RUN_TEXT_LIST]: state => (rt) => {
    if (!Mdf.isNotEmptyRunText(rt) || !Mdf.isLength(state.runTextList)) return false
    return state.runTextList.findIndex((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest) >= 0
  },

  [GET.RUN_TEXT_BY_IDX]: state => (idx) =>
    (Mdf.isLength(state.runTextList) && idx >= 0 && idx < state.runTextList.length) ? state.runTextList[idx] : Mdf.emptyRunText(),

  [GET.RUN_TEXT_BY_DIGEST]: state => (digest) =>
    (Mdf.isLength(state.runTextList) && (digest || '') !== '') ? (state.runTextList.find((rt) => rt.RunDigest === digest) || Mdf.emptyRunText()) : Mdf.emptyRunText(),

  [GET.RUN_TEXT_BY_DIGEST_OR_NAME]: state => (digestOrName) => {
    if (!Mdf.isLength(state.runTextList) || (digestOrName || '') === '') return Mdf.emptyRunText()
    let k = state.runTextList.findIndex((r) => r.RunDigest === digestOrName) // find by run digest
    if (k >= 0) return state.runTextList[k]
    k = state.runTextList.findIndex((r) => r.Name === digestOrName) // find by run name
    return (k >= 0) ? state.runTextList[k] : Mdf.emptyRunText()
  },

  // return run text by digest if it is completed and parameter list not empty else return empty run text
  [GET.RUN_TEXT_BY_DIGEST_IF_FINAL]: state => (digest) => {
    if (!Mdf.isLength(state.runTextList) || (digest || '') === '') return Mdf.emptyRunText()
    const k = state.runTextList.findIndex((rt) => rt.RunDigest === digest)
    return (k >= 0 && Mdf.isRunCompleted(state.runTextList[k]) && Mdf.lengthOf(state.runTextList[k].Param) > 0) ? state.runTextList[k] : Mdf.emptyRunText()
  },

  [GET.WORKSET_TEXT_BY_IDX]: state => (idx) =>
    (Mdf.isLength(state.worksetTextList) && idx >= 0 && idx < state.worksetTextList.length) ? state.worksetTextList[idx] : Mdf.emptyWorksetText(),

  [GET.WORKSET_TEXT_BY_NAME]: state => (name) =>
    (Mdf.isLength(state.worksetTextList) && (name || '') !== '') ? (state.worksetTextList.find((wt) => wt.Name === name) || Mdf.emptyWorksetText()) : Mdf.emptyWorksetText(),

  [GET.IS_EXIST_IN_WORKSET_TEXT_LIST]: state => (wt) => {
    if (!Mdf.isNotEmptyWorksetText(wt) || !Mdf.isLength(state.worksetTextList)) return false
    return state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name) >= 0
  },

  [GET.PARAM_VIEW]: (state) => (key) =>
    state.paramViews.hasOwnProperty(key) ? Mdf._cloneDeep(state.paramViews[key]) : void 0,

  // count updated parameters by model prefix, if prefix empty then count all updated parameters
  [GET.PARAM_VIEW_UPDATED_COUNT]: (state) => (prefix) => {
    let n = 0
    for (const key in state.paramViews) {
      if (!state.paramViews.hasOwnProperty(key)) continue
      if (prefix && !key.startsWith(prefix)) continue
      const pv = state.paramViews[key]
      if (pv.hasOwnProperty('edit') && pv.edit.hasOwnProperty('isUpdated') && !!pv.edit.isUpdated) n++
    }
    return n
  },

  [GET.OMPP_SRV_URL]: () => (process.env.VUE_APP_OMPP_SRV_URL || '')
}

// store state and current model
const state = {
  config: Mdf.emptyConfig(),
  uiLang: '',
  wordList: Mdf.emptyWordList(),
  modelList: [],
  theModel: Mdf.emptyModel(),
  runTextList: [],
  worksetTextList: [],
  theSelected: {
    ModelDigest: '',
    isRun: false,
    run: Mdf.emptyRunText(),
    ws: Mdf.emptyWorksetText()
  },
  paramViews: {}
}

// export store itself
const store = new Vuex.Store({
  state,
  getters,
  mutations,
  actions,
  strict: process.env.NODE_ENV !== 'production'
})

export { GET, DISPATCH }
export default store

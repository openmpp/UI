import Vue from 'vue'
import Vuex from 'vuex'
import * as Mdf from '@/modelCommon'

import { mutations } from './mutations'
import { DISPATCH, actions } from './actions'

Vue.use(Vuex)

// getters names
const GET = {
  UI_LANG: 'uiLang',
  WORD_LIST: 'wordList',
  MODEL_LIST: 'modelList',
  MODEL_LIST_COUNT: 'modelListCount',
  THE_MODEL: 'theModel',
  RUN_TEXT_BY_IDX: 'runTextByIndex',
  RUN_TEXT_BY_DIGEST: 'runTextByDigest',
  RUN_TEXT_BY_DIGEST_OR_NAME: 'runTextByDigestOrName',
  RUN_TEXT_LIST: 'runTextList',
  WORKSET_TEXT_BY_IDX: 'worksetTextByIndex',
  WORKSET_TEXT_BY_NAME: 'worksetTextByName',
  WORKSET_TEXT_LIST: 'worksetTextList',
  THE_SELECTED: 'theSelected',
  PARAM_VIEW: 'paramView',
  PARAM_VIEW_UPDATED_COUNT: 'paramViewUpdatedCount',
  OMPP_SRV_URL: 'omppServerUrl'
}

// getters
const getters = {
  [GET.UI_LANG]: state => state.uiLang,
  [GET.WORD_LIST]: state => state.wordList,
  [GET.THE_MODEL]: state => state.theModel,
  [GET.MODEL_LIST]: state => state.modelList,
  [GET.MODEL_LIST_COUNT]: state => state.modelList.length,
  [GET.RUN_TEXT_LIST]: state => state.runTextList,
  [GET.THE_SELECTED]: state => state.theSelected,

  [GET.RUN_TEXT_BY_IDX]: state =>
    (idx) => (Mdf.isLength(state.runTextList) && idx >= 0 && idx < state.runTextList.length) ? state.runTextList[idx] : Mdf.emptyRunText(),

  [GET.RUN_TEXT_BY_DIGEST]: state =>
    (digest) => (Mdf.isLength(state.runTextList) && (digest || '') !== '') ? (state.runTextList.find((rt) => rt.Digest === digest) || Mdf.emptyRunText()) : Mdf.emptyRunText(),

  [GET.RUN_TEXT_BY_DIGEST_OR_NAME]: state => (digestOrName) => {
    if (!Mdf.isLength(state.runTextList) || (digestOrName || '') === '') return Mdf.emptyRunText()
    let k = state.runTextList.findIndex((r) => r.Digest === digestOrName)
    if (k >= 0) return state.runTextList[k]
    k = state.runTextList.findIndex((r) => r.Name === digestOrName)
    return (k >= 0) ? state.runTextList[k] : Mdf.emptyRunText()
  },

  [GET.WORKSET_TEXT_LIST]: state => state.worksetTextList,

  [GET.WORKSET_TEXT_BY_IDX]: state =>
    (idx) => (Mdf.isLength(state.worksetTextList) && idx >= 0 && idx < state.worksetTextList.length) ? state.worksetTextList[idx] : Mdf.emptyWorksetText(),

  [GET.WORKSET_TEXT_BY_NAME]: state =>
    (name) => (Mdf.isLength(state.worksetTextList) && (name || '') !== '') ? (state.worksetTextList.find((wt) => wt.Name === name) || Mdf.emptyWorksetText()) : Mdf.emptyWorksetText(),

  [GET.PARAM_VIEW]: (state) =>
    (key) => state.paramViews.hasOwnProperty(key) ? Mdf._cloneDeep(state.paramViews[key]) : void 0,

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

  [GET.OMPP_SRV_URL]: () => (process.env.OMPP_SRV_URL_ENV || '')
}

// store state: model
const state = {
  uiLang: '',
  wordList: Mdf.emptyWordList(),
  modelList: [],
  theModel: Mdf.emptyModel(),
  runTextList: [],
  worksetTextList: [],
  theSelected: {
    ModelDigest: '',
    isRun: false,
    runDigestName: '',
    worksetName: ''
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

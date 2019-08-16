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
  THE_RUN_TEXT: 'theRunText',
  RUN_TEXT_LIST: 'runTextList',
  THE_WORKSET_TEXT: 'theWorksetText',
  WORKSET_TEXT_LIST: 'worksetTextList',
  PARAM_VIEW: 'paramView',
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
  [GET.THE_RUN_TEXT]: state => state.theRunText,
  [GET.WORKSET_TEXT_LIST]: state => state.worksetTextList,
  [GET.THE_WORKSET_TEXT]: state => state.theWorksetText,
  [GET.PARAM_VIEW]: (state) => (key) => { return state.paramViews.hasOwnProperty(key) ? Mdf._cloneDeep(state.paramViews[key]) : void 0 },
  [GET.OMPP_SRV_URL]: () => (process.env.OMPP_SRV_URL_ENV || '')
}

// store state: model
const state = {
  uiLang: '',
  wordList: Mdf.emptyWordList(),
  modelList: [],
  theModel: Mdf.emptyModel(),
  theRunText: Mdf.emptyRunText(),
  runTextList: [],
  theWorksetText: Mdf.emptyWorksetText(),
  worksetTextList: [],
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

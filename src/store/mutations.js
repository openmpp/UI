import * as Mdf from '@/modelCommon'

// internal mutations names
const COMMIT = {
  CONFIG: 'commitConfig',
  UI_LANG: 'commitUiLang',
  WORD_LIST: 'commitWordList',
  WORD_LIST_ON_NEW: 'commitWordListOnNew',
  MODEL_LIST: 'commitModelList',
  THE_MODEL: 'commitModel',
  RUN_TEXT: 'commitRunText',
  RUN_TEXT_DELETE: 'commitRunTextDelete',
  RUN_TEXT_LIST: 'commitRunTextList',
  RUN_TEXT_LIST_ON_NEW: 'commitRunTextListOnNew',
  WORKSET_TEXT: 'commitWorksetText',
  WORKSET_TEXT_DELETE: 'commitWorksetTextDelete',
  WORKSET_STATUS: 'commitWorksetStatus',
  WORKSET_TEXT_LIST: 'commitWorksetTextList',
  WORKSET_TEXT_LIST_ON_NEW: 'commitWorksetTextListOnNew',
  THE_SELECTED: 'commitTheSelected',
  THE_SELECTED_ON_NEW: 'commitTheSelectedOnNew',
  PARAM_VIEW: 'commitParamView',
  PARAM_VIEW_DELETE: 'commitParamViewDelete',
  PARAM_VIEW_DELETE_BY_PREFIX: 'commitParamViewDeleteByPrefix'
}

// mutations: synchronized updates
const mutations = {
  // assign new value to server config, if (cfg) is a config
  [COMMIT.CONFIG] (state, cfg) {
    if (Mdf.isConfig(cfg)) state.config = cfg
  },

  // assign new value to current UI language
  [COMMIT.UI_LANG] (state, lang) { state.uiLang = (lang || '') },

  // assign new value to model language-specific strings (model words)
  [COMMIT.WORD_LIST] (state, mw) {
    state.wordList = Mdf.emptyWordList()
    if (!mw) return
    state.wordList.ModelName = (mw.ModelName || '')
    state.wordList.ModelDigest = (mw.ModelDigest || '')
    state.wordList.LangCode = (mw.LangCode || '')
    state.wordList.ModelLangCode = (mw.ModelLangCode || '')
    if (mw.hasOwnProperty('LangWords')) {
      if (mw.LangWords && (mw.LangWords.length || 0) > 0) state.wordList.LangWords = mw.LangWords
    }
    if (mw.hasOwnProperty('ModelWords')) {
      if (mw.ModelWords && (mw.ModelWords.length || 0) > 0) state.wordList.ModelWords = mw.ModelWords
    }
  },

  // clear model words list if new model digest not same as word list model digest
  [COMMIT.WORD_LIST_ON_NEW] (state, modelDigest) {
    if ((modelDigest || '') !== state.wordList.ModelDigest) state.wordList = Mdf.emptyWordList()
  },

  // assign new value to current model, if (md) is a model
  [COMMIT.THE_MODEL] (state, md) {
    if (Mdf.isModel(md) || Mdf.isEmptyModel(md)) state.theModel = md
  },

  // assign new value to model list, if (ml) is a model list
  [COMMIT.MODEL_LIST] (state, ml) {
    if (Mdf.isModelList(ml)) state.modelList = ml
  },

  // update run text
  [COMMIT.RUN_TEXT] (state, rt) {
    if (!Mdf.isRunText(rt)) return
    if (!Mdf.isNotEmptyRunText(rt) || !Mdf.isLength(state.runTextList)) return

    let k = state.runTextList.findIndex((r) => Mdf.runTextEqual(r, rt))
    if (k >= 0) state.runTextList[k] = Mdf._cloneDeep(rt)
  },

  // delete run text
  [COMMIT.RUN_TEXT_DELETE] (state, rt) {
    if (!Mdf.isRunText(rt)) return
    if (!Mdf.isNotEmptyRunText(rt) || !Mdf.isLength(state.runTextList)) return

    let k = state.runTextList.findIndex((r) => Mdf.runTextEqual(r, rt))
    if (k >= 0) state.runTextList.splice(k, 1)
  },

  // assign new value to run text list: if (rtl) is a run text list the assign reverse it and commit to store
  [COMMIT.RUN_TEXT_LIST] (state, rtl) {
    if (!Mdf.isRunTextList(rtl)) return // reject invalid run text list

    rtl.reverse() // sort in reverse chronological order

    // if parameter text was not empty then copy it into new run text list
    for (const rt of rtl) {
      let k = state.runTextList.findIndex((r) => Mdf.runTextEqual(r, rt))
      if (k >= 0) {
        if (Mdf.lengthOf(rt.Param) <= 0 && Mdf.lengthOf(state.runTextList[k].Param) > 0) rt.Param = Mdf._cloneDeep(state.runTextList[k].Param)
      }
    }
    state.runTextList = rtl
  },

  // clear run list if model digest not same as run list model digest
  [COMMIT.RUN_TEXT_LIST_ON_NEW] (state, modelDigest) {
    let digest = ''
    if (state.runTextList.length > 0) {
      if (Mdf.isRunText(state.runTextList[0])) digest = state.runTextList[0].ModelDigest || ''
    }
    if ((modelDigest || '') !== digest) state.runTextList = []
  },

  // update workset text
  [COMMIT.WORKSET_TEXT] (state, wt) {
    if (!Mdf.isWorksetText(wt)) return
    if (!Mdf.isNotEmptyWorksetText(wt) || !Mdf.isLength(state.worksetTextList)) return

    let k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
    if (k >= 0) state.worksetTextList[k] = Mdf._cloneDeep(wt)
  },

  // delete workset text by model digest and workset name
  [COMMIT.WORKSET_TEXT_DELETE] (state, wt) {
    if (!wt.hasOwnProperty('ModelDigest') || !wt.hasOwnProperty('Name')) return

    let k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
    if (k >= 0) state.worksetTextList.splice(k, 1)
  },

  // update workset status: set readonly status and update date-time
  [COMMIT.WORKSET_STATUS] (state, ws) {
    if (!Mdf.isWorksetStatus(ws) || !Mdf.isLength(state.worksetTextList)) return

    let k = state.worksetTextList.findIndex((w) => w.ModelDigest === ws.ModelDigest && w.Name === ws.Name)
    if (k >= 0) {
      state.worksetTextList[k].IsReadonly = !!ws.IsReadonly
      state.worksetTextList[k].UpdateDateTime = (ws.UpdateDateTime || '')
    }
  },

  // assign new value to workset list, if (wtl) is a model run list
  [COMMIT.WORKSET_TEXT_LIST] (state, wtl) {
    if (!Mdf.isWorksetTextList(wtl)) return // reject invalid workset text list

    // if parameter text was not empty then copy it into new workset text list
    for (const wt of wtl) {
      let k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
      if (k >= 0) {
        if (Mdf.lengthOf(wt.Param) <= 0 && Mdf.lengthOf(state.worksetTextList[k].Param) > 0) wt.Param = Mdf._cloneDeep(state.worksetTextList[k].Param)
      }
    }
    state.worksetTextList = wtl
  },

  // clear workset list if model digest not same as workset list model digest
  [COMMIT.WORKSET_TEXT_LIST_ON_NEW] (state, modelDigest) {
    let digest = ''
    if (state.worksetTextList.length > 0) {
      if (Mdf.isWorksetText(state.worksetTextList[0])) digest = state.worksetTextList[0].ModelDigest || ''
    }
    if ((modelDigest || '') !== digest) state.worksetTextList = []
  },

  // if model digest not the same then clear current selection: clear run and workset
  [COMMIT.THE_SELECTED_ON_NEW] (state, modelDigest) {
    if ((modelDigest || '') !== state.theSelected.ModelDigest) {
      state.theSelected = emptyTheSelected()
      state.theSelected.ModelDigest = modelDigest || ''
    }
    // if workset list not empty then select first workset
    if (Mdf.isLength(state.worksetTextList)) {
      const ws0 = state.worksetTextList[0]
      if (Mdf.isNotEmptyWorksetText(ws0) && ws0.ModelDigest === modelDigest) state.theSelected.ws = Mdf._cloneDeep(ws0)
    }
    // if run list not empty and first run completed then select first run
    if (Mdf.isLength(state.runTextList)) {
      const r0 = state.runTextList[0]
      if (Mdf.isNotEmptyRunText(r0) && r0.ModelDigest === modelDigest) state.theSelected.run = Mdf._cloneDeep(r0)
      state.theSelected.isRun = state.theSelected.run.Digest !== ''
    }
  },

  // update current selection: run and workset if model digest not the same
  [COMMIT.THE_SELECTED] (state, sel) {
    if (!sel || !sel.hasOwnProperty('ModelDigest') || typeof sel.ModelDigest !== typeof 'string') return

    if ((sel.ModelDigest || '') !== state.theSelected.ModelDigest) {
      state.theSelected = emptyTheSelected()
      state.theSelected.ModelDigest = sel.ModelDigest || ''
    }
    if (state.theSelected.ModelDigest === '') return // model digest must be defined for non-empty selection

    // if isRun option explicitly specified then use it
    let isSelRun = sel.hasOwnProperty('isRun') && typeof sel.isRun === typeof true
    if (isSelRun) {
      state.theSelected.isRun = sel.isRun
    }
    // if selected select workset not empty and from the same model then use it else use empty workset
    if (sel.hasOwnProperty('ws') && Mdf.isWorksetText(sel.ws)) {
      if (Mdf.isNotEmptyWorksetText(sel.ws) && sel.ws.ModelDigest === sel.ModelDigest) {
        state.theSelected.ws = sel.ws
        // if (!isSelRun) state.theSelected.isRun = false
      } else {
        state.theSelected.ws = Mdf.emptyWorksetText()
      }
    }
    // if selected run not empty and from the same model then use it else use empty run
    if (sel.hasOwnProperty('run') && Mdf.isRunText(sel.run)) {
      if (Mdf.isNotEmptyRunText(sel.run) && sel.run.ModelDigest === sel.ModelDigest) {
        state.theSelected.run = sel.run
        // if (!isSelRun) state.theSelected.isRun = true
      } else {
        state.theSelected.run = Mdf.emptyRunText()
        sel.isRun = false
      }
    }
  },

  // insert, replace or update parameter view by route key (key must be non-empty string)
  [COMMIT.PARAM_VIEW] (state, pv) {
    if (!pv || !pv.hasOwnProperty('key')) return
    if (typeof pv.key !== typeof 'string' || pv.key === '') return

    // insert new or replace existing parameter view
    if (pv.hasOwnProperty('view')) {
      if (pv.view !== void 0 && pv.view !== null) {
        state.paramViews[pv.key] = Mdf._cloneDeep(pv.view)
      }
      return
    }
    // else: update existing parameter view
    if (!state.paramViews.hasOwnProperty(pv.key)) return // parameter view not found
    let p = state.paramViews[pv.key]
    if (!p) return // parameter view not found

    if (pv.hasOwnProperty('rows')) {
      if (typeof pv.rows === typeof []) state.paramViews[pv.key].rows = Mdf._cloneDeep(pv.rows)
    }
    if (pv.hasOwnProperty('cols')) {
      if (typeof pv.cols === typeof []) state.paramViews[pv.key].cols = Mdf._cloneDeep(pv.cols)
    }
    if (pv.hasOwnProperty('others')) {
      if (typeof pv.others === typeof []) state.paramViews[pv.key].others = Mdf._cloneDeep(pv.others)
    }
    if (pv.hasOwnProperty('isRowColControls')) {
      if (typeof pv.isRowColControls === typeof true) state.paramViews[pv.key].isRowColControls = pv.isRowColControls
    }
    if (pv.hasOwnProperty('rowColMode')) {
      if (typeof pv.rowColMode === typeof 1) state.paramViews[pv.key].rowColMode = pv.rowColMode
    }
    if (pv.hasOwnProperty('edit')) {
      if (pv.edit !== void 0 && pv.edit !== null) state.paramViews[pv.key].edit = Mdf._cloneDeep(pv.edit)
    }
  },

  // delete parameter view by route key, if exist (key must be a string)
  [COMMIT.PARAM_VIEW_DELETE] (state, key) {
    if (typeof key === typeof 'string' && state.paramViews.hasOwnProperty[key]) delete state.paramViews[key]
  },

  // delete parameter view by model prefix of route key (it must be a string), if prefix '' empty then delete all
  [COMMIT.PARAM_VIEW_DELETE_BY_PREFIX] (state, prefix) {
    if (typeof prefix !== typeof 'string') return

    for (const key in state.paramViews) {
      if (!state.paramViews.hasOwnProperty(key)) continue
      if (prefix && !key.startsWith(prefix)) continue
      delete state.paramViews[key]
    }
  }
}

// empty current selection
const emptyTheSelected = () => {
  return {
    ModelDigest: '',
    isRun: false,
    run: Mdf.emptyRunText(),
    ws: Mdf.emptyWorksetText()
  }
}

export { COMMIT, mutations }

// db structures common functions: model run and run list
import * as Hlpr from './helper'

// run count: number of run text entries in the run text list
export const runTextCount = (rtl) => {
  return isRunTextList(rtl) ? rtl.length : 0
}

// return true if each list element isRunText()
export const isRunTextList = (rtl) => {
  if (!rtl) return false
  if (!Hlpr.hasLength(rtl)) return false
  for (let k = 0; k < rtl.length; k++) {
    if (!isRunText(rtl[k])) return false
  }
  return true
}

// if this is run text
export const isRunText = (rt) => {
  if (!rt) return false
  if (!rt.hasOwnProperty('ModelName') || !rt.hasOwnProperty('ModelDigest')) return false
  if (!rt.hasOwnProperty('Name') || !rt.hasOwnProperty('RunDigest') || !rt.hasOwnProperty('ValueDigest')) return false
  if (!rt.hasOwnProperty('RunStamp') || !rt.hasOwnProperty('SubCount') || !rt.hasOwnProperty('Status')) return false
  if (!rt.hasOwnProperty('CreateDateTime') || !rt.hasOwnProperty('UpdateDateTime')) return false
  if (!Hlpr.hasLength(rt.Param) || !Hlpr.hasLength(rt.Txt)) return false
  return true
}

// if this is not empty run text: model name, model digest, run name, run digest, run stamp, status, sub-count, create date-time
export const isNotEmptyRunText = (rt) => {
  if (!isRunText(rt)) return false
  return (rt.ModelName || '') !== '' && (rt.ModelDigest || '') !== '' &&
    (rt.Name || '') !== '' && (rt.RunDigest || '') !== '' && (rt.RunStamp || '') !== '' &&
    (rt.Status || '') !== '' && (rt.SubCount || 0) !== 0 && (rt.CreateDateTime || '') !== ''
}

// return empty run text
export const emptyRunText = () => {
  return {
    ModelName: '',
    ModelDigest: '',
    Name: '',
    RunDigest: '',
    ValueDigest: '',
    RunStamp: '',
    SubCount: 0,
    Status: '',
    CreateDateTime: '',
    UpdateDateTime: '',
    Param: [],
    Txt: []
  }
}

// return true if this is not the same run text or it is updated: different run status or update time.
export const isRunTextUpdated = (rt, rtOther) => {
  if (!isNotEmptyRunText(rt) || !isNotEmptyRunText(rtOther)) return false

  return rt.ModelDigest !== rtOther.ModelDigest || rt.RunDigest !== rtOther.RunDigest ||
    rt.Status !== rtOther.Status || rt.UpdateDateTime !== rtOther.UpdateDateTime
}

/* eslint-disable no-multi-spaces */
export const RUN_SUCCESS = 's'      // run completed successfuly
export const RUN_IN_PROGRESS = 'p'  // run in progress
export const RUN_INITIAL = 'i'      // run not started yet
export const RUN_FAILED = 'e'       // run falied (comleted with error)
export const RUN_EXIT = 'x'         // run exit and not completed
/* eslint-enable no-multi-spaces */

// retrun true if run completed successfuly
export const isRunSuccess = (rt) => {
  return isRunText(rt) && rt.Status === RUN_SUCCESS
}

// retrun true if run in progress
export const isRunInProgress = (rt) => {
  return isRunText(rt) && rt.Status === RUN_IN_PROGRESS
}

// retrun true if run completed, status is one of: s=success, x=exit, e=error
export const isRunCompleted = (rt) => {
  return isRunText(rt) && (rt.Status === RUN_SUCCESS || rt.Status === RUN_EXIT || rt.Status === RUN_FAILED)
}

// return run status description by code: i=init p=progress s=success x=exit e=error(failed)
export const statusText = (rt) => {
  switch (rt.Status || '') {
    case RUN_SUCCESS: return 'success'
    case RUN_IN_PROGRESS: return 'in progress'
    case RUN_INITIAL: return 'initial'
    case RUN_FAILED: return 'failed'
    case RUN_EXIT: return 'exit (not completed)'
  }
  return 'unknown'
}

// RunState: model run state from oms run catalog
//
// if this is model run state
export const isRunState = (rst) => {
  if (!rst) return false
  return rst.hasOwnProperty('ModelName') && rst.hasOwnProperty('ModelDigest') &&
    rst.hasOwnProperty('RunStamp') && rst.hasOwnProperty('IsFinal') &&
    rst.hasOwnProperty('RunName') && rst.hasOwnProperty('UpdateDateTime') && rst.hasOwnProperty('TaskRunName') &&
    rst.hasOwnProperty('IsLog') && rst.hasOwnProperty('LogFileName')
}

// if this is not empty model run state
export const isNotEmptyRunState = (rst) => {
  if (!isRunState(rst)) return false
  return (rst.ModelDigest || '') !== '' && (rst.RunStamp || '') !== '' && (rst.UpdateDateTime || '') !== ''
}

// return model run state
export const emptyRunState = () => {
  return {
    ModelName: '',
    ModelDigest: '',
    RunStamp: '',
    IsFinal: false,
    UpdateDateTime: '',
    RunName: '',
    TaskRunName: '',
    IsLog: false,
    LogFileName: ''
  }
}

// RunStateLogPage: RunState and log file page
//
// if this is RunStateLogPage: model run state and run log page
export const isRunStateLog = (rlp) => {
  if (!rlp) return false
  if (!isRunState(rlp)) return false
  return rlp.hasOwnProperty('Offset') && rlp.hasOwnProperty('Size') &&
    rlp.hasOwnProperty('TotalSize') && Hlpr.hasLength(rlp.Lines)
}

// if this is not empty RunStateLogPage: model run state and run log page
export const isNotEmptyRunStateLog = (rlp) => {
  return isNotEmptyRunState(rlp)
}

// return empty RunStateLogPage: model run state and run log page
export const emptyRunStateLog = () => {
  return {
    ModelName: '',
    ModelDigest: '',
    RunStamp: '',
    IsFinal: false,
    UpdateDateTime: '',
    RunName: '',
    TaskRunName: '',
    IsLog: false,
    LogFileName: '',
    Offset: 0,
    Size: 0,
    TotalSize: 0,
    Lines: []
  }
}

// return RunState part of RunStateLogPage
export const toRunStateFromLog = (rlp) => {
  if (!rlp) return emptyRunState()
  if (!isRunState(rlp)) return emptyRunState()
  return {
    ModelName: rlp.ModelName,
    ModelDigest: rlp.ModelDigest,
    RunStamp: rlp.RunStamp || '',
    IsFinal: !!rlp.IsFinal,
    RunName: rlp.RunName || '',
    TaskRunName: rlp.TaskRunName || '',
    UpdateDateTime: rlp.UpdateDateTime || '',
    IsLog: !!rlp.IsLog,
    LogFileName: rlp.LogFileName || ''
  }
}

// run progerss: RunPub with run_lst row array of run_progress fro each sub-value
//
// return true if each list element isRunStatusProgress()
export const isRunStatusProgressList = (rpl) => {
  if (!rpl) return false
  if (!Hlpr.hasLength(rpl)) return false
  for (let k = 0; k < rpl.length; k++) {
    if (!isRunStatusProgress(rpl[k])) return false
  }
  return true
}

// return empty run status and progress
export const emptyRunStatusProgress = () => {
  return {
    ModelName: '',
    ModelDigest: '',
    Name: '',
    RunDigest: '',
    RunStamp: '',
    SubCount: 0,
    SubCompleted: 0,
    Status: '',
    CreateDateTime: '',
    UpdateDateTime: '',
    Progress: []
  }
}

// if this is run status and progress
export const isRunStatusProgress = (rp) => {
  if (!rp) return false
  if (!rp.hasOwnProperty('ModelName') || !rp.hasOwnProperty('ModelDigest')) return false
  if (!rp.hasOwnProperty('Name') || !rp.hasOwnProperty('RunDigest') || !rp.hasOwnProperty('RunStamp')) return false
  if (!rp.hasOwnProperty('SubCount') || !rp.hasOwnProperty('SubCompleted')) return false
  if (!rp.hasOwnProperty('Status') || !rp.hasOwnProperty('CreateDateTime') || !rp.hasOwnProperty('UpdateDateTime')) return false
  if (!Hlpr.hasLength(rp.Progress)) return false
  return true
}

// if this is not empty run progress: model name, model digest, run name, run stamp, sub-count, status, create date-time
export const isNotEmptyRunStatusProgress = (rp) => {
  if (!isRunStatusProgress(rp)) return false
  return (rp.ModelName || '') !== '' && (rp.ModelDigest || '') !== '' &&
    (rp.Name || '') !== '' && (rp.RunDigest || '') !== '' && (rp.RunStamp || '') !== '' &&
    (rp.SubCount || 0) !== 0 && (rp.Status || '') !== '' && (rp.CreateDateTime || '') !== ''
}

// return empty run progress item
export const emptyRunProgress = () => {
  return {
    SubId: 0,
    Status: '',
    CreateDateTime: '',
    UpdateDateTime: '',
    Count: 0,
    Value: 0
  }
}

// if this is run progress item
export const isRunProgress = (rpi) => {
  if (!rpi) return false
  if (!rpi.hasOwnProperty('SubId') || !rpi.hasOwnProperty('Status')) return false
  if (!rpi.hasOwnProperty('CreateDateTime') || !rpi.hasOwnProperty('UpdateDateTime')) return false
  if (!rpi.hasOwnProperty('Count') || !rpi.hasOwnProperty('Value')) return false
  return true
}

// if this is not empty run progress item: status, create date-time, update date-time
export const isNotEmptyRunProgress = (rpi) => {
  if (!isRunProgress(rpi)) return false
  return (rpi.Status || '') !== '' && (rpi.CreateDateTime || '') !== '' && (rpi.UpdateDateTime || '') !== ''
}

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
  if (!rt.hasOwnProperty('Name') || !rt.hasOwnProperty('Digest') || !rt.hasOwnProperty('RunStamp')) return false
  if (!rt.hasOwnProperty('SubCount') || !rt.hasOwnProperty('Status') || !rt.hasOwnProperty('CreateDateTime')) return false
  if (!Hlpr.hasLength(rt.Param) || !Hlpr.hasLength(rt.Txt)) return false
  return true
}

// if this is not empty run text: model name, model digest, run name, run stamp, status, sub-count, create date-time
export const isNotEmptyRunText = (rt) => {
  if (!isRunText(rt)) return false
  return (rt.ModelName || '') !== '' && (rt.ModelDigest || '') !== '' &&
    (rt.Name || '') !== '' && (rt.RunStamp || '') !== '' && (rt.Status || '') !== '' && (rt.SubCount || 0) !== 0 && (rt.CreateDateTime || '') !== ''
}

// return empty run text
export const emptyRunText = () => {
  return {
    ModelName: '',
    ModelDigest: '',
    Name: '',
    Digest: '',
    RunStamp: '',
    SubCount: 0,
    Status: '',
    CreateDateTime: '',
    Param: [],
    Txt: []
  }
}

// run text equality comparator:
// return true if both run texts has same non-empty digest or if digest is empty then same name and other attributes
export const runTextEqual = (rt, rtOther) => {
  if (!isRunText(rt) || !isRunText(rtOther)) return false
  if (!isNotEmptyRunText(rt) && !isNotEmptyRunText(rtOther)) return true

  return rt.ModelDigest === rtOther.ModelDigest &&
    ((rt.Digest !== '' && rt.Digest === rtOther.Digest) ||
    (rt.Digest === '' && rt.Digest === rtOther.Digest &&
    rt.Name === rtOther.Name &&
    rt.RunStamp === rtOther.RunStamp &&
    rt.SubCount === rtOther.SubCount &&
    rt.CreateDateTime === rtOther.CreateDateTime))
}

// retrun true if run completed successfuly
export const isRunSuccess = (rt) => {
  return isRunText(rt) && rt.Status === RUN_SUCCESS
}

/* eslint-disable no-multi-spaces */
export const RUN_SUCCESS = 's'      // run completed successfuly
export const RUN_IN_PROGRESS = 'p'  // run in progress
export const RUN_INITIAL = 'i'      // run not started yet
export const RUN_FAILED = 'e'       // run falied (comleted with error)
export const RUN_EXIT = 'x'         // run exit and not completed
/* eslint-enable no-multi-spaces */

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

// if this is model run state
export const isRunState = (rst) => {
  if (!rst) return false
  return rst.hasOwnProperty('ModelName') && rst.hasOwnProperty('ModelDigest') &&
    rst.hasOwnProperty('RunStamp') && rst.hasOwnProperty('IsFinal') &&
    rst.hasOwnProperty('RunName') && rst.hasOwnProperty('UpdateDateTime') &&
    rst.hasOwnProperty('IsLog') && rst.hasOwnProperty('LogFileName')
}

// if this is not empty model run state
export const isNotEmptyRunState = (rst) => {
  if (!isRunState(rst)) return false
  return (rst.ModelDigest || '') !== '' && (rst.RunStamp || '') !== '' && (rst.RunName || '') !== '' && (rst.UpdateDateTime || '') !== ''
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

// if this is RunStateLog: model run state and run log page
export const isRunStateLog = (rlp) => {
  if (!rlp) return false
  if (!isRunState(rlp)) return false
  return rlp.hasOwnProperty('Offset') && rlp.hasOwnProperty('Size') &&
    rlp.hasOwnProperty('TotalSize') && Hlpr.hasLength(rlp.Lines)
}

// if this is not empty RunStateLog: model run state and run log page
export const isNotEmptyRunStateLog = (rlp) => {
  return isRunStateLog(rlp)
}

// return empty RunStateLog: model run state and run log page
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

// return RunState part of RunStateLog
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
    Digest: '',
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
  if (!rp.hasOwnProperty('Name') || !rp.hasOwnProperty('Digest') || !rp.hasOwnProperty('RunStamp')) return false
  if (!rp.hasOwnProperty('SubCount') || !rp.hasOwnProperty('SubCompleted')) return false
  if (!rp.hasOwnProperty('Status') || !rp.hasOwnProperty('CreateDateTime') || !rp.hasOwnProperty('UpdateDateTime')) return false
  if (!Hlpr.hasLength(rp.Progress)) return false
  return true
}

// if this is not empty run progress: model name, model digest, run name, run stamp, sub-count, status, create date-time
export const isNotEmptyRunStatusProgress = (rp) => {
  if (!isRunStatusProgress(rp)) return false
  return (rp.ModelName || '') !== '' && (rp.ModelDigest || '') !== '' &&
    (rp.Name || '') !== '' && (rp.RunStamp || '') !== '' && (rp.SubCount || 0) !== 0 && (rp.Status || '') !== '' && (rp.CreateDateTime || '') !== ''
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

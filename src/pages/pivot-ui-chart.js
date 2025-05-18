// pivot chart UI helper functions

import * as Pcvt from 'components/pivot-cvt'

// default chart options
export const defaultChartOpts = (chartLocales, noDataTxt) => { return colBarChartOpts(chartLocales, noDataTxt) }

const defaultFormatter = (val) => { return (val === null || isNaN(val)) ? '???' : val }

// columns chart options
export const colBarChartOpts = (chartLocales, noDataTxt) => {
  const cOpts = {
    chart: {
      id: 'om-table-col-chart',
      type: 'bar',
      defaultLocale: 'en',
      fontFamily: 'Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    plotOptions: {
      bar: {
        dataLabels: {
          position: 'top'
        }

      }
    },
    dataLabels: {
      enabled: false,
      style: { colors: ['black'] },
      offsetY: -16,
      formatter: defaultFormatter
    },
    noData: { text: noDataTxt || 'No chart data' },

    xaxis: {
      type: 'category',
      // tickPlacement: 'on', // apexCharts bug: incorrect and missing columns
      labels: { show: true },
      categories: []
    },

    yaxis: { labels: { formatter: defaultFormatter } }
  }
  if (chartLocales) cOpts.chart.locales = chartLocales

  return cOpts
}

// rows chart options
export const rowBarChartOpts = (chartLocales, noDataTxt) => {
  const cOpts = {
    chart: {
      id: 'om-table-row-chart',
      type: 'bar',
      defaultLocale: 'en',
      fontFamily: 'Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: false,
      style: { colors: ['black'] },
      offsetX: 16,
      formatter: defaultFormatter
    },
    yaxis: {
      labels: { show: true }
    },
    xaxis: {
      type: 'category',
      categories: [],
      labels: { formatter: defaultFormatter }
    }
  }

  if (chartLocales) cOpts.chart.locales = chartLocales

  return cOpts
}

// line chart options
export const lineChartOpts = (chartLocales, noDataTxt) => {
  const cOpts = {
    chart: {
      id: 'om-table-line-chart',
      type: 'line',
      defaultLocale: 'en',
      fontFamily: 'Roboto, -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif'
    },
    dataLabels: {
      enabled: false,
      formatter: defaultFormatter
    },
    noData: { text: noDataTxt || 'No chart data' },

    xaxis: {
      type: 'category',
      // tickPlacement: 'on',
      categories: []
    },

    yaxis: { labels: { formatter: defaultFormatter } }
  }

  if (chartLocales) cOpts.chart.locales = chartLocales

  return cOpts
}

// make categories or series data points labels and item keys index:
// labels: an array of all combinations of selected enums (labels or codes)
// keys: map of row or column key (join of item id's) to row or column index (index of category or series)
export const makePoints = (fldArr, isNames) => {
  const pLbl = []
  const pKeyIdx = {} // map point key to point index, e.g. row key to row index (in selection)

  const nLen = fldArr.length
  if (nLen <= 0) {
    return [pLbl, pKeyIdx] // no data
  }
  const sLen = Array(nLen)
  const sIdx = Array(nLen).fill(0)

  for (let j = 0; j < nLen; j++) {
    const f = fldArr[j]
    if (!Array.isArray(f.enums) || f.enums.length <= 0 || !Array.isArray(f.selection) || f.selection.length <= 0
    ) {
      return [pLbl, pKeyIdx] // no data or empty selection
    }
    sLen[j] = f.selection.length
  }

  // labels: an array of all combinations of selected enums (labels or codes)
  // keys: map of row or column key (join of item id's) to row or column index (index of category or series)
  let pIdx = 0

  let isDone = false
  do {
    // category item is array of selected item names or lables
    const c = Array(nLen).fill('')
    const pKey = Array(nLen).fill('')

    for (let j = 0; j < nLen; j++) {
      c[j] = (isNames ? fldArr[j].selection[sIdx[j]].name : fldArr[j].selection[sIdx[j]].label)
      const eId = fldArr[j].selection[sIdx[j]].value || 0
      pKey[j] = eId
    }

    pLbl.push(c)
    pKeyIdx[Pcvt.itemsToKey(pKey)] = pIdx++

    // move to the next selection for all columns
    isDone = true

    for (let j = nLen - 1; isDone && j >= 0; j--) {
      sIdx[j]++
      isDone = sIdx[j] >= sLen[j]

      if (isDone) sIdx[j] = 0 // restart this column selection
    }
  } while (!isDone)

  return [pLbl, pKeyIdx]
}

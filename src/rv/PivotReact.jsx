import React from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import createPlotlyComponent from 'react-plotly.js/factory';
import {sortAs, numberFormat, aggregatorTemplates} from 'react-pivottable/Utilities';
// import 'react-pivottable/pivottable.css';
import './om-pivottable.css';

// create Plotly React component via dependency injection
const Plot = createPlotlyComponent(Plotly);
const PlotlyRenderers = createPlotlyRenderers(Plot);

export default class PivotReact extends React.Component {
  constructor(props) {
    super(props);
    this.state = {pivotState: Object.assign(
      {...props.pvtState}, 
      {showUI: true, nDecimals: (!isNaN(props.pvtState.nDecimals) ? props.pvtState.nDecimals : 2), isAllDecimals: !!props.pvtState.isAllDecimals}
    )};
  }

  componentWillReceiveProps(nextProps) {
    let isToggleUI = !!nextProps.pvtState.isToggleUI;
    let isDecsUpdate = !!nextProps.pvtState.isDecimalsUpdate;
    let nDecs = !isNaN(nextProps.pvtState.nDecimals) ? nextProps.pvtState.nDecimals : 2;
    let isAllDecs = !!nextProps.pvtState.isAllDecimals;

    let pvs = {};
    if (!isToggleUI && !isDecsUpdate) {
      pvs = Object.assign(
        {...nextProps.pvtState}, 
        {showUI: this.state.pivotState.showUI}
      );
    } else {
      pvs = Object.assign(
        {...this.state.pivotState}, 
        (isToggleUI ? {showUI: !!nextProps.pvtState.isShowUI} : {}),
        (isDecsUpdate ? {nDecimals: nDecs, isAllDecimals: isAllDecs} : {})
      );
    }

    this.setState({pivotState: pvs});
  }

  render() {
    // set chart options and fix react pivottable: 
    //  height = window.innerHeight / 1.4 - 50
    //  width = window.innerWidth / 1.5
    let isUI = !!this.state.pivotState.showUI
    let ph = isUI ? (window.innerHeight - 360) : (window.innerHeight - 240)
    let pw = isUI ? (window.innerWidth - 320) : (window.innerWidth - 60)
    let pvs = Object.assign(
      {...this.state.pivotState},
        {plotlyOptions: 
          {height: (ph >= 480 ? ph : 480), 
            width: (pw >= 640 ? pw : 640),
            font: {family: 'Roboto, "Open Sans", verdana, arial, sans-serif'}}
      });

    // show / hide attributes dropdown controls: rows, columns, others, values
    if (isUI) {
      Array.from(document.getElementsByClassName('pvtAxisContainer')).forEach(pvt => { pvt.classList.remove('pvtHiddenUI'); });
      Array.from(document.getElementsByClassName('pvtVals')).forEach(pvt => { pvt.classList.remove('pvtHiddenUI'); });
    } else {
      Array.from(document.getElementsByClassName('pvtAxisContainer')).forEach(pvt => { pvt.classList.add('pvtHiddenUI'); });
      Array.from(document.getElementsByClassName('pvtVals')).forEach(pvt => { pvt.classList.add('pvtHiddenUI'); });
    }

    // sort order: do "sort as" enum order
    let srt = {};
    if (this.state.pivotState.sortDefs) {
      for (let sd of this.state.pivotState.sortDefs) {
        srt[sd.name] = sortAs(sd.vals)
      }
    }

    // modified version of addSeparators() from react-pivottable
    const addSeps = (val, thousandsSep, decimalSep) => {
      const src = String(val);
      const ns = src.search(/(\.|e)/i);
      let left = ns > 0 ? src.substr(0, ns) : src;
      const rest = ns >= 0 ? src.slice(ns).replace('.', decimalSep) : '';

      const rgx = /(\d+)(\d{3})/;
      while (rgx.test(left)) {
        left = left.replace(rgx, `$1${thousandsSep}$2`);
      }
      return left + rest;
    };

    // modified version of numberFormat() from react-pivottable
    const fixedFmt = function(opts_in) {
      const defaults = {
        digitsAfterDecimal: 2,
        scaler: 1,
        thousandsSep: ',',
        decimalSep: '.',
        prefix: '',
        suffix: ''
      };

      const opts = Object.assign({}, defaults, opts_in);

      return function(x) {
        if (isNaN(x) || !isFinite(x)) {
          return '';
        }
        const result = addSeps(
          (opts.scaler * x).toFixed(opts.digitsAfterDecimal),
          opts.thousandsSep,
          opts.decimalSep
        );
        return `${opts.prefix}${result}${opts.suffix}`;
      };
    };

    // transparent formatter: return source numeric values as is and empty '' string if NaN or infinity
    const sourceFmt = function() {
      return function(val) {
        return (val !== void 0 && val !== null && !isNaN(val) && isFinite(val)) ? val : '';
      }
    };
  
    // value formatter: fixed decimals or transparent formatter
    const valFmt = this.state.pivotState.isAllDecimals ?
      sourceFmt() :
      fixedFmt({digitsAfterDecimal: this.state.pivotState.nDecimals, thousandsSep: ','});

    const fmtInt = fixedFmt({digitsAfterDecimal: 0});
    const fmtPct = fixedFmt({
      digitsAfterDecimal: 1,
      scaler: 100,
      suffix: '%',
    });

    // copy of aggregators from react-pivottable using modified value formatters
    const aggrs = (tpl => ({
      'Count': tpl.count(fmtInt),
      'Count Unique Values': tpl.countUnique(fmtInt),
      'List Unique Values': tpl.listUnique(', '),
      'Sum': tpl.sum(valFmt),
      'Integer Sum': tpl.sum(fmtInt),
      'Average': tpl.average(valFmt),
      'Median': tpl.median(valFmt),
      'Sample Variance': tpl.var(1, valFmt),
      'Sample Standard Deviation': tpl.stdev(1, valFmt),
      'Minimum': tpl.min(valFmt),
      'Maximum': tpl.max(valFmt),
      'First': tpl.first(valFmt),
      'Last': tpl.last(valFmt),
      'Sum over Sum': tpl.sumOverSum(valFmt),
      'Sum as Fraction of Total': tpl.fractionOf(tpl.sum(), 'total', fmtPct),
      'Sum as Fraction of Rows': tpl.fractionOf(tpl.sum(), 'row', fmtPct),
      'Sum as Fraction of Columns': tpl.fractionOf(tpl.sum(), 'col', fmtPct),
      'Count as Fraction of Total': tpl.fractionOf(tpl.count(), 'total', fmtPct),
      'Count as Fraction of Rows': tpl.fractionOf(tpl.count(), 'row', fmtPct),
      'Count as Fraction of Columns': tpl.fractionOf(tpl.count(), 'col', fmtPct),
    }))(aggregatorTemplates);

    // final output
    return (
      <PivotTableUI
        renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
        {...pvs}
        aggregators={aggrs}
        sorters={srt}
        onChange={s => this.setState({pivotState: s})}
        unusedOrientationCutoff={Infinity}
      />
    );
  }
}

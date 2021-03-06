const __ = require('locale/client/bill.lang.json');
const COLOR_LIST = require('./color_list');
let basePieOption = function(style) {
  let itemStyle = style || {
    emphasis: {
      shadowColor: '#626f7e',
      shadowBlur: 8
    }
  };
  let option = {
    color: COLOR_LIST,
    tooltip: {
      trigger: 'item',
      formatter: params => {
        return `${__[params.name]}占比${params.percent}%`;
      },
      borderColor: '#00afc8',
      borderWidth: 1,
      textStyle: {
        color: '#252f3d'
      },
      backgroundColor: '#f5fdfe',
      confine: true
    },
    legend: {
      show: false
    },
    series: [
      {
        name:'none',
        type:'pie',
        radius: ['80%', '90%'],
        avoidLabelOverlap: false,
        hoverAnimation: true,
        label: {
          normal: {
            show: false
          },
          emphasis: {
            show: false
          }
        },
        labelLine: {
          normal: {
            show: false
          }
        },
        itemStyle: itemStyle,
        data:[]
      }
    ]
  };
  return option;
};

let pieNormalOption = basePieOption();

let chartOptions = {
  pieNormalOption: pieNormalOption,
  lineChartOption: {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: `{b}<br>${__.sum}: ¥{c}`,
      borderColor: '#00afc8',
      borderWidth: 1,
      textStyle: {
        color: '#252f3d'
      },
      backgroundColor: '#f5fdfe'
    },
    legend: {
      show: false
    },
    grid: {
      left: '80px',
      right: '36px'
    },
    toolbox: {
      show: false
    },
    itemStyle: {
      normal: {
        color: '#19B7CD'
      }
    },
    lineStyle: {
      normal: {
        color: '#19B7CD'
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: []
    },
    yAxis: {
      type: 'value'
    },
    series: []
  }
};

module.exports = chartOptions;

/**
 * @file 柱状图
 * @author chenxuan03@meituan.com
 */
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建bar构造函数
    function bar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'bar');
    }

    // 在xCharts中注册bar构造函数
    xCharts.charts.extend({ bar: bar });
    // 从父类Chart里继承一系列的方法
    utils.inherits(bar, Chart);

    bar.prototype.extend = xCharts.extend;
    bar.prototype.extend({
        init: function(messageCenter, config, type, series) {
            // 提出type为radar的series的子元素对象
            this.barSeries = new Array();
            for(var i=0;i<series.length;i++) {
                if(series[i].type == 'radar') {
                    this.barSeries.push(series[i]);
                }
            }
            // 用变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;
            console.log(this.xAxisScale, this.yAxisScale);
            console.log(messageCenter);

        },
        render: function(ease, durationTime) {

        },
        ready: function() {
            /*this.__legendReady();
            this.__tooltipReady();*/
        }
    });
}(window))
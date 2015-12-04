/**
 * @file 饼图
 * @author chenxuan03@meituan.com
 */
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建pie构造函数
    function pie(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'pie');
    }

    // 在xCharts中注册pie构造函数
    xCharts.charts.extend({ pie: pie });
    // 从父类Chart里继承一系列的方法
    utils.inherits(pie, Chart);

    pie.prototype.extend = xCharts.extend;
    pie.prototype.extend({
        init: function(messageCenter, config, type, series) {
            // 提出type为pie的series的子元素对象
            this.pieConfig = {};
            for(var i=0;i<series.length;i++) {
                if(series[i].type == 'pie') {
                    this.pieConfig = series[i];
                    break;
                }
            }
            // 用变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            console.log(this.pieConfig, messageCenter);

        },
        render: function(ease, durationTime) {

        },
        ready: function() {

        }
    });
}(window))
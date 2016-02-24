/**
 * Created by liuyang on 15/10/27.
 * chars的基类
 */
(function(window){

    /**
     * @var series
     * @extends xCharts
     * @type Array
     * @example 包含图表数据
     */

    var xCharts=window.xCharts;
    var utils=xCharts.utils;
    var Component=xCharts.components.Component;
    function Chart(messageCenter,config,type){
        this.width = messageCenter.width;
        this.height = messageCenter.height;
        this.id = messageCenter.id;
        this.getColor = messageCenter.getColor;
        Component.call(this,messageCenter,config,type);
    }

    Chart.prototype={
        constructor:Chart
    }

    xCharts.charts.extend({Chart:Chart});
    utils.inherits(Chart,Component);
}(window))
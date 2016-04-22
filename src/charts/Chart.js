/**
 * Created by liuyang on 15/10/27.
 * chars的基类
 */
(function(xCharts,d3){

    /**
     * @var series
     * @extends xCharts
     * @type Array
     * @description 包含图表数据
     */

    var utils=xCharts.utils;
    var Component=xCharts.components.Component;
    function Chart(messageCenter,config,type){
        this.width = messageCenter.width;
        this.height = messageCenter.height;
        this.id = messageCenter.id;
        this.getColor = messageCenter.getColor;
        Component.call(this,messageCenter,config,type);
    }

    utils.inherits(Chart,Component);

    Chart.prototype.extend = xCharts.extend;//添加extends函数

    Chart.prototype.extend({
        refresh: function (animationEase, animationTime) {

            //当容器改变时，刷新当前图表
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth;
            this.width = this.messageCenter.width;
            this.height = this.messageCenter.height;
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
        }
    })

    xCharts.charts.extend({Chart:Chart});

}(xCharts,d3));
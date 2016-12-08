/**
 * @file 柱状图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function(xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var bar = charts.bar;

    bar.prototype.extend({
        mobileReady: function() {
            if(this.config.legend && this.config.legend.show) {
                __legendMobileReady.apply(this);
            }
            if(this.config.tooltip && this.config.tooltip.show) {
                __tooltipMobileReady.apply(this);
            }
        }
    });
    function __legendMobileReady() {
        __legendTouch.apply(this);
    }
    function __legendTouch() {
        var _this = this;
        this.on('legendClick.bar', function(nameList) {
            _this._reRenderBars(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        if(this.config.tooltip.trigger == 'axis') {
            this._tooltipSectionChange();
        } else {
            //TODO 待添加trigger为 'item'时的tooltip事件
        }
    }
}(xCharts, d3));
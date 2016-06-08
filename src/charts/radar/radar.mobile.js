/**
 * @file 雷达图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var radar = charts.radar;

    radar.prototype.extend({
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
        this.on('legendClick.radar', function(nameList) {
            _this._reRenderAreas(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        __tooltipTouch.apply(this);
    }
    function __tooltipTouch() {
        var _this = this;
        this.coverPolygonList.on('touchstart.radar', function () {
            var index = d3.select(this).datum().index;
            _this.areaList.selectAll('.xc-radar-area-point').style('stroke-width', 3);
            _this._showTooltip(index, this);
        });
    }
}(xCharts, d3));

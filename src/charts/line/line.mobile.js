/**
 * Author liuyang46@meituan.com
 * Date 16/5/26
 * Describe 折线图,移动端适配
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var line = charts.line;

    line.prototype.extend({
        mobileReady: function () {
            this.circle.on('touchstart', line.tooltipTriggerItem(this));
        }
    });
}(xCharts, d3));
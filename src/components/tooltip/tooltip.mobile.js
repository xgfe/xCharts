/**
 * Author liuyang46@meituan.com
 * Date 16/5/24
 * Describe tooltip移动端适配
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var tooltip = components.tooltip;

    tooltip.prototype.extend({
        mobileReady: function () {
            this.div.on('touchmove.tooltip', tooltip.tooltipMousemove(this));
            this.div.on('touchstart.tooltip', tooltip.tooltipMousemove(this));

        }
    });
}(xCharts, d3));
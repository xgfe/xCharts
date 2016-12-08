/**
 * Author liuyang46@meituan.com
 * Date 16/5/27
 * Describe 辅助线,移动端
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var guides = components.guides;

    guides.prototype.extend({
        mobileReady: function () {
            var moveEvent = guides.assitLineTrigger(this);
            this.div.on('touchmove.scatter',moveEvent);
            this.div.on('touchstart.scatter',moveEvent);
        }
    });
}(xCharts, d3));

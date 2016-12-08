/**
 * Author liuyang46@meituan.com
 * Date 16/5/24
 * Describe legend移动端适配
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var legend = components.legend;

    legend.prototype.extend({
        mobileReady: function (nameList, opacity) {
            this.itemList.on('click.legend', legend.legendMouseClick(this, nameList, opacity));
        }
    });
}(xCharts, d3));
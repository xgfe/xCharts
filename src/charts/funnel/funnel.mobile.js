/**
 * Author liuyang46@meituan.com
 * Date 16/5/27
 * Describe 漏斗图,移动端适配
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var funnel = charts.funnel;

    funnel.prototype.extend({
       mobileReady:function(){
           this.funnelSection.on('touchstart.funnel',funnel.funnelSectionTrigger(this));
       }
    });
}(xCharts, d3));
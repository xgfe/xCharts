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
        mobileReady: function () {
            this.funnelSection.on('touchstart.funnel', funnelSectionTrigger(this));
        }
    });

    var defaultFormatter = funnel.defaultFormatter;

    function funnelSectionTrigger(ctx) {
        var tooltip = ctx.messageCenter.components['tooltip'];
        var tooltipFormatter = tooltip.tooltipConfig.formatter;

        return function (data) {
            ctx.funnelSection.attr('opacity', 1);
            d3.select(this).attr('opacity', data._serie.itemStyle.opacity);
            tooltip.showTooltip();

            // 设置HTML
            var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;

            var title = "<p>" + data._serie.name + "</p>";
            tooltip.setTooltipHtml(title + formatter(data.name, data.value, (data.percentage * 100).toFixed(1)));

            // 获取坐标
            var position = d3.mouse(ctx.svg.node());
            tooltip.setPosition(position);
            

        }
    }
}(xCharts, d3));
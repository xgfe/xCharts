/**
 * @file 饼图(移动端)
 * @date 2016-05-30
 * @author chenxuan.cx@gmail.com
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var charts = xCharts.charts;
    var pie = charts.pie;

    pie.prototype.extend({
        mobileRender: function (animationEase, animationTime) {
            if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                this.textList = this.__renderMobileText(animationEase, animationTime);
            }
        },
        mobileReady: function() {
            if(this.config.legend && this.config.legend.show) {
                __legendMobileReady.apply(this);
            }
            if(this.config.tooltip && this.config.tooltip.show) {
                __tooltipMobileReady.apply(this);
            }
        },
        __renderMobileText: function(animationEase, animationTime) {
            var _this = this;
            var texts = this.pieWrapper
                .selectAll('.xc-pie-m-texts')
                .data([1]);
            texts = texts.enter()
                .append('g')
                .classed('xc-pie-m-texts', true)
                .merge(texts);
            var textList = texts.selectAll('.xc-pie-m-text')
                .data(this.pieData);
            textList = textList.enter()
                .append('text')
                .classed('xc-pie-m-text', true)
                .attr('dy', '.35em')
                .attr('fill', function (d) {
                    return '#fff';
                })
                .text(function (d) {
                    return _this.pieConfig.labels.mobileFormatter(d.data.name);
                })
                .merge(textList);
            textList.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attr('transform', function(d) {
                    // 找出外弧形的中心点
                    var pos = _this.arcFunc.centroid(d);
                    // 适当改变文字标签的x坐标
                    // pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                    return 'translate(' + pos + ')';
                })
                .style('display', function(d) {
                    return d.data.isShow ? null : 'none';
                })
                .style('text-anchor', function(d) {
                    return 'middle';
                });
        }
    });

    function __legendMobileReady() {
        __legendTouch.apply(this);
    }
    function __legendTouch() {
        var _this = this;
        this.on('legendClick.pie', function(nameList) {
            _this._reRenderArcs(nameList);
            _this.messageCenter.components.tooltip.hiddenTooltip();
        });
    }
    function __tooltipMobileReady() {
        __tooltipTouch.apply(this);
    }
    function __tooltipTouch() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('touchstart.pie', function () {
            var bindData = d3.select(this).datum();
            var bigD = _this.bigArcFunc(bindData);
            if(bigD === d3.select(this).attr('d')) {

                // 此时弧形处于放大的状态,应该被恢复正常状态并隐藏tooltip
                d3.select(this).attr('d', function(d) {
                    return _this.arcFunc(d);
                });
                tooltip.hiddenTooltip();
            } else {

                // 此时弧形处于正常状态,应该被放大并且显示tooltip
                _this.arcList.attr('d', function (d) {
                    return _this.arcFunc(d);
                });
                d3.select(this).attr('d', function(d) {
                    return _this.bigArcFunc(d);
                });

                var position = d3.mouse(_this.svg.node());
                position = [
                    position[0] + 10,
                    position[1] + 10
                ];
                var tooltipFormatter = tooltip.tooltipConfig.formatter;
                var pieFormatter = _this.pieConfig.formatter;
                var formatter = pieFormatter || tooltipFormatter || _this._defaultTooltipFormatter;
                tooltip.setTooltipHtml(formatter(bindData.data.name, bindData.data.value));
                tooltip.showTooltip();
                tooltip.setPosition(position);
            }
        });
    }
}(xCharts, d3));

/**
 * Created by chenxuan03 on 15/9/28.
 */
(function(window) {

    if (typeof window.define === 'function' && window.define.amd) {
        window.define('pie', ['xCharts'], function (xCharts) {
            xCharts.prototype.pie = pie;
        });
    } else {
        if (!window.xCharts) {
            window.xCharts.prototype.pie = pie;
        }
    }

    function pie(series, config) {
        console.log(this);

        // 如果是饼图，则series是一个长度为1的数组，因为一个完整的饼代表series里一个元素对象；
        // 如果是折线图，则series可能长度大于1，因为折线图里面是一根线代表series里的一个元素对象。
        var width = this.width - this.margin.right - this.margin.left,
            height = this.height - this.margin.top - this.margin.bottom,
            classPrex = this.classPrex,
            getColor = this.getColor,
            tooltip = this.group.tips.tooltip,
            tooltipText = this.group.tips.tooltipText,
            context = this;

        //处理innerRadius和outerRadius
        var outerRadius = series[0].outerRadius,
            innerRadius = series[0].innerRadius;
        if(!innerRadius) {
            innerRadius = 0;
        } else if(typeof innerRadius == 'string'){
            innerRadius = innerRadius.substring(0, innerRadius.length - 1);
            innerRadius = parseFloat(innerRadius) * 0.01 * width;
        }
        if(typeof outerRadius == 'string') {
            // 考虑半径为百分比的情况
            outerRadius = outerRadius.substring(0, outerRadius.length - 1);
            outerRadius = parseFloat(outerRadius) * 0.01 * width;
        }
        // 计算饼图的圆心位置
        var center = series[0].center;
        var offsetX = center[0].substring(0, center[0].length - 1),
            offsetY = center[1].substring(0, center[1].length - 1);
        offsetX = parseFloat(offsetX) * 0.01 * width;
        offsetY = parseFloat(offsetY) * 0.01 * height;
        // 给每块弧形都加上不对外暴露的属性id、oldValue、visible
        series[0].data.forEach(function(d, i) {
            d.oldValue = d.value;
            d.id = i;
            d.visible = true;
        });
        // 计算用于画图的数据
        var pie = d3.layout.pie()
            .sort(null)
            //.padAngle(0.005)
            .value(function(d, i) {
                return d.value;
            }),
            pieData = pie(series[0].data);
        // 创建计算弧形路径的函数
        var arc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);
        var bigArc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius + 10);

        // 绘图
        var pieGraph = this.group.main.selectAll('.' + classPrex + 'pie')
            .data([1])
            .enter()
            .append('g')
            .attr('class', classPrex + 'pie')
            .attr('transform', 'translate(' + offsetX + ',' + offsetY +')');

        var slices = pieGraph.selectAll('.' + classPrex + 'pie-slices')
            .data([1])
            .enter()
            .append('g').attr('class', classPrex + 'pie-slices');

        var arcs = slices.selectAll('path').data(pieData);
        arcs.enter()
            .append('path')
            .attr('class', function(d) {
                return classPrex + 'pie-slices-' + d.data.id;
            })
            .attr('fill', function(d) {
                return getColor(d.data.id);
            })
            .transition().duration(this.durationTime)
            .attrTween("d", function (d) {
                this._current = this._current || {startAngle: 0, endAngle: 0};
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(1);
                return function (t) {
                    return arc(interpolate(t));
                }
            });

        tooltip.classed(classPrex + 'tooltip-pie', true);

        arcs.on('mouseenter', function() {
            var data = d3.select(this).data()[0].data;
            tooltip.style('visibility', 'visible');
            tooltipText.text(data.name + '：' + data.value);
            d3.select(this)
                .attr('d', bigArc(d3.select(this).data()[0]));
        });
        arcs.on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
            d3.select(this)
                .attr('d', arc(d3.select(this).data()[0]));
        });
        slices.on('mousemove', function(e) {
            var mouse = d3.mouse(this);
            var offsetX = width/2,
                offsetY = - height/2;
            tooltip.style('transform', 'translate(' + (mouse[0] + offsetX + 10) + 'px,' + (mouse[1] + offsetY + 10) + 'px)');
        });

        if(context.isInit) {
            if(context.legendEvent) {
                // 注册legend事件
                context.legendEvent.mouseenter.subscribe(function(obj, idx , type) {
                    // TODO 搞清楚这里为什么用slices选择到某个path以后，其绑定的数据就从一个对象变成了1
                    // before: arcs.data() - [obj,obj,obj,obj,obj]
                    // var slice = slices.select('path:nth-child(1)');
                    // after: arcs.data() - [1,obj,obj,obj,obj]
                    var slice = d3.select(arcs[0][idx]);
                    slice.attr('d', bigArc(slice.data()[0]));
                });
                context.legendEvent.mouseleave.subscribe(function(obj, idx , type) {
                    var slice = d3.select(arcs[0][idx]);
                    slice.attr('d', arc(slice.data()[0]));
                });
                context.legendEvent.click.subscribe(function(obj, idx, type) {
                    var slice = d3.select(arcs[0][idx]),
                        visible = slice.data()[0].data.visible;
                    if(visible) {
                        // 由可见变为不可见
                        series[0].data[idx].value = 0;
                        pieData = pie(series[0].data);
                        slice.data()[0].data.visible = !visible;
                        // 检测是否所有弧形都隐藏了
                        var isAllGone = true;
                        series[0].data.forEach(function(d) {
                            isAllGone = d.visible ? false : isAllGone;
                        });
                        if(isAllGone) {
                            arcs.attr('d', null);
                            return;
                        }
                    } else {
                        // 由不可见变为可见
                        series[0].data[idx].value = series[0].data[idx].oldValue;
                        pieData = pie(series[0].data);
                        slice.data()[0].data.visible = !visible;
                    }
                    arcs = slices.selectAll('path').data(pieData);
                    arcs
                        .transition().duration(this.durationTime)
                        .attrTween("d", function (d) {
                            this._current = this._current || {startAngle: 0, endAngle: 0};
                            var interpolate = d3.interpolate(this._current, d);
                            this._current = interpolate(1);
                            return function (t) {
                                return arc(interpolate(t));
                            }
                        });

                });
            }
        }
    }

}(window));
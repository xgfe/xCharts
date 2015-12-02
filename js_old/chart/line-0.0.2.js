/**
 * Created by liuyang on 15/9/7.
 */
(function (window) {


    if (typeof window.define === 'function' && window.define.amd) {
        window.define('line', ['xCharts'], function (xCharts) {
            xCharts.prototype.line = line;
        });
    }

    if (window.xCharts) {
        window.xCharts.prototype.line = line;
    }

    var width, height, classPrex;
    var xScale;
    var yScale;
    var context;
    var getColor;
    var partial;
    var line;
    var lineConfig;

    function line(series, config) {
        width = this.width - this.margin.left - this.margin.right;
        height = this.height - this.margin.top - this.margin.bottom;
        classPrex = this.classPrex;
        xScale = this.xScale;
        yScale = this.yScale;
        context = this;
        getColor = this.getColor;
        partial = this.partial;
        line = [];
        lineConfig=config;
        var areaSeries=[];
        series.map(function (d, i) {
            d.width = d.width || 2;
            d.radius = d.radius || 3;
            d.interpolate = d.smooth !== false ? 'monotone' : 'linear'; //默认是直线

            //是否画面积图
            if(d.areaStyle && d.areaStyle.show){
                areaSeries.push(d);
            }

            line[d.idx] = d3.svg.line()
                .x(partial(getX, d))
                .y(partial(getY, d))
                .interpolate(d.interpolate);
        })

        //画线开始
        var line_g = this.group.main.selectAll('.' + classPrex + 'line-g').data(series);
        line_g.enter().append('g')
            .attr('class', classPrex + 'line-g');
        line_g.attr('id', function (d, i) {
                return classPrex + 'line-g-'+ context.chartNum+'-' + d.idx;
            });
        line_g.exit().remove();

        //加入曲线路径
        var line_path = line_g.selectAll('.' + classPrex + 'line-path').data(function (d, i) {
            if (d.show)
                return [d];
            else
                return [];
        });

        line_path.enter().append('path').attr('class', classPrex + 'line-path').attr('fill', 'none');

        line_path.attr('stroke-width', function (d) {
            return d.width;
        })
            .attr('stroke', function (d) {
                return getColor(d.idx);
            })
            .transition()
            .duration(context.transitionTime)
            .ease(context.transitionEase)
            .attrTween('d', function (d, i) {
                var tmpData = [];
                for (var j = 0; j < d.data.length; j++) {
                    tmpData.push(d3.median(d.data));
                }
                var interpolate = d3.interpolate(tmpData, d.data);

                return function (t) {
                    var d2 = interpolate(t);
                    return line[d.idx](d2);
                }
            });
        line_path.exit().remove();


        //为曲线打点
        var c_point = line_g.selectAll('.' + classPrex + '-line-point').data(function (data) {
            var ret = [];

            data.data.map(function (d, i) {
                ret.push({d: d, data: data})
            })

            return ret
        });
        c_point.attr('fill', 'none');
        c_point.exit().remove();

        context.pointTime && clearTimeout(context.pointTime);
        context.pointTime = setTimeout(function () {
            c_point.enter().append('circle')
                .attr('class', classPrex + '-line-point');
            c_point
                .attr('r', function (d, i) {
                    return d.data.radius;
                })
                .attr('fill', function (d, i) {
                    return getColor(d.data.idx);
                })
                .attr('cx', function (d, i) {
                    return getX(d.data, d, i);
                })
                .attr('cy', function (d, i) {
                    return getY(d.data, d.d, i);
                });

        }, context.transitionTime);

        setTimeout(function(){ lineArea(areaSeries);},context.transitionTime);//在动画效果结束后再画面积


        if (context.isInit) {
            //注册tooltip事件
            if (config.tooltip && config.tooltip.trigger == 'axis') {
                this.group.tips.getTextObserve.subscribe(function (idx, preIdx) {


                    if (preIdx !== -1) {
                        //清理上次的circle变大
                        line_g.selectAll('circle:nth-child('+(preIdx+2)+')').attr('r',function(d){
                            return d.data.radius;
                        })
                    }
                    if(idx !==-1){
                        line_g.selectAll('circle:nth-child('+(idx+2)+')').attr('r',function(d){
                            return d.data.radius+2;
                        })
                    }

                    var ret = [];
                    series.map(function (d, i) {
                        var value = parseFloat(d.data[idx]) + (d.units == null ? '' : d.units);
                        ret.push({type: 'line', name: d.name, value: value});
                    });
                    return ret;
                })
            }


            if (context.legendEvent) {
                /*注册legend事件*/
                //click 响应
                var lineStatus={};
                context.legendEvent.click.subscribe(function (obj,idx, type, status) {
                    if (type !== 'line')
                        return false;
                    var series = [];
                    lineStatus[idx]=status;
                    this.config.series.map(function (d, i) {

                        if(lineStatus[i]!==false){
                            series[d.type] = series[d.type] || [];
                            d.idx = i;
                            d.yAxisIndex = d.yAxisIndex == null ? 0 : d.yAxisIndex;
                            d.xAxisIndex = d.xAxisIndex == null ? 0 : d.xAxisIndex;
                            d.show = d.show == null ? true : d.show;
                            series[d.type].push(d);
                        }

                    });
                    this.drawCharts(this.config, series);
                })

                //mouseenter
                context.legendEvent.mouseenter.subscribe(function (obj,idx, type) {
                    if (type !== 'line')
                        return false;

                    var lineItem = d3.select('#' + classPrex + 'line-g-'+ this.chartNum+'-' + idx);
                    lineItem.selectAll('path').attr('stroke', 'yellow').attr('stroke-width', obj.data.width+1);
                    lineItem.selectAll('circle').attr('r', obj.data.radius + 2);

                    var use = this.group.main.append('use').attr('xlink:href', '#' + classPrex + 'line-g-'+ this.chartNum+'-' + idx);
                });

                //mouseleave
                context.legendEvent.mouseleave.subscribe(function (obj,idx, type) {
                    if (type !== 'line')
                        return false;

                    var lineItem = d3.select('#' +classPrex + 'line-g-'+ this.chartNum+'-' + idx);
                    lineItem.selectAll('path').attr('stroke', this.getColor(idx)).attr('stroke-width', obj.data.width);
                    lineItem.selectAll('circle').attr('r', obj.data.radius);

                    var use = this.group.main.selectAll('use').remove();
                });


            }
        }


    }


    function lineArea(areaSeries){
        areaSeries.map(function(d,i){
            var area  = d3.svg.area()
                .interpolate(d.interpolate)
                .y0(height)
                .x(partial(getX, d))
                .y1(partial(getY, d));

           var lineGroup= context.group.main.selectAll('#'+context.classPrex+'line-g-'+context.chartNum+'-'+ d.idx);

           var areaPath= lineGroup.selectAll('.'+context.classPrex+'line-area').data([d]);
            areaPath.enter().append('path').attr('class',context.classPrex+'line-area').attr('stroke','none');

            areaPath.attr('fill',function(d){

                console.log(context.getColor(d.idx));

                if(d.areaStyle.color){
                    return d.areaStyle.color;
                }else
                    return context.getColor(d.idx);

            })
                .attr('opacity',function(d){
                    if(!d.areaStyle.color)
                        return 0.3;
                }).attr('d',function(d){
                    return area(d.data,0)
                })

        });

    }


    function getX(obj, d, i) {
        var ret;
        d = parseFloat(d);
        var axisIdx = obj.xAxisIndex || 0;
        if (lineConfig.xAxis[axisIdx].type == 'category')
            ret = xScale[axisIdx](lineConfig.xAxis[axisIdx].data[i]);
        else if (lineConfig.xAxis[axisIdx].type == 'time')
            ret = xScale[axisIdx](lineConfig.xAxis[axisIdx].data[i]);
        return ret;
    }

    // 双Y轴，取得的值不对
    function getY(obj, d, i) {
        d = parseFloat(d);
        var ret;
        var axisIdx = obj.yAxisIndex || 0;
        if (lineConfig.yAxis[axisIdx].type == 'value')
            ret = yScale[axisIdx](d);
        return ret;
    }



}(window))
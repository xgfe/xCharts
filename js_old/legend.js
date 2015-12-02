/**
 * Created by liuyang on 15/10/8.
 */
(function () {
    if (window.xCharts) {
        window.xCharts.prototype.legend = legend;
    }
    var xCharts = window.xCharts;
    var getNotUndefinedValue = xCharts.fn.getNotUndefinedValue;
    var classPrex;
    var getObserver = xCharts.fn.getObserver;
    // TODO 加入选择模式
    function legend(config) {
        var series = config.series;
        var legendConfig = config.legend;
        var orient = getNotUndefinedValue(legendConfig.orient, 'horizontal');
        var x = getNotUndefinedValue(legendConfig.x, 'center');
        var y = getNotUndefinedValue(legendConfig.y, 'bottom');
        var itemGap = getNotUndefinedValue(legendConfig.itemGap, 2);
        var formatter = getNotUndefinedValue(legendConfig.formatter, defaultFormatter);
        //var selectedMode = getNotUndefinedValue(legendConfig.selectedMode, 'multiple');
        legendConfig.item = getNotUndefinedValue(legendConfig.item, {});
        legendConfig.item.hoverStyle = getNotUndefinedValue(legendConfig.item.hoverStyle, {});
        var item = {
            fontSize: getNotUndefinedValue(legendConfig.item.fontSize, 14),
            color: getNotUndefinedValue(legendConfig.item.color, '#000'),
            chartSize: getNotUndefinedValue(legendConfig.item.chartSize, 20),
            hiddenOpacity: getNotUndefinedValue(legendConfig.item.hiddenOpacity, 0.3),
            hoverStyle: {
                color: getNotUndefinedValue(legendConfig.item.hoverStyle.color, 'auto')
            }
        }
        classPrex=this.classPrex;
        /*初始化config结束*/
        var context = this;
        var legendSeries = [];
        var textMaxWidth = 0;

        if (series[0].type == 'pie') {
            legendSeries = series[0].data.map(function (d, i) {

                var name = formatter(d.name);
                var obj = {
                    name: name,
                    type: 'pie',
                    textWidth: name.length * item.fontSize,
                    data: d
                };
                if (obj.textWidth > textMaxWidth) {
                    textMaxWidth = obj.textWidth;
                }
                return obj;

            });
        }
        else if (series[0].type == 'funnel') {
            legendSeries = series[0].data.map(function (d, i) {

                var name = formatter(d.name);
                var obj = {
                    name: name,
                    type: 'funnel',
                    textWidth: name.length * item.fontSize,
                    data: d
                };
                if (obj.textWidth > textMaxWidth) {
                    textMaxWidth = obj.textWidth;
                }
                return obj;

            });
        }
        else {
            legendSeries = series.map(function (d, i) {
                var name = formatter(d.name);
                var obj = {
                    name: name,
                    type: d.type,
                    textWidth: name.length * item.fontSize,
                    data: d
                };
                if (obj.textWidth > textMaxWidth) {
                    textMaxWidth = obj.textWidth;
                }
                return obj;

            });
        }
        textMaxWidth += item.chartSize + itemGap;
        var legendGroup = this.svg.append('g').attr('class', classPrex + 'legend-group').style({cursor: 'pointer'});

        var legendList = legendGroup.selectAll('.' + classPrex + 'legend-item-group').data(legendSeries);
        if (orient == 'horizontal') {
            /*水平排列*/
            var width = this.width - this.margin.left - this.margin.right;
            var offsetY = 0, offsetX = 0, lastLineOffsetX = 0;
            var itemHeight = (item.fontSize > item.chartSize ? item.fontSize : item.chartSize) + 2;
            var lineNumber = Math.floor(width / textMaxWidth);
            legendSeries.map(function (d, i) {
                /*这里暂时只实现多行多列对齐*/
                d.lineIdx = Math.floor(i / lineNumber);
            });

            var lastLineIdx = legendSeries[legendSeries.length - 1].lineIdx;

            if (y == 'top') {
                offsetY = this.margin.top + 10;//+10防止和标题贴合过紧
                this.margin.top += itemHeight * (lastLineIdx + 1) + 10;//防止图表贴到legend
            } else if (y == 'bottom') {
                offsetY = context.margin.bottom;
                this.margin.bottom = itemHeight * (lastLineIdx + 1) + this.margin.bottom+10;
                offsetY = context.height - context.margin.bottom + offsetY + 20;// 20 是人工偏移，防止和X轴上的文字重叠
            }

            /*只有在单行的情况下 x=center 才会生效*/

            if (x == 'center' && lastLineIdx == 0) {
                offsetX = (width - textMaxWidth * legendSeries.length) / 2;
            } else if (x == 'right') {
                var lastLineList = [];
                legendSeries.map(function (d, i) {
                    if (d.lineIdx == lastLineIdx) {
                        lastLineList.push(d);
                    }
                });
                lastLineOffsetX = (lineNumber - lastLineList.length) * textMaxWidth;
            }

            offsetX += this.margin.left;
            legendGroup.attr('transform', 'translate(' + offsetX + ',' + offsetY + ')');
            var nowWidth = 0, nowLineIdx = 0;
            legendList.enter().append('g').attr('class', classPrex + 'legend-item-group')
                .attr('transform', function (d, i) {
                    var y = d.lineIdx * itemHeight;
                    var x = 0;
                    if (d.lineIdx != nowLineIdx) {
                        nowWidth = 0;
                        nowLineIdx++;
                    }
                    x = nowWidth;
                    nowWidth += textMaxWidth;
                    if (d.lineIdx == lastLineIdx) {
                        //处理x=right
                        x += lastLineOffsetX;
                    }
                    return 'translate(' + x + ',' + y + ')'
                });

        } else if (orient == 'vertical') {
            /*垂直排列*/
            var height = context.height - context.margin.top - context.margin.bottom;
            var offsetY = 0, offsetX = 0;
            var itemHeight = (item.fontSize > item.chartSize ? item.fontSize : item.chartSize) + itemGap;
            var oneColMaxNum = Math.floor(height / itemHeight);
            var everyColWidth = [];
            var colIdx = -1;
            legendSeries.map(function (d, i) {
                var offsetWidth = 20; //横向legend之间的间距
                d.rowIdx = Math.floor(i % oneColMaxNum);

                if (d.rowIdx == 0) {
                    colIdx++;
                }
                d.colIdx = colIdx;

                everyColWidth[colIdx] = everyColWidth[colIdx] || 0;
                if (everyColWidth[colIdx] < d.textWidth + offsetWidth) {
                    everyColWidth[colIdx] = d.textWidth + offsetWidth;
                }

            });
            offsetY = context.margin.top;
            if (x == 'left') {
                context.margin.left = context.margin.left + everyColWidth.reduce(function (pre, d) {
                        return pre + d
                    })
            } else if (x == 'right') {
                offsetX = context.margin.right;
                context.margin.right = offsetX + everyColWidth.reduce(function (pre, d) {
                        return pre + d
                    });
                offsetX = context.width - context.margin.right + offsetX;
            }

            legendGroup.attr('transform', 'translate(' + offsetX + ',' + offsetY + ')');
            legendList.enter().append('g')
                .attr('class', classPrex + 'legend-item-group')
                .attr('transform', function (d) {
                    var y = d.rowIdx * itemHeight;
                    var x = 0;
                    for (var i = 0; i < d.colIdx; i++) {
                        x += everyColWidth[i];
                    }
                    return 'translate(' + x + ',' + y + ')';
                });
        }

        //与排列无关的公共部分
        // 散点图和饼图共用一种圆
        legendList.append('path')
            .attr('d', function (d, i) {
                if (d.type == 'line') {
                    return getLinePath(item.chartSize);
                } else if(d.type=='scatter'|| d.type=='pie') {
                    return getScatterPath(item.chartSize);
                }else if(d.type=='funnel')
                    return getFunnelPath(item.chartSize,0.2);
            })
            .attr('stroke', function (d, i) {
                if(d.type=='line')
                    return context.getColor(i);
                else if(d.type=='scatter'|| d.type=='pie')
                    return 'none';
            })
            .attr('fill', function (d, i) {
                if (d.type == 'scatter' || d.type=='pie'|| d.type=='funnel')
                    return context.getColor(i);
                else
                    return 'none';
            })
            .attr('stroke-width', 2)
            .attr('transform', function (d, i) {
                var h = item.chartSize / 6;
                var y = h - item.fontSize / 2;
                var x=0;
                //根据不同的图形修正偏移量
                if(d.type=='scatter' || d.type=='pie'){
                    y-=1.4;
                    x+=3;
                }else if(d.type=='funnel'){
                    y=-item.chartSize*3/4;
                }

                return 'translate('+x+',' + y + ')';

            });
        legendList.append('text')
            .text(function (d) {
                return d.name;
            })
            .attr('font-size', item.fontSize)
            .attr('fill', item.color)
            .attr('transform', 'translate(' + item.chartSize + ',0)');

        context.legendEvent = {
            mouseenter: getObserver(),
            mouseleave: getObserver(),
            click: getObserver()
        };

        var itemStatus = {};
        legendList.on('mouseenter.legend', function (obj, idx) {

            var clickItem = legendGroup.select('.' + classPrex + "legend-item-group:nth-child(" + (idx + 1) + ")>text");

            clickItem.attr('fill', function (d, i) {
                if (item.hoverStyle.color === 'auto')
                    return context.getColor(idx);
                else
                    return item.hoverStyle.color;
            })
            if (itemStatus[idx] !== false)
                context.legendEvent.mouseenter.pulish(context, obj, idx, obj.type);
        });

        legendList.on('mouseleave.legend', function (obj, idx) {

            var clickItem = legendGroup.select('.' + classPrex + "legend-item-group:nth-child(" + (idx + 1) + ")>text");

            clickItem.attr('fill', item.color)

            if (itemStatus[idx] !== false)
                context.legendEvent.mouseleave.pulish(context, obj, idx, obj.type);


        });

        legendList.on('click.legend', function (obj, idx) {
            var clickItem = legendGroup.select('.' + classPrex + "legend-item-group:nth-child(" + (idx + 1) + ")");
            itemStatus[idx] = getNotUndefinedValue(itemStatus[idx], true);
            if (itemStatus[idx] === true) {
                //灰化单位
                clickItem.style({'opacity': item.hiddenOpacity});
                itemStatus[idx] = false;
            } else {
                clickItem.style({'opacity': 1});
                itemStatus[idx] = true;
            }
            context.legendEvent.click.pulish(context, obj, idx, obj.type, itemStatus[idx]);
        });
    }


    /**
     * 默认格式化函数，返回传入的任何值
     * @param name
     * @returns {*}
     */
    function defaultFormatter(name) {
        return name;
    }

    /**
     * 折线图图例
     * @param size 正方形 宽度
     * @returns {string} -o-
     */
    function getLinePath(size) {
        var r = size / 6;
        var ret = 'M0,0L' + 2 * r + ',0';
        ret += 'A' + r + ',' + r + ' 0 1 1 ' + 2 * r + ',0.00000001';
        ret += 'M' + 4 * r + ',0L' + 6 * r + ',0';
        return ret;
    }

    /**
     * 散点图图例
     * @param size 正方形 宽度
     * @returns {string} 圆圈 O
     */
    function getScatterPath(size) {
        var r = size*4/5;
        var ret = 'M0,0A' + r / 2 + ',' + r / 2 + ' 0 1 1 0,0.000001';
        return ret;
    }

    function getFunnelPath(size,radius){
            var rx,ry;
            radius=radius==null?0.1:radius;
            rx=ry=size*radius;
            var retStr = 'M'+rx+',0L'+(size-rx)+',0';
            retStr+= 'Q'+size+',0 '+size+','+ry;
            retStr+='L'+size+','+(size-ry); //画右边框
            retStr+='Q'+size+','+size+' '+(size-rx)+','+size;//画右下圆角
            retStr+='L'+rx+','+size;//下边框
            retStr+='Q0,'+size+' '+'0,'+(size-ry);//左下圆角
            retStr+='L0,'+ry;//左边框
            retStr+='Q0,0 '+rx+',0';
            return retStr
    }
}())
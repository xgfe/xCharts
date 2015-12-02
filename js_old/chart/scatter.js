/**
 * Created by liuyang on 15/10/8.
 */
(function () {
    if (window.xCharts) {
        window.xCharts.prototype.scatter = scatter;
    }
    var d3 = window.d3;
    var xCharts = window.xCharts;
    var getNotUndefinedValue = xCharts.fn.getNotUndefinedValue;
    var xScale, yScale, context, getColor, config,chartNum

    /**
     * 散点图入口，串所有的流程
     * TODO 思考，是统一处理参数，还是随用随取
     * @param series
     * @param config
     */
    function scatter(series) {
        xScale = this.xScale;
        yScale = this.yScale;
        context = this;
        getColor = this.getColor;
        config = this.config;
        chartNum=this.chartNum;
        draw(series);
        scaTooltip(series);

        if(context.legendEvent){
            legendRes(context.legendEvent,series);
        }
    }

    /**
     * 绘出散点图
     * @param series
     */
    function draw(series) {

        for (var i = 0, len = series.length; i < len; i++) {
            var serie = series[i];
            var scatterGroup = context.group.main.append('g').attr('class', 'xc-scatter-group').attr('fill', getColor(i)).attr('id','xc-scatter-group-'+i+'-'+chartNum);
            scatterGroup.selectAll('.sc-scatter-item').data(serie.data).enter().append('circle').attr('class', 'sc-scatter-item')
                .attr('cx', function (d) {
                    return xScale[serie.xAxisIndex](d[0]);
                })
                .attr('cy', function (d) {
                    return yScale[serie.yAxisIndex](d[1]);
                })
                .attr('opacity', 0.7)
                .attr('r', function(d){
                    // TODO 半径小的优先画，这样可以最大程度避免重叠问题
                    if(serie.size)
                        return serie.size(d);
                    else
                        return 5;
                })
                .attr('data-series', i) //身份标识，方便tooltip拿到对应的name等参数
                .style({cursor: 'pointer'})
        }

    }

    /**
     * 当鼠标移入某个圆时，显示tooltip，并设置调用相应的格式化函数设置文本
     * 移出时，隐藏tooltip
     * 在园内移动，改变tooltip位置，防止鼠标误入tooltip中造成闪烁（已经进行了边界判断）
     * @param series
     */
    function scaTooltip(series) {
        var scaItem = context.group.main.selectAll('.sc-scatter-item');
        var oldRadius;
        var showTooltip = false;
        //判断是否需要操作tooltip,必须具备show=true,trigger=item,formatter为function
        if (config.tooltip && config.tooltip.show && config.tooltip.trigger == 'item' && typeof config.tooltip.formatter=='function')
            showTooltip = true;

        scaItem.on('mouseenter.scatter', function (d) {
            var item = d3.select(this);
            oldRadius = parseInt(item.attr('r'));
            item.attr('r', oldRadius * 1.3)//放大1.3倍;
            //设置提示文字
            if (showTooltip) {
                var serieIdx = item.attr('data-series');
                var serie = series[serieIdx];
                var formatter=config.tooltip.formatter;
                var param={name:serie.name,value:d};
                context.group.tips.tooltip.style({display:'block'})
                context.group.tips.tooltipText.html(formatter(param));
            }
        });
        scaItem.on('mouseleave.scatter', function (d) {
            var item = d3.select(this);
            item.attr('r', oldRadius)

            if(showTooltip){
                context.group.tips.tooltip.style({display:'none'})
            }
        })

        if(showTooltip){
            scaItem.on('mousemove.scatter', function (d) {
                var coordinate = d3.mouse(this);
                var tipWidth =  parseFloat( context.group.tips.tooltip.style('width') );
                var tipHeight=parseFloat( context.group.tips.tooltip.style('height') );
                coordinate[0]+=context.margin.left+20;
                coordinate[1]+=context.margin.top+20;

                //当超过div宽度时，修正位置
                if(coordinate[0]+tipWidth>context.width)
                    coordinate[0]-=2*context.margin.left+40;
                if(coordinate[1]+tipHeight>(context.height-context.margin.top))
                    coordinate[1]=context.height-tipHeight-context.margin.top;

                var translate = 'translate('+coordinate[0]+'px,'+coordinate[1]+'px)';
                context.group.tips.tooltip.style({transform:translate})
            })
        }

    }

    /**
     * 响应legend事件
     */
    function legendRes(event,series){
        event.mouseenter.subscribe(function(data,idx,type){
            context.group.main.selectAll('#xc-scatter-group-'+idx+'-'+chartNum+' circle').attr('opacity',1);
        })
        event.mouseleave.subscribe(function(data,idx,type){
            context.group.main.selectAll('#xc-scatter-group-'+idx+'-'+chartNum+' circle').attr('opacity',0.7);
        })
        event.click.subscribe(function(data,idx,type,status){
            var group = context.group.main.selectAll('#xc-scatter-group-'+idx+'-'+chartNum);
            if(status){
                group.attr('fill',getColor(idx));
            }else{
                group.attr('fill','none')
            }
        })
    }
}())
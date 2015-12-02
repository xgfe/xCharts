/**
 * xcharts 基于d3js的图表库
 * 漏斗图
 * Created by liuyang on 15/10/9.
 */

(function () {

    // TODO 尽量用CSS动画
    // DONE lengend 点击尖角有问题
    // DONE 金字塔legend出错
    var d3 = window.d3;
    var xCharts = window.xCharts;
    if (xCharts) {
        xCharts.fn.funnel = funnel;
    }

    var percentReg = /(\d+)%$/,
        pixelReg = /(\d+)px$/,
        figureReg = /(\d+)/


    function defatuleConfig(){
        var title={
            //标题配置项
            show:false, //标题开关，true表示显示，false表示不显示
            text:'我是主标题', //主标题文本
            subtext:'我是副标题', //副标题文本
            x:'center', //水平位置，默认center, 支持 'center'|'left'|'right'|number(单位px或者百分比)
            y:'top', //暂时不支持自定义,垂直位置，默认top,注意一旦设置y后标题将会不在图表上占据位置会和图表重叠在一起, 支持 'top'|'middle'|'bottom'|number(单位px或者百分比)
            textStyle:{ //主标题
                // TODO font-family去掉
                fontFamily:"'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif;", //字体类型
                fontSize:14, //字号
                color:'#000', //默认颜色
            },
            subtextStyle:{
                fontFamily:"'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif;", //字体类型
                fontSize:12, //字号
                color:'#00', //默认颜色
            }

        }
        return title;
    }
    var config={
        title:{
            show:true
        },
        sereis:[
            {
                type:'line',
                xIndex:0,
            }
        ]
    }

    function funnel(series, config, messageCenter) {

        //xCharts.utils.merage(title,config.title);

        this.series = series;
        this.messageCenter = messageCenter;
        this.groupWidth = messageCenter.width - messageCenter.margin.left - messageCenter.margin.right;
        this.groupHeight = messageCenter.height - messageCenter.margin.top - messageCenter.margin.bottom;
        this.__init();
        this.__render();
        this.__addMousehoverEvent(this.funnelPaths);
        this.__legendResponse(messageCenter, this.funnelGroup);
        this.__tooltipEvent(this.funnelGroup, this.funnelPaths, messageCenter);
    }

    funnel.prototype = {
        constructor: funnel,
        __init: function () {
            this.series.forEach(function(serie){
                serie.data.forEach(function(data,i){
                    data.idx=i;
                })
            })
        },
        //渲染漏斗图
        __render: function () {
            console.log('funnel开始渲染')

            var sizes = this.__funnelSize();
            this.__sort(); //将data从大到小的排序
            var _this = this;


            var group = this.messageCenter.group;
            var funnelGroup = group.main.selectAll('.xc-funnel-group').data(this.series);
            funnelGroup.enter().append('g').attr('class', 'xc-funnel-group');

            //暂时只有一个漏斗图，且放在中心位置
            // TODO 添加位置控制属性
            var valuesArr = _this.series[0].data;
            var size = sizes[0];
            var serie = this.series[0];
            var pointsFunc = funnelPoints(size[0], size[1], valuesArr, _this.series[0].sort);
            var offsetX = (this.groupWidth - sizes[0][0]) / 2;
            var offsetY = (this.groupHeight - sizes[0][1]) / 2;
            //结束


            var labelGroup = group.main.selectAll('.xc-funnel-label-group').data(this.series);
            labelGroup.enter().append('g').attr('class','xc-funnel-label-group').attr('transform','translate('+offsetX+','+offsetY+')');
            this.__addLabel(labelGroup, pointsFunc, 'circle', 1000); //先绘出label，可以防止线条在动画过程中因颜色不同而暴露


            funnelGroup.attr('transform', 'translate(' + offsetX + ',' + offsetY + ')');


            var funnelPaths = funnelGroup.selectAll('path').data(function (d) {
                return d.data;
            })
            funnelPaths.enter().append('path');
            funnelPaths
                .attr('fill', function (d, i) {
                    return _this.messageCenter.getColor(d.idx);
                })
                .attr('stroke', 'transparent')
                .attr('class', function (d, i) {
                    return 'xc-funnel-path-' + d.idx;
                });



            this.offsetX = offsetX;
            this.offsetY = offsetY;
            this.funnelGroup = funnelGroup;
            this.funnelPaths = funnelPaths;
            this.__funnelPathAniamtions(funnelPaths, serie.sort, 'circle', 500, pointsFunc, valuesArr, size);


        },
        __tooltipEvent: function (group, paths, messageCenter) {
            var tips = messageCenter.group.tips;
            var formatter = messageCenter.config.tooltip.formatter;
            tips.tooltipText.html('1231231');
            group.on('mouseenter.tooltip', function () {
                tips.tooltip.style({display: 'block'})
            });
            group.on('mouseleave.tooltip', function () {
                tips.tooltip.style({display: 'none'})
            });
            var ox = this.offsetX + messageCenter.margin.left + 30, oy = this.offsetY + messageCenter.margin.top + 30;
            group.on('mousemove.tooltip', function () {
                var coordinate = d3.mouse(this);
                coordinate[0] += ox;
                coordinate[1] += oy;
                var translate = 'translate(' + coordinate[0] + 'px,' + coordinate[1] + 'px)';
                tips.tooltip.style({transform: translate})
            })
            paths.on('mouseenter.tooltip', function (d) {
                var param = {name: d.name, value: d.value};
                tips.tooltipText.html(formatter(param));
            })


        },
        __funnelPathAniamtions: function (paths, dir, ease, time, pointsFnc, values, size) {
            var _this = this;
            var scale = 0.8;
            var firstPointsFnc = funnelPoints(size[0] * scale, size[1], values, dir);
            var offsetX = size[0] * (1 - scale) / 2;
            var avgHeight = size[1] / values.length;

            var transition = paths.transition().duration(time).ease(ease)
                .attrTween('d', function (d, i) {
                    var targetPoints = pointsFnc(i);
                    var path = this;
                    if (!this.points) {
                        //首次渲染
                        path.points = [];
                        path.points = firstPointsFnc(i);
                        path.points = path.points.map(function (d, i) {
                            var y = d[1], x = d[0] + offsetX;
                            if (i < 2) {
                                y = y - avgHeight * scale;
                            }
                            return [x, y];
                        })
                    }
                    var interpolate = d3.interpolate(path.points, targetPoints);
                    path.points = targetPoints;
                    return function (t) {
                        var points = interpolate(t);
                        return getPath(points);
                    }

                });


            return transition;
        },
        __legendResponse: function (message, group) {
            var event = message.legendEvent;
            var _this = this;
            var serie = this.series[0]; // TODO 修改为多图
            event.mouseenter.subscribe(function (data, idx, type) {
                var item = group.selectAll('.xc-funnel-path-' + idx);
                item.attr('opacity', 0.7);
            });
            event.mouseleave.subscribe(function (data, idx, type) {
                var item = group.selectAll('.xc-funnel-path-' + idx);
                item.attr('opacity', 1);
            });

            event.click.subscribe(function (data, idx, type, status) {
                serie.data.forEach(function (d, i) {
                    if (d.idx != idx) return;
                    d.show = status;
                });
                console.log(serie);
                _this.__render();
            });

        },
        /**
         * 把name加到图表当中
         * @param group 包含funnel的g元素
         * @param pointsFnc 包含区块坐标的函数
         * @private
         */
        __addLabel: function (group, pointsFnc, ease, time) {
            var _this = this;
            var textGroup = group.selectAll('g').data(function (d) {
                var arr = [];
                d.data.forEach(function (d, i) {
                    var obj = {};
                    obj.name = d.name;
                    obj.value = d.value;

                    var points = pointsFnc(i);
                    var x = d3.mean(points, function (point) {
                        return point[0];
                    })
                    var minX = d3.min(points, function (point) {
                        return point[0];
                    })
                    var y = d3.mean(points, function (point) {
                        return point[1];
                    })
                    var toPoint = [];
                    toPoint[0] = 2 * x - minX + 20;
                    toPoint[1] = y;
                    obj.formPoint = [x, y];
                    obj.toPoint = toPoint;
                    obj.show = d.show;
                    obj.idx= d.idx;
                    arr.push(obj);
                })

                return arr;
            });
            var fontSize = 14;
            textGroup.enter().append('g').attr('class', 'xc-funnel-label');
            textGroup.attr('visibility', function (d) {
                if (d.show == false) return 'hidden';
            });

            var paths = textGroup.selectAll('path').data(function (d, i) {
                return [d];
            });

            paths.enter().append('path');
            paths.attr('d', function (d, i) {
                return getPath([d.formPoint, d.toPoint], false);
            })
                .attr('stroke', function (d, i) {
                    return _this.messageCenter.getColor(d.idx);
                })
                .attr('stroke-dasharray', function (d) {
                    var formPoint = d.formPoint, toPoint = d.toPoint;
                    var width = (toPoint[0] - formPoint[0]);
                    this.strokeOffset = width;
                    return width;
                })
                .attr('stroke-dashoffset', function (d) {
                    return this.strokeOffset;
                });

            paths.transition().duration(time)
                .attrTween('stroke-dashoffset', function (d) {
                    var strokeOffset = this.strokeOffset;
                    var interpolate = d3.interpolate(strokeOffset, 0);
                    return function (t) {
                        return interpolate(t);
                    }
                })

            var texts = textGroup.selectAll('text').data(function (d, i) {
                d.idx = i;
                return [d];
            });

            texts.enter().append('text').text(function (d) {
                return d.name;
            });
            texts.attr('x', function (d) {
                return d.toPoint[0];
            })
                .attr('font-size', fontSize);
            texts.transition().duration(time / 2).ease(ease)
                .attrTween('y', function (d) {
                    var y = d.toPoint[1] + fontSize / 3;
                    if (!this.startY) {
                        //第一次加载
                        this.startY = y;
                    }
                    var interpolate = d3.interpolate(this.startY, y);
                    this.startY = y;
                    return function (t) {
                        return interpolate(t);
                    }
                })
        },
        /**
         * 鼠标移入移出时，区块响应
         * @param paths 区块path数组
         * @private
         */
        __addMousehoverEvent: function (paths) {
            paths.on('mouseenter.funnel', function (d) {
                console.log(d);
                var item = d3.select(this);
                item.attr('opacity', 0.7);
            });
            paths.on('mouseleave.funnel', function () {
                var item = d3.select(this);
                item.attr('opacity', 1);
            });
        },
        /**
         * 将series根据sort排序,top升序，down降序
         * @returns {Array} 排序后的数组
         * @private
         */
        __sort: function () {
            this.series.forEach(function (serie) {
                //降序排列
                var sort = serie.sort;
                serie.data.sort(function (one, two) {
                    var v = two.value - one.value;
                    if (sort == 'top') {
                        v = -v;
                    }
                    return v;
                });
            })
        },
        /**
         * 计算漏斗图的宽高
         * 当用户没有定义size时，报警告，并设置宽高为0
         * @private
         */
        __funnelSize: function () {
            var sizes = [];
            //合并三种形式的正则
            var sizeReg = new RegExp(percentReg.source + '|' + pixelReg.source + '|' + figureReg.source);
            var groupSize = [this.groupWidth, this.groupHeight];
            this.series.forEach(function (serie, idx) {
                if (!serie.size) {
                    console.warn('config:series[' + idx + '].size not defined');
                    sizes.push([0, 0]);
                    return;
                }
                var result = [];
                var size = serie.size;
                for (var i = 0; i < 2; i++) {
                    if (typeof size[i] == 'number') {
                        result[i] = size[i];
                    } else {
                        //原谅我用replace这个语义并不适合这里，但是这样写会方便很多
                        size[i].replace(sizeReg, function (g, percent, pixel, figure) {
                            if (percent) {
                                //单位为百分比
                                percent = +percent;
                                result[i] = groupSize[i] * percent / 100;
                            } else if (pixel || figure) {
                                //单位为像素
                                result[i] = pixel ? +pixel : +figure;
                            }
                        })
                    }
                }
                sizes.push(result);
            });
            return sizes;
        }
    }

    //这样做的好处是，可以使用xCharts原型上的变量，但是在funnel上的变量不会污染xcharts
    inherits(funnel, xCharts);

    //继承
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;

        function F() {
        }

        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();
        for (var prop in clazzPrototype) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
        clazz.constructor = clazz;
    }


    /**
     * 根据传入的宽高和值数组，计算出每个区块的左上角和右上角顶点位置，最后一个只有一个顶点
     * @param width 图形宽度
     * @param height 图形高度
     * @param values 已排序的数组
     * @param maxValue 最大值
     * @param dir 图形方向，top,down
     * @returns {Function}
     */
    function funnelPoints(width, height, values, dir) {
        var num = values.reduce(function (n, b) {

            if (b.show != false)
                return n + 1;
            else
                return n;

        }, 0); //显示区块总数
        var maxNum = values.length;
        var avgHeight = height / num;//每个区块的高度
        var maxValue = d3.max(values, function (d) {
            return parseFloat(d.value)
        });
        var vertexPoints = [];
        //此处计算每个区块的四个顶点
        var j = dir=='top'?1:0;
        values.forEach(function (v, i) {
            var startY = avgHeight * j;
            var endY = startY;
            var itemWidth = width * (v.value / maxValue);
            var startX = (width - itemWidth) / 2;
            var endX = startX + itemWidth;
            vertexPoints[i] = [[startX, startY], [endX, endY]];
            if (v.show != false) //不显示的区块也有点，仅仅只是高度为0
                j++;
        });

        //保持一个区块4个点，方便计算
        if (dir == 'top') {
            vertexPoints.unshift([[width / 2, 0], [width / 2, 0]]);

            for (var i = 0, len = values.length; i < len; i++) {
                var v = values[i];
                if (v.show != false)
                    continue;
                vertexPoints[i + 1] = vertexPoints[i];
            }

        }
        else {
            vertexPoints.push([[width / 2, height], [width / 2, height]]);
            for (var i = values.length - 1; i >= 0; i--) {
                var v = values[i];
                if (v.show != false)
                    continue;
                vertexPoints[i] = vertexPoints[i + 1];
            }
        }


        /**
         * 得到指定区块的4个顶点
         *
         */
        return function (idx) {
            if (idx >= maxNum) {
                console.error('idx:' + idx + '超过了总数' + num);
                return;
            }
            var points = [];
            vertexPoints[idx].forEach(function (d) {
                points.push(d);
            });
            vertexPoints[idx + 1].forEach(function (d) {
                points.unshift(d);
            })
            return points;
        }
    }

    /**
     * 根据点生成区块的路径
     * @param points {array} 坐标合集，二维数组
     * @returns {string}
     */
    function getPath(points, close) {
        var path = 'M';
        points.forEach(function (point) {
            path += point + 'L';
        });
        path = path.substr(0, path.length - 1) + (close == false ? '' : 'Z');
        return path;
    }

}

())
/**
 * 漏斗图
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    xCharts.charts.extend({funnel: funnel});
    utils.inherits(funnel, Chart);

    function funnel(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'funnel');
    }

    funnel.prototype.extend = xCharts.extend;
    funnel.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _this = this;
            _this.series = parseSeries(series, _this);
        },
        render: function (animationEase, animationTime) {
            //注意一个serie就是一个图
            var _this = this;
            var animationConfig = _this.config.animation;

            var funnelGroup = _this.main.selectAll('.xc-funnel-group')
                .data(_this.series);

            funnelGroup = funnelGroup.enter().append('g')
                .attr('class', 'xc-funnel-group')
                .merge(funnelGroup);

            funnelGroup.exit().remove();//updateSeries时，删除多余的组

            funnelGroup.attr('transform', function (serie) {
                return 'translate(' + serie.xOffset + ',' + serie.yOffset + ')';
            })
            //画区块
            var funnelSection = funnelGroup.selectAll('.xc-funnel-section').data(function (serie) {
                return serie.data;
            });
            funnelSection = funnelSection.enter().append('path')
                .attr('class', 'xc-funnel-section')
                .merge(funnelSection)

            funnelSection.attr('fill', function (d) {
                    return _this.getColor(d.idx);
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('d', function (d) {

                    if (this.pathArr === undefined) {
                        var pathArr = utils.copy(d.pathArr, true);
                        pathArr[2][1] = pathArr[2][1] * 0.95;
                        pathArr[3][1] = pathArr[3][1] * 0.95;
                        this.pathArr = pathArr;
                    }

                    // this.pathArr = this.pathArr === undefined ? d.pathArr : this.pathArr;
                    var interpolate = d3.interpolate(this.pathArr, d.pathArr);
                    this.pathArr = d.pathArr;
                    return function (t) {
                        return buildFunnelPath(interpolate(t));
                    }
                });

            //画label
            var funnelLabel = funnelGroup.selectAll('.xc-funnel-label')
                .data(function (serie) {
                    return serie.data;
                });

            var transitionStr = "opacity " + animationConfig.animationTime + "ms linear";

            funnelLabel = funnelLabel.enter().append('g')
                .attr('class', 'xc-funnel-label')
                .style("transition", transitionStr)
                .merge(funnelLabel);

            funnelLabel.exit().remove();
            funnelLabel.attr('opacity', function (d) {
                    if (d.show == false)
                        return 0;
                    else
                        return 1;
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('transform', function (d) {

                    if (this.labelPosition === undefined) {
                        this.labelPosition = [d.labelPosition[0] * 1.1, d.labelPosition[1]];
                    }

                    // this.labelPosition = this.labelPosition === undefined ? d.labelPosition : this.labelPosition;
                    var interpolate = d3.interpolate(this.labelPosition, d.labelPosition);
                    this.labelPosition = d.labelPosition;
                    return function (t) {
                        return 'translate(' + interpolate(t) + ')';
                    }

                })

            var labelLine = funnelLabel.selectAll('.xc-funnel-label-line')
                .data(function (d) {
                    if (d.show != false)
                        return [d]
                    else
                        return [];
                });

            labelLine = labelLine.enter().append('path')
                .attr('class', 'xc-funnel-label-line')
                .merge(labelLine);

            labelLine.attr('d', function (d) {
                    return 'M0,0 L' + d.labelWidth + ',0';
                })
                .attr('stroke', function (d) {
                    return _this.getColor(d.idx);
                });

            var labelText = funnelLabel.selectAll('.xc-funnel-label-text')
                .data(function (d) {
                    if (d.show != false)
                        return [d]
                    else
                        return [];
                });

            labelText = labelText.enter().append('text')
                .attr('class', 'xc-funnel-label-text')
                .merge(labelText);
            labelText.text(function (d) {
                    return d.name
                })
                .attr('font-size', 14)
                .attr('x', function (d) {
                    return d.labelWidth + 5;
                })
                .attr('y', '0.2em');

            _this.funnelSection = funnelSection;
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this;
            _this.on('legendMouseenter.funnel', function (name) {
                _this.funnelSection.attr('opacity', function (d) {
                    var op = 1;
                    if (d.name == name) op = d._serie.itemStyle.opacity
                    return op;
                });
            });
            _this.on('legendMouseleave.funnel', function () {
                _this.funnelSection.attr('opacity', 1);
            });
            _this.on('legendClick.funnel', function (nameList) {
                var series = legendClickSeries(_this.config.series, nameList);
                var animationConfig = _this.config.animation;
                _this.init(_this.series, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger == 'axis') return;//未开启tooltip
            var _this = this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;

            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                _this.funnelSection.on('mousemove.funnel', function (data) {
                    var event = d3.event;
                    var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                    var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;

                    var title = "<p>" + data._serie.name + "</p>";
                    tooltip.setTooltipHtml(title + formatter(data.name, data.value, (data.percentage * 100).toFixed(1)));
                    tooltip.setPosition([x, y]);
                });

                _this.funnelSection.on('mouseenter.funnel', function (data) {
                    d3.select(this).attr('opacity', data._serie.itemStyle.opacity);
                    tooltip.showTooltip();
                })

                _this.funnelSection.on('mouseleave.funnel', function () {
                    d3.select(this).attr('opacity', 1);
                    tooltip.hiddenTooltip();
                });
            }
        }
    });


    function legendClickSeries(series, nameList) {
        series.forEach(function (serie) {

            if (serie.type != 'funnel') return;

            serie.data.forEach(function (d) {
                if (inNameList(d.name, nameList)) d.show = true;
                else d.show = false;
            })
        })
        return series;
    }

    function inNameList(name, nameList) {
        for (var i = 0, n; n = nameList[i++];) {
            if (name == n)
                return true;
        }
        return false;
    }

    function buildFunnelPath(pathArr) {
        var dStr = 'M';
        dStr += pathArr[0];
        dStr += 'L' + pathArr[1];
        dStr += 'L' + pathArr[2];
        dStr += 'L' + pathArr[3];
        return dStr;
    }

    function parseSeries(series, that) {
        var funnelSeries = []
        for (var i = 0, s; s = series[i++];) {
            //第一步判断是否是漏斗图
            if (s.type != 'funnel') return;
            s = utils.merage(defaultConfig(), s);
            calcWidth(s, that);
            calcPosition(s, that);
            s.funnelPath = funnelPath(s);
            s.data.forEach(function (d, idx) {
                d.idx = d.idx == null ? idx : d.idx;
                d._serie = s;
                d.pathArr = s.funnelPath(idx);

                //计算label的位置
                var labelX = (d.pathArr[0][0] + d.pathArr[1][0]) / 2;
                var labelY = (d.pathArr[0][1] + d.pathArr[2][1]) / 2;
                d.labelPosition = [labelX, labelY];
                //计算label线的长度
                d.labelWidth = d.sectionWidth / 2 + 30;//30是突出多少
            });

            funnelSeries.push(s);
        }
        return funnelSeries;
    }


    function funnelPath(serie) {
        var width = serie.width, height = serie.height, data = serie.data, sort = serie.sort;
        //塔尖向下，从大到小排序，塔尖向上，从小到大排序
        data.sort(function (a, b) {
            var ret = a.value - b.value;
            if (sort == 'top') {
                return ret;
            } else {
                return -ret;
            }
        });
        //计算还有多少区块需要显示
        var length = data.length, maxValue = -Infinity;
        data.forEach(function (d) {
            if (d.show == false) length--;
            maxValue = d3.max([maxValue, parseFloat(d.value)])
        });
        var sectionHeight = height / length;//每个区块的高度
        //计算每个data对应的起点和终点
        var index = sort == 'top' ? 1 : 0,//如果是塔尖向上，则第一个变量的y坐标不是0，而是一个sectionHeigth的高度,该变量是用来计算区块y坐标
            position = [];
        data.forEach(function (d, i) {
            d.maxValue = maxValue;
            d.percentage = parseFloat(d.value) / maxValue;
            if (d.show == false) {
                position[i] = undefined;
                return
            }
            ;
            var sectionWidth = d.percentage * width;
            d.sectionWidth = sectionWidth;
            var xOffset = (width - sectionWidth) / 2;
            position[i] = [];
            position[i][0] = [xOffset, sectionHeight * index];
            position[i][1] = [xOffset + sectionWidth, sectionHeight * index];
            index++;
        });

        //保证每个区块是由四个点组成，所以塔尖需要两个重复的点
        if (sort == 'top') {
            var topP = [width / 2, 0];
            position.unshift([topP, topP]);
        } else {
            var bottomP = [width / 2, sectionHeight * index];
            position.push([bottomP, bottomP]);
        }
        //在第一次计算区块坐标时会导致show=false的position位置为undefined，这里根据塔尖方向的不同进行补全
        //主要是为了动画效果,show=false的时候，只是区块高度为0，并不代表没有这个区块
        for (var i = 0, len = position.length; i < len; i++) {
            var p = position[i];
            if (p != undefined) continue;
            var j = 1;
            //防止偏移后还是undefined
            while (position[i] === undefined) {
                if (sort == 'top')
                    position[i] = position[i - j];
                else
                    position[i] = position[i + j];

                j++;
            }

        }
        return function (idx) {
            //传入一个区块index，获取区块的4个点，依次是左上，又上，右下，左下
            if (idx < 0 || idx >= data.length) {
                console.error('内部代码错误,漏斗图获取区块%d，最大值为%d', idx, data.length);
            }
            var pathPoints = [];
            pathPoints[0] = position[idx][0], pathPoints[1] = position[idx][1];
            pathPoints[2] = position[idx + 1][1], pathPoints[3] = position[idx + 1][0];
            return pathPoints;
        }
    }

    /**
     * 计算每个漏斗图的宽高
     * @param serie
     * @param that
     */
    function calcWidth(serie, that) {
        var width = that.width, heigth = that.height, size = serie.size;
        var fw = size[0];
        if (typeof fw == 'string') {
            if (fw.substr(-1) === '%') {
                var percent = parseFloat(fw) / 100;
                fw = percent * width;
            } else if (fw.substr(-2) == 'px') {
                fw = parseFloat(fw);
            } else {
                fw = parseFloat(fw);
                if (isNaN(fw)) console.error("name:" + serie.name + " size[0] not support");
            }
        } else if (typeof  fw != 'number') {
            console.error("name:" + serie.name + " size[0] not support");
        }

        var fh = size[1];

        if (typeof fh == 'string') {
            if (fh.substr(-1) === '%') {
                var percent = parseFloat(fh) / 100;
                fh = percent * heigth;
            } else if (fh.substr(-2) == 'px') {
                fh = parseFloat(fh);
            } else {
                fh = parseFloat(fh);
                if (isNaN(fh)) console.error("name:" + serie.name + " size[1] not support");
            }
        } else if (typeof  fh != 'number') {
            console.error("name:" + serie.name + " size[1] not support");
        }
        serie.width = fw;
        serie.height = fh;
    }

    /**
     * 计算漏斗图的起始位置
     * @param series
     * @param that
     */
    function calcPosition(serie, that) {
        var width = that.width, height = that.height, x = serie.x, y = serie.y;
        var xOffset = 0, yOffset = 0;
        if (x == 'center') {
            xOffset = (width - serie.width) / 2;
        }
        else if (x == 'right') {
            xOffset = (width - serie.width);
        }
        else if (x.substr(-1) == '%') {
            xOffset = parseFloat(x) / 100 * width;
        } else {
            x = parseFloat(x);
            if (isNaN(x)) console.error("name:" + serie.name + " serie.x not support")
            else xOffset = x;
        }

        if (y == 'middle') {
            yOffset = (height - serie.height) / 2;
        }
        else if ('y' == 'bottom') {
            yOffset = (height - serie.height);
        }
        else if (y.substr(-1) == '%') {
            yOffset = parseFloat(y) / 100 * height;
        } else {
            y = parseFloat(y);
            if (isNaN(y)) console.error("name:" + serie.name + " serie.y not support")
            else yOffset = y;
        }
        serie.xOffset = xOffset;
        serie.yOffset = yOffset;
    }

    funnel.defaultFormatter = defaultFormatter;
    function defaultFormatter(name, value, percentage) {
        return '<p>' + name + ':&nbsp;' + value + ' 占比:' + percentage + '%</p>';
    }

    function defaultConfig() {
        /**
         * @var funnel
         * @type Object
         * @extends xCharts.series
         * @description 漏斗图配置项
         */
        var funnel = {
            /**
             * @var name
             * @type String
             * @extends xCharts.series.funnel
             * @description 漏斗图代表的名字
             */
            name: '漏斗图',
            /**
             * @var type
             * @type String
             * @extends xCharts.series.funnel
             * @default funnel
             * @description 漏斗图指定类型
             */
            type: 'funnel',
            /**
             * @var sort
             * @type String
             * @values 'top'|'down'
             * @default 'down'
             * @description 漏斗图尖角朝向
             * @extends xCharts.series.funnel
             */
            sort: 'down',
            /**
             * @var size
             * @extends xCharts.series.funnel
             * @type Array
             * @description 漏斗图大小
             * @description 可以为百分比，也可以为具体数字，默认单位px
             * @default ['50%', '50%']
             * @example
             *  size:['50%','50%']//百分比
             *  size:[500,'300']//固定宽高
             */
            size: ['50%', '50%'],
            /**
             *  @var x
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'left'|'right'|'center'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在x轴方向的偏移量
             */
            x: 'center',
            /**
             *  @var y
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'top'|'middle'|'bottom'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在y轴方向的偏移量
             */
            y: 'middle',
            /**
             * @var data
             * @type Array
             * @extends xCharts.series.funnel
             * @description 一个装有漏斗图数据的二维数组
             * @example
             *   [
             *      {name: '腾讯', value: '80'},
             *      {name: '百度', value: '100'},
             *      {name: '阿里巴巴', value: '60'},
             *      {name: '京东', value: '40'},
             *      {name: '淘宝', value: '20'},
             *   ]
             */
            data: [],
            /**
             * @var formatter
             * @extends xCharts.series.funnel
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,x,y) {
             *      return '<p>'+name + ':&nbsp;' + value+' 占比:'+percentage+'%</p>';
             *  }
             */
            //formatter:function(){},
            /**
             * @var itemStyle
             * @extends xCharts.series.funnel
             * @type Object
             * @description 每个漏斗图区块的样式
             */
            itemStyle: {
                /**
                 * @var opacity
                 * @extends xCharts.series.funnel.itemStyle
                 * @type Number
                 * @values 0-1
                 * @description 鼠标移入时，变化的透明度
                 * @default 0.5
                 */
                opacity: 0.5
            }
        }
        return funnel;
    }

}(xCharts, d3));
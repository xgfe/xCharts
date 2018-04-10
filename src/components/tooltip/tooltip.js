/**
 * components.tooltip
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(tooltip, Component);

    //继承方法
    components.extend({tooltip: tooltip});

    function tooltip(messageCenter, config, type) {

        //show=false时不做显示处理
        if (config.tooltip.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承属性
        Component.call(this, messageCenter, config, type);
    }

    tooltip.prototype.extend = xCharts.extend;

    // 扩展自己独有的方法
    tooltip.prototype.extend({
        init: function (messageCenter, config) {
            this.originalWidth = messageCenter.originalWidth;
            this.originalHeight = messageCenter.originalHeight;
            this.xAxisScale = messageCenter.xAxisScale;
            this.axisX = null;
            this.axisY = null;
            this.tooltipWidth = null;
            this.tooltipHeight = null;

            // tooltip显示一级开关
            // 设置为false，不论任何情况下都会不显示tooltip，主要是为了当图表没有显示的数据后强制不显示tooltip
            this.display = true;

            // tooltip显示二级开关
            // 当前tooltip框状态
            this.tooltipShow = false;


            //没有x轴，多x轴，x轴type==value 将会改成item触发方式
            if (!this.config.xAxis || this.config.xAxis.length > 1 || this.config.xAxis[0].type == 'value') this.config.tooltip.trigger = 'item';
            this.tooltipConfig = utils.merage(defaultConfig(), config.tooltip);
            config.tooltip = this.tooltipConfig;

        },
        render: function () {

            /**
             * 就是添加一个div框
             * @type {render}
             * @private
             */

            this.tooltip = this.div.append('div')
                .attr('class', 'xc-tooltip')
        },
        ready: function () {
            var _this = this;

            //触发方式为item时，交给各个chart自己处理去,这里只负责axis触发方式
            if (_this.tooltipConfig.trigger !== 'axis') return;


            //这里是为了当没有任何需要显示的值时，能保证tooltip不出现
            _this.on('tooltipNone', function () {
                _this.display = false;
            });
            _this.on('tooltipShow', function () {
                _this.display = true;
            });

            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                _this.div.on('mousemove.tooltip', tooltipMousemove(_this));
                _this.div.on('mouseleave.tooltip', function () {
                    _this.hiddenTooltip();//鼠标过快划出，单纯监听mousemove很容易造成隐藏失败，这里加重保险
                });
            }

            this.on('brushChange.tooltip', function (domain) {
                _this.brushDomain = domain;
            });

        },
        refresh: function () {
            /**
             * 只需重置图表位置，重新进行绑定事件
             * 并不需要重新render
             */
            if (!this._show) return true;
            this.hiddenTooltip();
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.ready();
        },
        updateSeries: function () {
        },
        showTooltip: function () {
            var _this = this;
            _this.tooltipShow = true;
            _this.tooltip.style('visibility', 'visible');
            // 显示线条
            if (this.tooltipConfig.trigger === 'axis') _this.axisLine.attr('opacity', 1);

        },
        hiddenTooltip: function () {
            var _this = this;
            _this.fire('tooltipHidden');
            _this.tooltipShow = false;

            // 隐藏方框
            _this.tooltip.style('visibility', 'hidden');

            // 隐藏线条
            if (this.tooltipConfig.trigger === 'axis' && _this.axisLine) _this.axisLine.attr('opacity', 0);
            _this.main.selectAll('.xc-tooltip-line').attr('opacity', 0);
        },
        setPosition: function (position, offsetX, offsetY) {
            var _this = this;
            if (!_this.tooltipShow) return;//tooltip处于未显示状态，不做任何处理

            offsetX = offsetX || 5, offsetY = offsetY || 5;

            // 计算一次tooltip的宽高
            // if (!_this.tooltipWidth) {
                _this.tooltipWidth = _this.tooltip.node().clientWidth;
                _this.tooltipWidth = parseFloat(_this.tooltipWidth);
                _this.tooltipHeight = _this.tooltip.node().clientHeight;
                _this.tooltipHeight = parseFloat(_this.tooltipHeight);
            // }

            var tooltipWidth = _this.tooltipWidth,
                tooltipHeight = _this.tooltipHeight,
                width = _this.originalWidth,
                height = _this.originalHeight,
                tooltipX = position[0], tooltipY = position[1];


            //tooltip当前位置超出div最大宽度,强制往左边走
            if (tooltipX + tooltipWidth > width) {
                tooltipX = tooltipX - tooltipWidth - offsetX;
                tooltipX = tooltipX < 0 ? 0 : tooltipX;
            } else {
                tooltipX += offsetX;
            }
            if (tooltipY + tooltipHeight > height) {
                tooltipY = height - tooltipHeight - offsetY;
            } else {
                tooltipY += offsetY;
            }

            // 当tooltip高度 已经大于整个svg高度时,直接保持居中
            if (tooltipHeight > height) {
                tooltipY = (tooltipHeight - height) / 2;
            }


            _this.tooltip.style('transform', "translate(" + tooltipX + "px," + tooltipY + "px)")

        },
        setTooltipHtml: function (html) {
            this.tooltip.html(html);
        }
    });

    // 暴露给mobile的方法
    tooltip.tooltipMousemove = tooltipMousemove;

    /**
     * 判断鼠标是否出界
     * @param mouseX 鼠标X
     * @param mouseY 鼠标Y
     * @return {boolean} 是否出界
     */
    function judgeOutOfBounds(mouseX, mouseY) {
        var axisX = this.axisX,
            axisY = this.axisY;

        return mouseX < axisX[0] ||
            mouseX > axisX[1] ||
            mouseY < axisY[0] ||
            mouseY > axisY[1];
    }

    /**
     * 添加竖线
     */
    function appendTooltipLine() {
        // 添加一根竖线
        var axisLine = this.main.selectAll('.xc-tooltip-line')
            .data([this]);
        axisLine = axisLine.enter().append('line')
            .attr('class', 'xc-tooltip-line')
            .attr('stroke', this.tooltipConfig.lineColor)
            .attr('stroke-width', this.tooltipConfig.lineWidth)
            .attr('opacity', 0)
            .merge(axisLine);

        return axisLine;
    }

    /**
     * 计算图表边界
     * @param _this
     */
    function calcChartBorder(_this) {

        _this.axisX = [];
        _this.axisX[0] = _this.margin.left;
        _this.axisX[1] = _this.originalWidth - _this.margin.right;


        _this.axisY = [];
        _this.axisY[0] = _this.margin.top;
        _this.axisY[1] = _this.originalHeight - _this.margin.bottom;

    }

    /**
     * 监听鼠标移动
     */
    function tooltipMousemove(_this) {
        // 保存前一个tooltip所在的区域，用于判断当前tooltip是否需要刷新位置
        var oldSectionNumber = -1;
        var firstMove = true;
        var tooltipX = -1;
        return function () {
            // 一级开关关闭，强制不显示，即使鼠标在正常的范围内
            if (_this.display === false) return;

            // 只需第一次移动时计算边界即可
            if (firstMove) {
                firstMove = false;
                calcChartBorder(_this);
                _this.axisLine = appendTooltipLine.call(_this);
            }


            // 获取当前鼠标坐标
            var position = d3.mouse(this),
                mouseX = position[0],
                mouseY = position[1],
                axisLine = _this.axisLine;


            if (judgeOutOfBounds.call(_this, mouseX, mouseY)) {
                //超出边界，隐藏tooltip
                _this.hiddenTooltip();
                return;
            } else if (!_this.tooltipShow) {
                _this.showTooltip();
            }


            var xScale = _this.messageCenter.xAxisScale[0],
                xAxisData = _this.config.xAxis[0].data,

            // TODO 有结束绘制事件后，只需计算一次
                width = _this.originalWidth - _this.margin.left - _this.margin.right,
                height = _this.originalHeight - _this.margin.top - _this.margin.bottom;

            var sectionObj = getSectionLength.call(_this, xAxisData);

            var sectionLength = sectionObj.length - 1;

            if (_this.messageCenter.xAxisScale[0].scaleType === 'barCategory') {
                sectionLength++;
            }

            var sectionWidth = width / sectionLength; //计算每个区域的宽度,注意这里是均分
            var sectionNumber = 0; //得到在哪个区域，从0开始
            if (_this.messageCenter.xAxisScale[0].scaleType === 'barCategory') {
                sectionNumber = Math.floor((mouseX - _this.margin.left) / sectionWidth);
            } else {
                sectionNumber = Math.round((mouseX - _this.margin.left) / sectionWidth);
            }

            sectionNumber += sectionObj.offset;

            if (sectionNumber !== oldSectionNumber || _this.messageCenter.lengendChange ) {

                // tooltip已经响应过legend改变,不需要重复响应
                _this.messageCenter.lengendChange = false;

                //触发tooltipSectionChange事件，获取文本
                var tooltipHtml = "";

                _this.fire("tooltipSectionChange", sectionNumber, function (html) {
                    tooltipHtml += html;
                    _this.setTooltipHtml(tooltipHtml);
                }, _this.tooltipConfig.formatter);

                //如果是柱状图的话，需要使用bar上提供的接口来获取x坐标
                if (_this.messageCenter.charts['bar'] || _this.config.xAxis[0].middleBand) {
                    tooltipX = adjustTooltipX(xScale, sectionNumber);
                } else {
                    tooltipX = xScale(xAxisData[sectionNumber]);
                }

                axisLine.attr('x1', tooltipX).attr('x2', tooltipX).attr('y1', 0).attr('y2', height);
                tooltipX += _this.margin.left;//修正tooltip的位置

                oldSectionNumber = sectionNumber;
            }

            _this.setPosition([tooltipX, mouseY]);
        }
    }

    // 柱状图或者x轴的middleBand==true的折线图，tooltip的x轴需要重新计算
    function adjustTooltipX(xScale, sectionNumber) {
        var rangeBand = xScale.bandwidth(),
            rangeBandNum = xScale.domain().length,
            xRange = xScale.range();
        var outPadding = (xRange[1] - xRange[0] - rangeBand * rangeBandNum) / 2;
        return xRange[0] + outPadding + sectionNumber * rangeBand + rangeBand / 2;
    }

    function getSectionLength(data) {

        if (this.messageCenter.brush !== true) {
            return {
                length: data.length,
                offset: 0
            }
        }

        var domain = this.brushDomain || [0, 1];
        var minData = data[0];
        var maxData = data[data.length - 1];

        var extent = [
            (maxData - minData) * domain[0] + minData,
            (maxData - minData) * domain[1] + minData
        ];
        var length = 0, offset;
        for (var i = 0; i < data.length; i++) {
            if (data[i] <= extent[1] && data[i] >= extent[0]) {
                length++;

                if (offset === undefined) {
                    offset = i;
                }
            }

        }

        return {
            length: length,
            offset: offset
        };
    }

    function defaultConfig() {
        /**
         * @var tooltip
         * @type Object
         * @extends xCharts
         * @description 控制提示框
         */
        var tooltip = {
            /**
             * @var show
             * @extends xCharts.tooltip
             * @description 是否显示tooltip提示框
             * @type Boolean
             * @default true
             */
            show: true,
            /**
             * @var trigger
             * @extends xCharts.tooltip
             * @type String
             * @values 'axis'|'item'
             * @default 'item'
             * @description 触发方式,'axis'只对单x轴有效
             */
            trigger: 'axis',
            /**
             * @var formatter
             * @extends xCharts.tooltip
             * @type Function
             * @description 格式化函数，如果在各项series里面定义了formatter会覆盖此函数
             * @default 请查看各个series里面的格式化函数
             */
            //formatter: function (name,data,index) {
            //    return name+':&nbsp;'+data;
            //},
            /**
             * @var lineColor
             * @extends xCharts.tooltip
             * @type String
             * @default '#008ACD'
             * @description 在trigger='axis'时有效
             * @description 竖直线的颜色
             */
            lineColor: '#CCC',
            /**
             * @var lineWidth
             * @extends xCharts.tooltip
             * @type Number
             * @default 2
             * @description 在trigger='axis'时有效
             * @description 竖直线的宽度
             */
            lineWidth: 2
        };
        return tooltip;
    }
}(xCharts, d3));
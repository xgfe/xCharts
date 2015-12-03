/**
 * components.tooltip
 */

(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    utils.inherits(tooltip, xCharts.components['Component']);
    xCharts.components.extend({tooltip: tooltip})

    function tooltip(messageCenter, config, type) {
        if(!config.tooltip.show) return;//show=false 直接结束处理
        xCharts.components['Component'].call(this, messageCenter, config, type);
    }

    tooltip.prototype.extend = xCharts.extend;
    tooltip.prototype.extend({
        init: function (messageCenter, config, type, series) {
            this.originalWidth = messageCenter.originalWidth;
            this.originalHeight = messageCenter.originalHeight;
            this.xAxisScale = messageCenter.xAxisScale;
            this.axisX = null;
            this.axisY = null;
            this.tooltipWidth = null;
            this.tooltipHeight = null;
            this.tooltipShow=false;
            this.display=true;
            //没有x轴，多x轴，x轴type==value 将会改成item触发方式
            if(!this.config.xAxis|| this.config.xAxis.length>1|| this.config.xAxis[0].type=='value') this.config.tooltip.trigger='item';
            this.tooltipConfig = utils.merage(defaultConfig(), config.tooltip);

        },
        render: function (ease, time) {
            var _this = this;
            _this.tooltip = _this.div.append('div').attr('class', 'xc-tooltip');
        },
        ready: function () {
            var _this = this;

            if(_this.tooltipConfig.trigger!=='axis') return; //触发方式为item时，交给各个chart自己处理去
            var oldSectionNumber=-1;
            _this.div.on('mousemove.tooltip', function () {
                if(_this.display===false) return; //没有显示的东西了

                if (!_this.axisX) {
                    _this.axisX = [];
                    _this.axisX[0] = _this.margin.left;
                    _this.axisX[1] = _this.originalWidth - _this.margin.right;
                }
                if (!_this.axisY) {
                    _this.axisY = [];
                    _this.axisY[0] = _this.margin.top;
                    _this.axisY[1] = _this.originalHeight - _this.margin.bottom;
                }
                var axisX = _this.axisX, axisY = _this.axisY,position=d3.mouse(this),x=position[0],y=position[1];
                var axisLine = _this.main.selectAll('.xc-tooltip-line').data([_this]);
                axisLine.enter().append('line').attr('class', 'xc-tooltip-line').attr('stroke', _this.tooltipConfig.lineColor).attr('stroke-width', _this.tooltipConfig.lineWidth).attr('opacity', 0);

                if (x < axisX[0] || x > axisX[1] || y < axisY[0] || y > axisY[1]) {
                    //超出边界，隐藏tooltip
                    _this.hidden();
                    //隐藏line
                    axisLine.attr('opacity',0);
                    return;
                }else if(!_this.tooltipShow){
                    _this.show();
                }


                var xScale = _this.messageCenter.xAxisScale[0],
                    xAxisData = _this.config.xAxis[0].data,
                    width=_this.originalWidth-_this.margin.left-_this.margin.right,
                    height=_this.originalHeight-_this.margin.top-_this.margin.bottom,
                    sectionLength=xAxisData.length-1,
                    everySectionWidth=width/sectionLength;
                var sectionNumber = Math.round( (x-_this.margin.left)/everySectionWidth );//得到在哪个区域，从0开始


                if(sectionNumber!==oldSectionNumber){
                    //触发tooltipSectionChange事件，获取文本
                    _this.tooltip.html("");
                    _this.fire("tooltipSectionChange",sectionNumber,function(html){
                        var _html = _this.tooltip.html();
                        _this.tooltip.html(_html+html);
                    },_this.tooltipConfig.formatter);

                    oldSectionNumber=sectionNumber;
                }


                x=xScale(xAxisData[sectionNumber]);
                axisLine.attr('x1',x).attr('x2',x).attr('y1',0).attr('y2',height).attr('opacity',1);
                x+=_this.margin.left;//修正tooltip的位置

                _this.setPosition([x,y])

            })

            //这里是为了当没有任何需要显示的值时，能保证tooltip不出现
            _this.on('tooltipNone',function(){
                _this.display=false;
            })
            _this.on('tooltipShow',function(){
                _this.display=true;
            })

        },
        refresh: function () {
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.ready();
        },
        updateSeries: function (series) {
        },
        show: function () {
            this.tooltip.style({visibility: 'visible'});
            var _this = this;
            _this.tooltipShow=true;
            this.div.on('mouseleave.tooltip', function () {
                _this.hidden();//鼠标过快划出，单纯监听mousemove很容易造成隐藏失败，这里加重保险
            })
        },
        hidden: function () {
            this.tooltipShow=false;
            this.tooltip.style({visibility: 'hidden'})
        },
        setPosition: function (position,offsetX,offsetY) {
            var _this = this,offsetX=offsetX||5,offsetY=offsetY||5;
            if(!_this.tooltipShow) return;//tooltip处于未显示状态，不做任何处理
            if (!_this.tooltipWidth) {
                _this.tooltipWidth = _this.tooltip.node().clientWidth;
                _this.tooltipWidth = parseFloat(_this.tooltipWidth);
            }
            if (!_this.tooltipHeight) {
                _this.tooltipHeight = _this.tooltip.node().clientHeight;
                _this.tooltipHeight = parseFloat(_this.tooltipHeight);
            }

            var tooltipWidth = _this.tooltipWidth,
                tooltipHeight = _this.tooltipHeight,
                width = _this.originalWidth,
                height = _this.originalHeight,
                x = position[0], y = position[1];


            //tooltip当前位置超出div最大宽度,强制往左边走
            if (x + tooltipWidth > width) {
                x = x - tooltipWidth - offsetX;
            } else {
                x += offsetX;
            }
            if (y + tooltipHeight > height) {
                y = y - tooltipHeight - offsetY;
            } else {
                y += offsetY;
            }

            _this.tooltip.style({transform: "translate(" + x + "px," + y + "px)"})

        },
        html:function(html){
            this.tooltip.html(html);
        }
    })

    function defaultConfig() {
        /**
         * @var tooltip
         * @type Object
         * @extends xCharts
         * @describtion 控制提示框
         */
        var tooltip = {
            /**
             * @var show
             * @extends xCharts.tooltip
             * @describtion 是否显示tooltip提示框
             * @type Boolean
             * @default false
             */
            show: false,
            /**
             * @var trigger
             * @extends xCharts.tooltip
             * @type String
             * @values 'axis'|'item'
             * @default 'item'
             * @describtion 触发方式,'axis'只对单x轴有效
             */
            trigger: 'axis',
            /**
             * @var formatter
             * @extends xCharts.tooltip
             * @type Function
             * @describtion 格式化函数，如果在各项series里面定义了formatter会覆盖此函数
             * @default 请查看各个series里面的格式化函数
             */
            //formatter: function (name,data) {
            //    return name+':&nbsp;'+data;
            //},
            /**
             * @var lineColor
             * @extends xCharts.tooltip
             * @type String
             * @default '#008ACD'
             * @describtion 在trigger='axis'时有效
             * @describtion 竖直线的颜色
             */
            lineColor: '#008ACD',
            /**
             * @var lineWidth
             * @extends xCharts.tooltip
             * @type Number
             * @default 2
             * @describtion 在trigger='axis'时有效
             * @describtion 竖直线的宽度
             */
            lineWidth: 2
        }
        return tooltip;
    }
}(window))
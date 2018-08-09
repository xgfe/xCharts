/**
 * Author liuyang46@meituan.com
 * Date 16/3/9
 * Describe
 */


(function(xCharts,d3){


    var utils = xCharts.utils;
    var components = xCharts.components;
    utils.inherits(resize, components['Component']);
    components.extend({resize: resize});

    var chartList={};

    d3.select(window).on('resize.refresh', function () {
        for(var k in chartList){
            if(chartList.hasOwnProperty(k)){
                chartList[k].resize(chartList, k);
            }
        }
    });

    function resize(messageCenter, config, type) {
        if(config.resize.enable) components['Component'].call(this, messageCenter, config, type);
    }

    resize.prototype.extend = xCharts.extend;

    resize.prototype.extend({
        init:function(messageCenter, config, type, series){
            this.config = utils.merage(defaultConfig(),config[type]);

            this.config.animationEase = utils.stringToD3Ease(this.config.animationEase);

            messageCenter.refreshAnimationEase = this.config.animationEase;
            messageCenter.refreshAnimationTime = this.config.animationTime;
        },
        ready:function(){

            // 绑定刷新事件
            d3.select(window)

            // 比动画时间多1S
            var _this = this,
                animationTime = _this.config.animationTime;


            var resizeFn = utils.debounce(function(chartList, k){
                _this.messageCenter.refresh(chartList, k);
            },animationTime+300,true);

            _this.resize = resizeFn;

            add(_this);

            _this.on("chartRemoveBind",function(){
                _this.unBind();
            })
        },
        unBind:function(){
            remove(this);
        },
        refresh:function(){},
        updateSeries:function(){}
    });

    function add(ctx){
        chartList[ctx.messageCenter.id] = ctx;
    }

    function remove(ctx){
        delete chartList[ctx.messageCenter.id];
    }

    function defaultConfig() {
        /**
         * @var resize
         * @type Object
         * @description 当容器改变时，是否自动刷新当前图表
         * @extends xCharts
         * @default true
         */
        var config = {
            /**
             * @var refresh
             * @type Boolean
             * @description 当容器改变时，是否自动刷新当前图表
             * @extends xCharts.resize
             * @default false
             */
            enable:false,
            /**
             * @var animationEase
             * @type String
             * @description 当容器改变时，刷新动画
             * @extends xCharts.resize
             * @default 'easeLinear'
             */
            animationEase:'easeLinear',
            /**
             * @var animationEase
             * @type Number
             * @description 当容器改变时，刷新动画时间,单位ms
             * @extends xCharts.resize
             * @default 300
             */
            animationTime:300
        }
        return config;
    }


}(xCharts,d3));
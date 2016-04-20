/**
 * Author liuyang46@meituan.com
 * Date 16/3/9
 * Describe
 */


(function(window){


    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    utils.inherits(resize, components['Component']);
    components.extend({resize: resize});

    var chartList={};

    d3.select(window).on('resize.refresh',function(){

        for(var k in chartList){
            if(chartList.hasOwnProperty(k)){

                try {
                    chartList[k].resize();
                } catch (error) {
                    // 在angular router切换时,会导致不能正常退出,
                    // 报错证明已经不存在页面当中,清除此chart
                    if(typeof error === 'string'){
                        delete chartList[k];
                    }else{
                        console.error(error.stack);
                    }
                }
            }
        }
    });

    function resize(messageCenter, config, type) {
        if(config.resize.enable) components['Component'].call(this, messageCenter, config, type);
    }

    resize.prototype.extend = xCharts.extend;

    resize.prototype.extend({
        init:function(messageCenter, config, type, series){
            this.config = utils.merage(defaultConfig,config[type]);
            messageCenter.refreshAnimationEase = this.config.animationEase;
            messageCenter.refreshAnimationTime = this.config.animationTime;
        },
        ready:function(){
            // 比动画时间多1S
            var _this = this,
                animationTime = _this.config.animationTime;


            var resizeFn = utils.throttle(function(){
                _this.messageCenter.refresh();
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

    /**
     * @var resize
     * @type Object
     * @description 当容器改变时，是否自动刷新当前图表
     * @extends xCharts
     * @default true
     */
    var defaultConfig = {
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
         * @default 'linear'
         */
        animationEase:'linear',
        /**
         * @var animationEase
         * @type Number
         * @description 当容器改变时，刷新动画时间,单位ms
         * @extends xCharts.resize
         * @default 300
         */
        animationTime:300
    }

}(window))
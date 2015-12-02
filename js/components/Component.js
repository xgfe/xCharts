/**
 * Created by liuyang on 15/10/27.
 */
(function(){

    function Component(messageCenter,config,type){
        this.messageCenter=messageCenter;
        this.config=config;
        this.type=type;
        this.main = messageCenter.main;
        this.margin=messageCenter.margin;
        this.svg=messageCenter.svg;
        this.div = messageCenter.div;
        //绘画三大周期
        this.init(messageCenter,config,type,this.config.series);//初始化
        this.render('linear',0);//第一次绘画
        this.ready();//绘画完成，绑定事件
    }

    Component.prototype={
        constructor:Component,
        init:function(messageCenter, config, type){
            //初始化
        },
        render:function(ease, durationTime){
            //绘制
        },
        ready:function(){
            //绑定事件
        },
        refresh:function(ease,time){
            //当容器改变时，刷新当前组件
            this.init(this.messageCenter,this.config,this.type,this.config.series);//初始化
            this.render('linear',0);//刷新
        },
        updateSeries:function(series){
            //加载新数据
            this.init(this.messageCenter,this.config,this.type,series);//重新初始化
            this.render('linear',0);//刷新
            this.ready();//绘画完成，重新绑定事件
        },
        on:function(){
            this.messageCenter.on.apply(this.messageCenter,arguments);
        },
        fire:function(){
            this.messageCenter.fire.apply(this.messageCenter,arguments);
        }
    }

    xCharts.components.extend({Component:Component});

}())
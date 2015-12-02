/**
 * Created by liuyang on 15/10/23.
 */
(function () {
    var utils = xCharts.utils;

    var toString = Object.prototype.toString;

    /**
     * isArguments之类的函数
     * @type {string[]}
     */
    var list = ['Arguments', 'Object', 'Array', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'];
    list.forEach(function (name) {
        utils['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    })
    /**
     * 类型返回函数
     * @param obj 判断对象
     * @returns {*} [object Xxxx];
     */
    utils['getType'] = function (obj) {
        var string = toString.call(obj);
        var type = string.match(/\[object\s(\w+?)\]/)[1];
        return type;
    };
    utils['copy'] = copy;
    utils['merage']=merage;
    utils['inherits']=inherits;
    utils['loop']=loop;
    utils['getColor']=getColor;
    /**
     * 复制函数
     * @param form 需要复制的对象
     * @param deep 是否深复制
     * @returns {*}
     */
    function copy(form, deep) {
        var type = utils.getType(form);
        if(type=="Object" || type=='Array'){
            var clone=type=='Object'?{}:[];
            var value;
            for(var k in form){
                if (form.hasOwnProperty(k)) {
                    value=form[k];
                    if(deep && ( utils.isObject(value)||utils.isArray(value) )){
                        clone[k]=arguments.callee(value,true);
                    }else{
                        clone[k]=form[k];
                    }
                }
            }
            return clone;
        }else{
            return form;
        }
    }

    /**
     * 合并函数
     * @param to 被合并对象
     * @param form 来源
     */
    function merage(to,form){
        var value;
        for (var k in form) {
            if (form.hasOwnProperty(k)) {
                value = form[k];
                if (utils.isObject(value)) {
                    to[k] =to[k]|| {};
                } else if (utils.isArray(value)) {
                    to[k] =to[k]|| [];
                }else{
                    //非数组和对象不处理
                    to[k]=form[k];
                    continue;
                }
                arguments.callee(to[k], form[k], true);
            }
        }
        return to;
    }

    //原型继承
    //TODO 修改覆盖
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;

        function F() {
            this.superClass=baseClazz.prototype;
        }

        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();

        clazz.constructor = clazz;
    }
    //内部迭代用，返回第一个参数
    function loop(arg){
        return arg;
    }

    /**
     * @var color
     * @extends xCharts
     * @type Array
     * @describtion 全局color数组，如果设置会覆盖默认的颜色配置，系统会循环从数组中取色
     * @example
     *  [
     * '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
     * '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
     * '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
     * '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
     * ]
     */
    function getColor(palette) {
        if (!palette) {
            palette = [
                '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
                '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
                '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
                '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
            ]

        }

        return function (idx) {
            return palette[idx % palette.length];
        }
    }

}())
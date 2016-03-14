$(document).ready(function() {
    // 设置在线编辑器
    var myCodeMirror = CodeMirror.fromTextArea(document.querySelector('#codeText'), {
        mode: 'javascript',
        lineNumbers: true,
        indentUnit: 4,
        showCursorWhenSelecting: true
    });
    // 设置全局变量option
    window.option = {};
    var chart = {};

    // 检测url的hash值，根据hash值加载不同的代码块
    if(location.hash != "") {
        var chartType = location.hash.substring(1);
        $.get({
            url: './optionjs/' + chartType + '.config',
            dataType: 'html',
            success: function(res) {
                myCodeMirror.doc.setValue(res);
                refresh();
                /*window.addEventListener('resize', resizeChart);*/
            }
        });
    }

    // 图表导航切换
    $('#chart-nav').on('click', function(event) {
        var target = $(event.target);
        if(target.hasClass('chartsType')) {
            // 点击的是图表大分类
            $('#chart-nav ul').addClass('close');
            target.siblings().removeClass('close');
        } else if(target.hasClass('chartLink')) {
            // 点击的是具体的图表链接
            if(target[0].href.split('#')[1] != location.hash.substring(1)) {
                $.get({
                    url: './optionjs/' + target[0].href.split('#')[1] + '.config',
                    dataType: 'html',
                    success: function(res) {
                        myCodeMirror.doc.setValue(res);
                        refresh();
                    }
                });
            }
        }
    });
    // 给“刷新”按钮绑定事件
    $('#refresh').on('click', function() {
        refresh();
    });

    // 图表刷新
    function refresh() {
        (new Function(myCodeMirror.doc.getValue()))();
        chart = xCharts(document.querySelector('#chartWrap'));
        chart.loadConfig(window.option);
    }
    // 图表重绘
    function resizeChart() {
        chart.refresh();
    }
});
$(document).ready(function() {
    var resData = [];
    $.get({
        url: './api.json',
        dataType: 'json',
        success: function(res) {
            // 转成方便处理成DOM的数据结构
            var tempObj;
            for(var i=0;i<res.length;i++) {
                tempObj = {};
                for(var j=0;j<res[i].length;j++) {
                    tempObj[res[i][j].type] = res[i][j].string;
                }
                tempObj.children = [];
                resData.push(tempObj);
            }
            // 找出配置间的从属关系
            var newData = [];
            for(var i=0;i<resData.length;i++) {
                if(resData[i].extends.lastIndexOf('.') == -1) {
                    newData.push(resData[i]);
                    resData.splice(i,1);
                    i--;
                }
            }
            findChildren(newData);
            console.log(newData);

            $('#apiNav')[0].appendChild(getAPINavDOM(newData));
            $('#apiNav .list-group-item .list-group').addClass('hidden');

            var docfrag = document.createDocumentFragment();

            appendChildrenToFather(newData, docfrag);

            $('#content')[0].appendChild(docfrag);
        }
    });



    $('#apiNav').on('click', function(event) {
        if($(event.target).hasClass('glyphicon')) {
            if($(event.target).hasClass('glyphicon-chevron-right')) {
                $(event.target).removeClass('glyphicon-chevron-right');
                $(event.target).addClass('glyphicon-chevron-down');
                $($(event.target).siblings()[1]).removeClass('hidden');
            } else if($(event.target).hasClass('glyphicon-chevron-down')) {
                $(event.target).removeClass('glyphicon-chevron-down');
                $(event.target).addClass('glyphicon-chevron-right');
                $($(event.target).siblings()[1]).addClass('hidden');
            }
        }
    });

    function getAPINavDOM(arr) {
        var docfrag = document.createDocumentFragment();
        var listGroup = $('<ul></ul>').addClass('list-group');
        for(var i=0;i<arr.length;i++) {
            var listGroupItem = $('<li></li>').addClass('list-group-item');
            if(arr[i].children.length) {
                listGroupItem.append($('<span></span>').addClass('glyphicon glyphicon-chevron-right'));
            } else {
                listGroupItem.append($('<span></span>').addClass('glyphicon glyphicon-asterisk invisible'));
            }
            listGroupItem.append($('<a></a>').text(arr[i].var).attr('href', '#' + arr[i].extends + '.' + arr[i].var));
            if(arr[i].children.length) {
                listGroupItem[0].appendChild(getAPINavDOM(arr[i].children));
            }
            listGroup.append(listGroupItem);
        }
        docfrag.appendChild(listGroup[0]);
        return docfrag;
    }

    // 递归寻找子节点
    function findChildren(arr) {
        for(var i=0;i<arr.length;i++) {
            for(var j=0;j<resData.length;j++) {
                if(resData[j].extends == arr[i].extends + '.' + arr[i].var) {
                    arr[i].children.push(resData[j]);
                    resData.splice(j,1);
                    j--;
                }
            }
            findChildren(arr[i].children);
        }
    }
    function appendChildrenToFather(arr, dom) {
        var panelBody;
        for(var i=0;i<arr.length;i++) {
            if(arr[i].children.length) {
                var panel = $('<div></div>').addClass('panel panel-default').attr('id', arr[i].extends + '.' + arr[i].var);
                var panelHeading = $('<div></div>').addClass('panel-heading');
                panelHeading.append($('<h4></h4>').text(arr[i].var));
                if(arr[i].type != undefined) {
                    var p = $('<p></p>').append($('<span></span>').addClass('label label-info').text('类型'))
                                        .append($('<span></span>').text(arr[i].type));
                    panelHeading.append(p);
                }
                if(arr[i].description != undefined) {
                    panelHeading.append($('<p></p>').text(arr[i].description));
                }
                panelBody = $('<div></div>').addClass('panel-body');
                appendChildrenToFather(arr[i].children, panelBody[0]);
                panel.append(panelHeading)
                     .append(panelBody);
                dom.appendChild(panel[0]);
            } else {
                panelBody = $('<div></div>').addClass('bs-callout bs-callout-info').attr('id', arr[i].extends + '.' + arr[i].var);
                if(i == 0) {
                    panelBody.addClass('m-t-0');
                }
                if(i == arr.length-1) {
                    panelBody.addClass('m-b-0');
                }
                panelBody.append($('<h4></h4>').addClass('m-t-0').text(arr[i].var));
                if(arr[i].type != undefined) {
                    var p = $('<p></p>').append($('<span></span>').addClass('label label-info').text('类型'))
                                        .append($('<span></span>').text(arr[i].type));
                    panelBody.append(p);
                }
                if(arr[i].values != undefined) {
                    var p = $('<p></p>').append($('<span></span>').addClass('label label-info').text('取值'))
                                        .append($('<span></span>').text(arr[i].values));
                    panelBody.append(p);
                }
                if(arr[i].default != undefined) {
                    var p = $('<p></p>').append($('<span></span>').addClass('label label-info').text('默认值'))
                                        .append($('<span></span>').text(arr[i].default));
                    panelBody.append(p);
                }
                if(arr[i].description != undefined) {
                    var p = $('<p></p>').text(arr[i].description);
                    panelBody.append(p);
                }
                if(arr[i].demo != undefined) {

                }
                if(arr[i].example != undefined) {
                    var p = $('<pre></pre>').addClass('m-b-0').text(arr[i].example);
                    panelBody.append(p);
                }
                dom.appendChild(panelBody[0]);
            }

        }
    }
});
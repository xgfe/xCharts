(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('xCharts',<%= amd %>, function(<%= param %>) {
            return (root.<%= namespace %> = factory(<%= param %>));
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(<%= cjs %>);
    } else {
        root.<%= namespace %> = factory(<%= global %>);
    }

}(this, function(<%= param %>) {
    <%= contents %>
    return <%= exports %>;
}));
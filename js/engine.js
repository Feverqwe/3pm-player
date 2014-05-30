var engine = {};
var _debug = false;
(function(){
    ['player','tags','lastfm','settings','files','context','notification','webui','cloud','playlist','hotkeys','wm'].forEach(function(module){
        var script_el = document.createElement('script');
        script_el.src = 'js/engine/e_'+module+'.js';
        document.head.appendChild(script_el);
    });
    var waiting = function() {
        setTimeout(function() {
            if (engine.wm !== undefined) {
                return player.boot();
            }
            waiting();
        }, 100);
    };
    waiting();
})();
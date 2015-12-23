/**
 * Created by jack on 2015/12/17.
 */


require.config({
    debug:true,
    paths:{
        template:"js/template.min.js",
        common:"js/common.js",
        leaflet:"js/leaflet/leaflet.js",
        tms:"js/plugins/tms/leaflet.ChineseTmsProviders.js"
    },
    shim:{
        common:{
            exports:"common"
        },
        leaflet:{
            exports:"leaflet"
        },
        tms:{
            exports:"tms",
            deps:["leaflet"]
        }
    }
});
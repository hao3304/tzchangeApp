/**
 * Created by jack on 2014/12/1.
 * 地图版
 */


var HD = HD || {};

HD.Graphic = Spine.Class.sub({
    /*地图初始化*/
    init: function (ele, options) {
        this.opts = this.extend(this.options, options);
        this.zoomAnimation = true;
        //this._initFont();
        //this._minZoom();
        this.map = L.map(ele, {
            center:this.opts.center,
            doubleClickZoom: false,
            zoomControl: true,
            attributionControl: false,
            zoom:this.opts.zoom,
            maxZoom: this.opts.maxZoom,
            minZoom: this.opts.minZoom,
            keyboard: this.opts.keyboard ? true : false
        });

        this.map.zoomControl.setPosition("bottomright");
        var attr = new L.control.attribution({prefix: ""}).addTo(this.map);
        /*图层集合*/
        this.layers = [];
        /*标签 静态和动态*/
        this.tags = new L.featureGroup().addTo(this.map);
        this.layers.push(this.tags);
        /*热区*/
        this.hotmap = new L.featureGroup().addTo(this.map);
        this.layers.push(this.hotmap);
        /*图片*/
        this.images = new L.LayerGroup().addTo(this.map);
        this.layers.push(this.images);
        /*填充图*/
        this.level = new L.featureGroup().addTo(this.map);
        this.layers.push(this.level);

        this.levelImages = new L.featureGroup().addTo(this.map);
        this.layers.push(this.levelImages);
        this.level.bringToFront();
        this.levelImages.bringToFront();
        this.tags.bringToFront();

        /*矢量图-线*/
        this.lines = new L.FeatureGroup().addTo(this.map);
        this.layers.push(this.lines);

        //this.map.on("zoomend", this.proxy(this._zoomEnd));
        //this.map.on("zoomstart", this.proxy(this._zoomStart));
        this.map.on("click", this.proxy(function (e) {
            this.opts.events.onClick({type: "map", target: e});
        }));
        this.map.on("dblclick", this.proxy(function (e) {
            this.opts.events.onDblClick({type: "map", target: e});
        }));
        this.map.on("mouseup", this.proxy(function (e) {
            this.opts.events.onMouseUp({type: "map", target: e});
        }));
        this.map.on("mousemove", this.proxy(function (e) {
            this.opts.events.onMouseMove({type: "map", target: e});
        }));
        this.map.on("mousedown", this.proxy(function (e) {
            this.opts.events.onMouseDown({type: "map", target: e});
        }));

        new L.circle([0, 0], 0.1, {weight: 0, color: "#DDDDDD", fillColor: "#DDDDDD"}).addTo(this.map);

        L.drawLocal.draw.handlers.rectangle.tooltip.start = "请点击并拖动绘制矩形";
        L.drawLocal.draw.handlers.simpleshape.tooltip.end = "松开鼠标停止绘制";
        L.drawLocal.draw.handlers.polygon = {
            tooltip: {
                start: '请点击开始绘制区域',
                cont: '点击继续绘制区域',
                end: '双击结束绘制区域'
            }
        };

        this.rectControl = new L.Draw.Rectangle(this.map);
        this.polygonControl = new L.Draw.Polygon(this.map);
        this.polylineControl = new L.Draw.Polyline(this.map);

        /*移动图片属性*/
        this.disX = null;
        this.disY = null;
        this.isMove = false;
    },
    /*清除图层*/
    clearLayers: function (target) {

        switch (target) {
            case "tags":
                this.tags.clearLayers();
                break;
            case "hotmap":
                this.hotmap.clearLayers();
                break;
            case "images":
                this.images.clearLayers();
                break;
            case "level":
                this.level.clearLayers();
                break;
            case "drawn":
                this.drawn.clearLayers();
                break;
            default :
            {
                for (var i in this.layers) {
                    this.layers[i].clearLayers();
                }
                if (this.tileLayer) {
                    this.map.removeLayer(this.tileLayer);
                }
                this.tileLayer = null;
            }
        }
    },
    /*添加更改底图*/
    addTile: function (tile) {
        var size = tile.size || 0.25;
        var zoom = this._fitZoom(tile.width, tile.height, size, tile.fit);
        this.map.setView([(tile.height * -1) * size / 2, tile.width * size / 2], zoom);
        if (!tile)return alert("未能找到指定图层，请查看数据！");

        this._initFont(tile.minfont);

        if (this.tileLayer)this.map.removeLayer(this.tileLayer);
        this.tileLayer = new L.ImageOverlay(this.opts.tilePath + tile.url, [[0, 0], [(tile.height * -1) * size, tile.width * size]]).addTo(this.map);
        this.tile = tile;
        //this.map.fitBounds(this.tileLayer._bounds);
        this.bgColor(tile.bgcolor);
        //this.map.setView(this.tileLayer._bounds.getCenter(),this._fitZoom(tile.width,tile.height,size,tile.fit));

        if (!this.opts.isEdit) {
            this.map.setMaxBounds(this.tileLayer._bounds);
        }
        this.tileLayer.bringToBack();

        this.tileLayer.edit = this.proxy(function (params) {
            this._updateTile(this.tileLayer, params);
        });
        return this.tileLayer;
    },
    _updateTile: function (tile, params) {
        params.bgcolor ? this.bgColor(params.bgcolor) : null;
        params.url ? tile.setUrl(params.url) : null;
        this._initFont(params.minfont);
    },
    extend: function (obj,target) {
        if(typeof target =="object"){
            for(var i in target){
                obj[i] = target[i];
            }
        }
        return obj;
    },
    /*根据级别改变字体大小*/
    _zoomEnd: function (e) {

        var zoom = e.target._zoom, container = e.target._container;
        container.style.fontSize = this.font[zoom].font + "px";
        this.tags.addTo(this.map);

    },
    _zoomStart: function (e) {
        if (!this.zoomAnimation) {
            this.map.removeLayer(this.tags);
        }
    },
    stopDraw: function () {
        this.rectControl.disable();
        this.polygonControl.disable();
        this.polylineControl.disable();
    },
    /*初始化字体*/
    _initFont: function (fs) {

        var font = [];
        var maxZoom = this.opts.maxZoom, f = fs || this.opts.minFont, s = this.opts.scale;

        for (var i = 0; i <= maxZoom; i++) {
            font.push({font: f <= 12 ? 12 : f});
            f = Math.round(f * s);
        }
//        font.reverse();
        this.font = font;
    },
    /*获取最小级别，根据字体小于12px*/
    _minZoom: function () {
        var minZoom = 0;
        for (var i in this.font) {
            if (this.font[i].font <= 12) {
                minZoom = parseInt(i) + 1;
            } else {
                return minZoom;
            }
        }
        return minZoom;
    },
    /*自定义缩放*/
    _CRS: function () {

        var r = this.opts.maxFontSize - this.opts.minFontSize;
        var p = r / this.opts.maxZoom, font = this.font, scale = this.opts.scale;
        return L.extend({}, L.CRS, {
            projection: L.Projection.LonLat,
            transformation: new L.Transformation(1, 0, -1, 0),
            scale: function (zoom) {
                return Math.pow(scale, zoom);
            }
        });
    },
    /*或者合适的级别，根据图片和屏幕大小*/
    _fitZoom: function (width, height, size, type) {

        if (type == "center")return this.options.maxZoom;
        var w = width * size, h = height * size;
        var zoom = this.opts.maxZoom, scale = this.opts.scale;
        var sh = $(this.map._container).height(), sw = $(this.map._container).width();

        for (var i = 0; i < this.opts.maxZoom; i++) {

            if (type == "width") {
                if (w / sw >= 0.9) {
                    return i;
                }
            } else if (type == "height") {
                if (h / sh >= 0.9) {
                    return i;
                }
            } else {
                if (w / sw > 1.5 || h / sh > 1.5) {
                    zoom = i;
                    return zoom - 2;
                }
            }

            w = w * scale;
            h = h * scale;
        }
        return zoom - 2;
    },
    /*将em 转成像素后 模拟tag成图片*/

    project: function () {

    },
    unproject: function (p) {
        var rep = this.map.unproject([p, p]);
        return Math.abs(rep.lat)
    },
    /**/
    bgColor: function (color) {
        if (color) {
            this.map._container.style.backgroundColor = color;
        }
    },
    options: {
        crs:L.CRS.EPSG3857,
        center:[30,120],
        isMap:false,
        isEdit: true,
        keyboard: true,
        minFont: 10,
        maxZoom: 16,
        minZoom: 0,
        zoom:10,
        size: 0.25,
        scale: 1.2,
        tilePath: "../tile/",
        events: {
            onClick: function () {
            },
            onDblClick: function () {
            },
            onSelected: function () {
            },
            onMouseDown: function () {
            },
            onMouseUp: function () {
            },
            onMouseMove: function () {
            },
            onZoomStart: function () {
            },
            onZoomEnd: function () {
            },
            onLevelCreate: function () {
            }
        }
    }
});

/*标签*/
HD.Graphic.include({

    /*添加标签*/
    /*tag = {target,html,className,latlng}*/
    addTag: function (tag, drag) {
        var h = $(tag.html).height() || 0, w = $(tag.html).width() || 0, size = null;
        if (h != 0 || w != 0) {
            size = [h, w]
        }
        var d = drag ? false : true;

        if (this.tile && this.tile.id == tag.target) {
            var divicon = new L.divIcon({
                html: tag.html,
                className: "font_adjust",
                iconSize: size
            });
            var marker = new L.marker(tag.latlng, {
                icon: divicon,
                draggable: d,
                zIndexOffset: tag.zindex || 0
            }).addTo(this.tags);
            marker.options.opts = tag;
            marker.on("click", this.proxy(function (e) {
                this.opts.events.onClick({type: "tag", target: e});
            }));

            marker.getLatlng = this.proxy(function () {

                return marker._latlng;
            });
            marker.edit = this.proxy(function (params) {
                this._updateTag(marker, params);
            });
            marker.del = this.proxy(function () {
                this._delTag(marker);
                marker.fire("tag:delete");
            });
            marker.hide = this.proxy(function () {
                this._delTag(marker);
                marker.fire("tag:hide");
            });
            marker.show = this.proxy(function () {
                marker.addTo(this.tags);
                marker.fire("tag:show");
            });

            return marker;
        } else {
            return;
        }
    },
    /*params{html,latlng}*/
    _updateTag: function (tag, params) {
        if (params.html) {
            var h = $(params.html).height() || 0, w = $(params.html).width() || 0, size = null;
            if (h != 0 || w != 0) {
                size = [h, w]
            }

            tag._map = this.map; //解决绍兴一个BUG

            tag.options.icon.options.html = params.html;
            tag.options.icon.options.iconSize = size;
            if(params.options){
                tag.setZIndexOffset(params.options.zindex ? parseInt(params.options.zindex) : 0);
            }
            tag._initIcon();
        }
        if (params.latlng) {
            tag.setLatLng(params.latlng);
        }
        return tag;
    },
    _delTag: function (tag) {
        this.tags.removeLayer(tag);
    }
    /*添加触发区域*/

});
/*图片*/
HD.Graphic.include({
    /*添加图片 jpg.gif.png*/
    /*image={target,height,width,latlng,url,draggable}*/
    addImage: function (image, type) {

        if (this.tile && this.tile.id == image.target) {
            var img = new L.imageOverlay(image.url, this._getImageBound(image.width, image.height, image.latlng), {opts: $.extend({type: type}, image)}).addTo(this.images);
            //img.bringToFront();
            $(img._image).on("click", this.proxy(function (e) {
                this.opts.events.onClick({type: "img", target: {target: img, originalEvent: e.originalEvent}});
                e.stopPropagation();
            }));

            img.getLatlng = this.proxy(function () {
                return img._bounds.getCenter();
            });
            img.edit = this.proxy(function (param) {
                this._updateImage(img, param);
            });
            img.del = this.proxy(function () {
                this._delImage(img);
            });
            img.hide = this.proxy(function () {
                this._delImage(img);
                //this.fire("image:hide");
            });
            img.show = this.proxy(function () {
                img.addTo(this.images);
                //this.fire("image:show");
            });
            img.dragging = {
                that: img,
                disable: function () {
                    $(this.that._image).unbind("mousedown mouseup mousemove");
                },
                enable: this.proxy(function () {
                    this._draggableImage(img);
                })
            };

            if (image.draggable) {
                this._draggableImage(img);
            }

            return img;
        }
    },
    _getImageBound: function (width, height, latlng) {
        /*        var p = {lat:height,lng:width};
         return [[latlng[1]||latlng.lat+ Math.abs(p.lat)/2,latlng[0]||latlng.lng+ Math.abs(p.lng/2)],[ latlng[1]||latlng.lat-Math.abs(p.lat/2),latlng[0]||latlng.lng-Math.abs(p.lng/2)]];*/
        var maxFont = this.font[this.map._zoom].font;
        var dw = parseFloat(width) * maxFont, dh = parseFloat(height) * maxFont;
        var ll = this.map.unproject([dw, dh]);
        return [[latlng[1] || latlng.lat, latlng[0] || latlng.lng], [latlng[1] || latlng.lat + ll.lat, latlng[0] || latlng.lng + ll.lng]];
    },
    _updateImage: function (image, param) {

        var latlng = image.getLatlng();
        var height = image._image.height, width = image._image.width;
        if (param && param.url) image.setUrl(param.url);
        if (param && param.width) width = param.width;
        if (param && param.height) height = param.height;

        image._bounds = new L.LatLngBounds(this._getImageBound(param.width, param.height, latlng));
        image._reset();
        return image;
    },
    _delImage: function (image) {
        this.images.removeLayer(image);
    },
    _draggableImage: function (img) {
        var $img = $(img._image);
        $img.on("mousedown", this.proxy(function (e) {
            this.isMove = true;
            this.disX = e.clientX;
            this.disY = e.clientY;
            e.stopPropagation();
            $img.on("mouseup", this.proxy(function () {
                this.isMove = false;
                $img.unbind("mouseup mousemove");
                e.stopPropagation();
            })).on("mousemove", this.proxy(
                function (e) {
                    if (!this.isMove)return;
                    var iL = e.clientX - this.disX;
                    var iT = e.clientY - this.disY;
                    var p = this.map.unproject([iL, iT], this.map._zoom);
                    img._bounds._northEast.lat += p.lat;
                    img._bounds._northEast.lng += p.lng;
                    img._bounds._southWest.lat += p.lat;
                    img._bounds._southWest.lng += p.lng;
                    img._reset();
                    this.disX = e.clientX;
                    this.disY = e.clientY;
                    e.stopPropagation();
                }
            ))
        }));
    }
});
/*液位*/
HD.Graphic.include({
    /*添加液位*/
    /*level = {target,width,height,latlng,minVal,maxVal,cVal,path:{stroke,color,weight,opacity,fill,fillColor...参考http://leafletjs.com/reference.html#path}}*/
    addLevel: function (level) {
        this.rectControl.enable.call(this.rectControl);
        this.map.off("draw:created").on("draw:created", this.proxy(function (e) {
            return this._addLevel(e.layer._latlngs, level);
        }));
    },
    addFill: function (latlngs, param) {
        return this._addLevel(latlngs, param);
    },
    _addLevel: function (latlngs, param) {

        var rectangle = new L.rectangle(latlngs, param).addTo(this.level);

        rectangle.options.bounds = rectangle.getBounds();
        rectangle.options.latlngs = this.clone(rectangle._latlngs);

        rectangle.on("click", this.proxy(function (e) {
            var p = this._LevelProject(rectangle.getBounds());
            e.target.options.height = Math.round(p.y);
            e.target.options.width = Math.round(p.x);
            e.target.options.center = rectangle.getBounds().getCenter();
            this.opts.events.onClick({type: "tag", target: e});
        }));
        rectangle.setValue = this.proxy(function (param) {
            this._updateLevel(rectangle, param);
        });
        rectangle.del = this.proxy(function () {
            this._delLevel(rectangle);
        });

        rectangle.edit = this.proxy(function (param) {
            this._editLevel(rectangle, param);
        });

        if (param.isEdit) {
            rectangle.editing.enable();
        }

        this.opts.events.onLevelCreate.call(rectangle, rectangle);

        this.map.fire("fill:created", rectangle);

        return rectangle;
    },
    _updateLevel: function (level, param) {
        $.extend(true, level.options, param);
        var dir = level.options.direction || "top";
        var bounds = this.clone(level.options.bounds), latlngs = this.clone(level.options.latlngs);
        var p = this._LevelProject(bounds);
        var maxVal = parseFloat(level.options.maxVal) || parseFloat(param.cVal), minVal = parseFloat(level.options.minVal) || 0, cVal = parseFloat(param.cVal) || 0;

        if (cVal > maxVal) {
            cVal = maxVal;
        }
        if (cVal < minVal) {
            cVal = minVal;
        }

        switch (dir) {
            case "top":
            {
                var len = (maxVal - cVal) / (maxVal - minVal) * (bounds._northEast.lat - bounds._southWest.lat);
                latlngs[1].lat = latlngs[1].lat - len;
                latlngs[2].lat = latlngs[2].lat - len;
            }
                break;
            case "bottom":
            {
                var len = (maxVal - cVal) / (maxVal - minVal) * (bounds._northEast.lat - bounds._southWest.lat);
                latlngs[3].lat = latlngs[3].lat + len;
                latlngs[0].lat = latlngs[0].lat + len;
            }
                break;
            case "left":
            {
                var len = (maxVal - cVal) / (maxVal - minVal) * (bounds._northEast.lng - bounds._southWest.lng);
                latlngs[1].lng = latlngs[1].lng + len;
                latlngs[0].lng = latlngs[0].lng + len;
            }
                break;
            case "right":
            {
                var len = (maxVal - cVal) / (maxVal - minVal) * (bounds._northEast.lng - bounds._southWest.lng);
                latlngs[2].lng = latlngs[2].lng - len;
                latlngs[3].lng = latlngs[3].lng - len;
            }
                break;
        }


        level.setLatLngs(latlngs);
    },
    _delLevel: function (level) {
        this.level.removeLayer(level);
    },
    _LevelProject: function (bounds) {
        var hl = bounds._southWest.lat - bounds._northEast.lat;
        var wl = bounds._northEast.lng - bounds._southWest.lng;
        return this.map.project([hl, wl], this.map._zoom);
    },
    _editLevel: function (p, param) {
        $.extend(true, p.options, param);
        p.setStyle(param);
    },
    clone: function (obj) {
        function Clone() {
        };
        Clone.prototype = obj;
        var o = new Clone();
        for (var a in o) {
            if (typeof o[a] == "object") {
                o[a] = this.clone(o[a]);
            }
        }
        return o;
    }

});
/*区域*/
HD.Graphic.include({
    addHotMap: function (param) {
        this.polygonControl.enable.call(this.polygonControl);
        this.map.off("draw:created").on("draw:created", this.proxy(function (e) {
            return this._addHotMap(e.layer._latlngs, param);
        }));
    },
    addPolygon: function (latlngs, param) {
        return this._addHotMap(latlngs, param);
    },
    _addHotMap: function (latlngs, param) {
        var def = {
            opacity: 1,
            fillOpacity: 1,
            color: "yellow",
            weight: 1,
            fillColor: "white",
            isEdit: true
        };
        param = $.extend(true, def, param);

        if (this.tile) {
            var p = new L.polygon(latlngs, param).addTo(this.hotmap);
            param.sn ? p.bindLabel(param.sn) : null;

            p.on("click", this.proxy(function (e) {
                this.opts.events.onClick({type: "hotmap", target: e});
            }));
            p.edit = this.proxy(function (param) {
                this._updateHotmap(p, param);
            });
            p.del = this.proxy(function () {
                this.hotmap.removeLayer(p);
            });

            this.map.fire("hotmap:created", p);

            if (param.isEdit) {
                p.editing.enable();
            } else {
                p._options = {opacity: p.options.opacity, fillOpacity: p.options.fillOpacity};
                p.on("mouseover", function (e) {

                    if ($(e.target._container).find("path")[0].className.animVal && $(e.target._container).find("path")[0].className.animVal.indexOf("Alarm") < 0) { //如果报警则不适用
                        e.target.setStyle({opacity: 0.9, fillOpacity: 0.9});
                    }

                }).on("mouseout", function (e) {
                    if ($(e.target._container).find("path")[0].className.animVal && $(e.target._container).find("path")[0].className.animVal.indexOf("Alarm") < 0) {
                        e.target.setStyle(e.target._options);
                    }
                });
            }
            return p;
        }
    },
    _updateHotmap: function (p, param) {
        $.extend(true, p.options, param);
        p.setStyle(param);
    }
});
/*管线*/
HD.Graphic.include({
    addLine: function (param) {
        this.polylineControl.enable.call(this.polylineControl);
        this.map.off("draw:created").on("draw:created", this.proxy(function (e) {
            this._addHotMap(e, param);
        }));
    },
    _addLine: function (line, param) {
        if (this.tile && this.tile.id == line.target) {
            var line = new L.polyline(line.latlngs, param).addTo(map);

            line.edit = this.proxy(function (param) {

            });
            line.del = this.proxy(function () {
                this.lines.removeLayer(line);
            });

            return line;
        }
    }
});
/*图片液位*/
HD.Graphic.include({
    /*添加图片 jpg.gif.png*/
    /*image={target,height,width,latlng,url,draggable}*/
    addLevelImage: function (image, type) {
        if (this.tile && this.tile.id == image.target) {
            var img = new L.imageOverlay(image.url, this._getLevelImageBound(image.width, image.height, image.latlng), {opts: $.extend({type: type}, image)}).addTo(this.levelImages);

            $(img._image).on("click", this.proxy(function (e) {
                this.opts.events.onClick({type: "img", target: {target: img, originalEvent: e.originalEvent}});
                e.stopPropagation();
            }));

            img.getLatlng = this.proxy(function () {
                return img._bounds.getCenter();
            });
            img.edit = this.proxy(function (param) {
                this._updateLevelImage(img, param);
            });
            img.setValue = this.proxy(function (param) {
                this._setValue(img, param);
            });
            img.del = this.proxy(function () {
                this._delLevelImage(img);
            });
            img.hide = this.proxy(function () {
                this._delLevelImage(img);
                //this.fire("image:hide");
            });
            img.show = this.proxy(function () {
                img.addTo(this.images);
                //this.fire("image:show");
            });
            img.dragging = {
                that: img,
                disable: function () {
                    $(this.that._image).unbind("mousedown mouseup mousemove");
                },
                enable: this.proxy(function () {
                    this._draggableImage(img);
                })
            };

            if (image.draggable) {
                this._draggableImage(img);
            }

            return img;
        }
    },
    _getLevelImageBound: function (width, height, latlng) {
        /*        var p = {lat:height,lng:width};
         return [[latlng[1]||latlng.lat+ Math.abs(p.lat)/2,latlng[0]||latlng.lng+ Math.abs(p.lng/2)],[ latlng[1]||latlng.lat-Math.abs(p.lat/2),latlng[0]||latlng.lng-Math.abs(p.lng/2)]];*/
        var maxFont = this.font[this.map._zoom].font;
        var dw = parseFloat(width) * maxFont, dh = parseFloat(height) * maxFont;
        var ll = this.map.unproject([dw, dh]);
        return [[latlng[1] || latlng.lat, latlng[0] || latlng.lng], [latlng[1] || latlng.lat + ll.lat, latlng[0] || latlng.lng + ll.lng]];
    },
    _updateLevelImage: function (image, param) {

        var latlng = image.getLatlng();
        var height = image._image.height, width = image._image.width;
        if (param && param.url) image.setUrl(param.url);
        if (param && param.width) width = param.width;
        if (param && param.height) height = param.height;

        image._bounds = new L.LatLngBounds(this._getLevelImageBound(param.width, param.height, latlng));
        image._reset();
        return image;
    },
    _setValue: function (image, param) {
        var options = image.options.opts;
        var maxVal = parseFloat(options.maxVal) || parseFloat(param.cVal), minVal = parseFloat(options.minVal) || 0, cVal = parseFloat(param.cVal) || 0;
        var length = parseFloat(options.moveLen) || parseFloat(options.height);
        if (cVal > maxVal) {
            cVal = maxVal;
        }
        if (cVal < minVal) {
            cVal = minVal;
        }
        var len = (cVal) / (maxVal - minVal) * (length);
        var ll = this.clone(options.latlng);
        ll.lat += len;
        image._bounds = new L.LatLngBounds(this._getLevelImageBound(options.width, options.height, ll));
        image._reset();
        return image;

    },
    _delLevelImage: function (image) {
        this.images.removeLayer(image);
    },
    _draggableLevelImage: function (img) {
        var $img = $(img._image);
        $img.on("mousedown", this.proxy(function (e) {
            this.isMove = true;
            this.disX = e.clientX;
            this.disY = e.clientY;
            e.stopPropagation();
            $img.on("mouseup", this.proxy(function () {
                this.isMove = false;
                $img.unbind("mouseup mousemove");
                e.stopPropagation();
            })).on("mousemove", this.proxy(
                function (e) {
                    if (!this.isMove)return;
                    var iL = e.clientX - this.disX;
                    var iT = e.clientY - this.disY;
                    var p = this.map.unproject([iL, iT], this.map._zoom);
                    img._bounds._northEast.lat += p.lat;
                    img._bounds._northEast.lng += p.lng;
                    img._bounds._southWest.lat += p.lat;
                    img._bounds._southWest.lng += p.lng;
                    img._reset();
                    this.disX = e.clientX;
                    this.disY = e.clientY;
                    e.stopPropagation();
                }
            ))
        }));
    }
});


HD.Method = Spine.Class.sub({});





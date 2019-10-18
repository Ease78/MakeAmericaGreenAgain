(function () {
  'use strict';

  /*
      The MIT License

      Copyright (c) 2011 Mike Chambers

      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:

      The above copyright notice and this permission notice shall be included in
      all copies or substantial portions of the Software.

      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
      THE SOFTWARE.
  */

  /*
  From https://github.com/jsmarkus/ExamplesByMesh/tree/master/JavaScript/QuadTree, slightly modified
  */


  /**
  * A QuadTree implementation in JavaScript, a 2d spatial subdivision algorithm.
  * @module QuadTree
  **/

  (function(window) {

  /****************** QuadTree ****************/

  /**
  * QuadTree data structure.
  * @class QuadTree
  * @constructor
  * @param {Object} An object representing the bounds of the top level of the QuadTree. The object
  * should contain the following properties : x, y, width, height
  * @param {Boolean} pointQuad Whether the QuadTree will contain points (true), or items with bounds
  * (width / height)(false). Default value is false.
  * @param {Number} maxDepth The maximum number of levels that the quadtree will create. Default is 4.
  * @param {Number} maxChildren The maximum number of children that a node can contain before it is split into sub-nodes.
  **/
  function QuadTree(bounds, pointQuad, maxDepth, maxChildren)
  {
      var node;
      if(pointQuad)
      {

          node = new Node(bounds, 0, maxDepth, maxChildren);
      }
      else
      {
          node = new BoundsNode(bounds, 0, maxDepth, maxChildren);
      }

      this.root = node;
  }

  /**
  * The root node of the QuadTree which covers the entire area being segmented.
  * @property root
  * @type Node
  **/
  QuadTree.prototype.root = null;


  /**
  * Inserts an item into the QuadTree.
  * @method insert
  * @param {Object|Array} item The item or Array of items to be inserted into the QuadTree. The item should expose x, y
  * properties that represents its position in 2D space.
  **/
  QuadTree.prototype.insert = function(item)
  {
      if(item instanceof Array)
      {
          var len = item.length;

          for(var i = 0; i < len; i++)
          {
              this.root.insert(item[i]);
          }
      }
      else
      {
          this.root.insert(item);
      }
  };

  /**
  * Clears all nodes and children from the QuadTree
  * @method clear
  **/
  QuadTree.prototype.clear = function()
  {
      this.root.clear();
  };

  /**
  * Retrieves all items / points in the same node as the specified item / point. If the specified item
  * overlaps the bounds of a node, then all children in both nodes will be returned.
  * @method retrieve
  * @param {Object} item An object representing a 2D coordinate point (with x, y properties), or a shape
  * with dimensions (x, y, width, height) properties.
  **/
  QuadTree.prototype.retrieve = function(item)
  {
      //get a copy of the array of items
      var out = this.root.retrieve(item).slice(0);
      //return QuadTree._filterResults(out, {x:item.x, y:item.y, width:0, height:0});
      return out;
  };

  QuadTree.prototype.retrieveInBounds = function (bounds)
  {
      var treeResult = this.root.retrieveInBounds(bounds);
      return QuadTree._filterResults(treeResult, bounds);
  };

  QuadTree._filterResults = function(treeResult, bounds)
  {
      var filteredResult = [];

      if(this.root instanceof BoundsNode)
      {
          for (var i=0; i < treeResult.length; i++)
          {
              var node = treeResult[i];
              if (QuadTree._isBoundOverlappingBound(node, bounds))
              {
                  filteredResult.push(node);
              }
          }
      }
      else
      {
          treeResult.forEach(function(node){
              if(QuadTree._isPointInsideBounds(node, bounds))
              {
                  filteredResult.push(node);
              }
          });
      }

      return filteredResult;
  };

  QuadTree._isPointInsideBounds = function (point, bounds)
  {
      return (
          (point.x >= bounds.x) &&
          (point.x <= bounds.x + bounds.width) &&
          (point.y >= bounds.y) &&
          (point.y <= bounds.y + bounds.height)
      );
  };


  QuadTree._isBoundOverlappingBound = function (b1, b2)
  {
      return !(
              b1.x > (b2.x + b2.width)  ||
              b2.x > (b1.x + b1.width)  ||
              b1.y > (b2.y + b2.height) ||
              b2.y > (b1.y + b1.height)
         );
  };

  /************** Node ********************/


  function Node(bounds, depth, maxDepth, maxChildren)
  {
      this._bounds = bounds;
      this.children = [];
      this.nodes = [];

      if(maxChildren)
      {
          this._maxChildren = maxChildren;

      }

      if(maxDepth)
      {
          this._maxDepth = maxDepth;
      }

      if(depth)
      {
          this._depth = depth;
      }
  }
  //subnodes
  Node.prototype.nodes = null;
  Node.prototype._classConstructor = Node;

  //children contained directly in the node
  Node.prototype.children = null;
  Node.prototype._bounds = null;

  //read only
  Node.prototype._depth = 0;

  Node.prototype._maxChildren = 4;
  Node.prototype._maxDepth = 4;

  Node.TOP_LEFT = 0;
  Node.TOP_RIGHT = 1;
  Node.BOTTOM_LEFT = 2;
  Node.BOTTOM_RIGHT = 3;


  Node.prototype.insert = function(item)
  {
      if(this.nodes.length)
      {
          var index = this._findIndex(item);

          this.nodes[index].insert(item);

          return;
      }

      this.children.push(item);

      var len = this.children.length;
      if(!(this._depth >= this._maxDepth) &&
          len > this._maxChildren)
      {
          this.subdivide();

          for(var i = 0; i < len; i++)
          {
              this.insert(this.children[i]);
          }

          this.children.length = 0;
      }
  };

  Node.prototype.retrieve = function(item)
  {
      if(this.nodes.length)
      {
          var index = this._findIndex(item);

          return this.nodes[index].retrieve(item);
      }

      return this.children;
  };

  Node.prototype.retrieveInBounds = function(bounds)
  {
      var result = [];

      if(this.collidesWith(bounds))
      {
          result = result.concat(this._stuckChildren);

          if(this.children.length)
          {
              result = result.concat(this.children);
          }
          else
          {
              if(this.nodes.length)
              {
                  for (var i = 0; i < this.nodes.length; i++)
                  {
                      result = result.concat(this.nodes[i].retrieveInBounds(bounds));
                  }
              }
          }
      }

      return result;
  };


  Node.prototype.collidesWith = function (bounds)
  {
      var b1 = this._bounds;
      var b2 = bounds;

      return !(
              b1.x > (b2.x + b2.width)  ||
              b2.x > (b1.x + b1.width)  ||
              b1.y > (b2.y + b2.height) ||
              b2.y > (b1.y + b1.height)
         );
  };

  Node.prototype._findIndex = function(item)
  {
      var b = this._bounds;
      var left = (item.x > b.x + b.width / 2)? false : true;
      var top = (item.y > b.y + b.height / 2)? false : true;

      //top left
      var index = Node.TOP_LEFT;
      if(left)
      {
          //left side
          if(!top)
          {
              //bottom left
              index = Node.BOTTOM_LEFT;
          }
      }
      else
      {
          //right side
          if(top)
          {
              //top right
              index = Node.TOP_RIGHT;
          }
          else
          {
              //bottom right
              index = Node.BOTTOM_RIGHT;
          }
      }

      return index;
  };


  Node.prototype.subdivide = function()
  {
      var depth = this._depth + 1;

      var bx = this._bounds.x;
      var by = this._bounds.y;

      //floor the values
      var b_w_h = (this._bounds.width / 2)|0;
      var b_h_h = (this._bounds.height / 2)|0;
      var bx_b_w_h = bx + b_w_h;
      var by_b_h_h = by + b_h_h;

      //top left
      this.nodes[Node.TOP_LEFT] = new this._classConstructor({
          x:bx,
          y:by,
          width:b_w_h,
          height:b_h_h
      },
      depth, this._maxDepth, this._maxChildren);

      //top right
      this.nodes[Node.TOP_RIGHT] = new this._classConstructor({
          x:bx_b_w_h,
          y:by,
          width:b_w_h,
          height:b_h_h
      },
      depth, this._maxDepth, this._maxChildren);

      //bottom left
      this.nodes[Node.BOTTOM_LEFT] = new this._classConstructor({
          x:bx,
          y:by_b_h_h,
          width:b_w_h,
          height:b_h_h
      },
      depth, this._maxDepth, this._maxChildren);


      //bottom right
      this.nodes[Node.BOTTOM_RIGHT] = new this._classConstructor({
          x:bx_b_w_h,
          y:by_b_h_h,
          width:b_w_h,
          height:b_h_h
      },
      depth, this._maxDepth, this._maxChildren);
  };

  Node.prototype.clear = function()
  {
      this.children.length = 0;

      var len = this.nodes.length;
      for(var i = 0; i < len; i++)
      {
          this.nodes[i].clear();
      }

      this.nodes.length = 0;
  };


  /******************** BoundsQuadTree ****************/

  function BoundsNode(bounds, depth, maxChildren, maxDepth)
  {
      Node.call(this, bounds, depth, maxChildren, maxDepth);
      this._stuckChildren = [];
  }

  BoundsNode.prototype = new Node();
  BoundsNode.prototype._classConstructor = BoundsNode;
  BoundsNode.prototype._stuckChildren = null;

  //we use this to collect and conctenate items being retrieved. This way
  //we dont have to continuously create new Array instances.
  //Note, when returned from QuadTree.retrieve, we then copy the array
  BoundsNode.prototype._out = [];

  BoundsNode.prototype.insert = function(item)
  {
      if(this.nodes.length)
      {
          var index = this._findIndex(item);
          var node = this.nodes[index];

          //todo: make _bounds bounds
          if(item.x >= node._bounds.x &&
              item.x + item.width <= node._bounds.x + node._bounds.width &&
              item.y >= node._bounds.y &&
              item.y + item.height <= node._bounds.y + node._bounds.height)
          {
              this.nodes[index].insert(item);
          }
          else
          {
              this._stuckChildren.push(item);
          }

          return;
      }

      this.children.push(item);

      var len = this.children.length;

      if(this._depth < this._maxDepth &&
          len > this._maxChildren)
      {
          this.subdivide();

          for(var i = 0; i < len; i++)
          {
              this.insert(this.children[i]);
          }

          this.children.length = 0;
      }
  };

  BoundsNode.prototype.getChildren = function()
  {
      return this.children.concat(this._stuckChildren);
  };

  BoundsNode.prototype.retrieve = function(item)
  {
      var out = this._out;
      out.length = 0;
      if(this.nodes.length)
      {
          var index = this._findIndex(item);

          out.push.apply(out, this.nodes[index].retrieve(item));
      }

      out.push.apply(out, this._stuckChildren);
      out.push.apply(out, this.children);

      return out;
  };

  BoundsNode.prototype.clear = function()
  {

      this._stuckChildren.length = 0;

      //array
      this.children.length = 0;

      var len = this.nodes.length;

      if(!len)
      {
          return;
      }

      for(var i = 0; i < len; i++)
      {
          this.nodes[i].clear();
      }

      //array
      this.nodes.length = 0;

      //we could call the super clear function but for now, im just going to inline it
      //call the hidden super.clear, and make sure its called with this = this instance
      //Object.getPrototypeOf(BoundsNode.prototype).clear.call(this);
  };

  //BoundsNode.prototype.getChildCount

  window.QuadTree = QuadTree;

  /*
  //http://ejohn.org/blog/objectgetprototypeof/
  if ( typeof Object.getPrototypeOf !== "function" ) {
    if ( typeof "test".__proto__ === "object" ) {
      Object.getPrototypeOf = function(object){
        return object.__proto__;
      };
    } else {
      Object.getPrototypeOf = function(object){
        // May break if the constructor has been tampered with
        return object.constructor.prototype;
      };
    }
  }
  */

  }(window));

  /**
   * This L.GridLayer.MaskCanvas plugin is for Leaflet 1.0
   * For Leaflet 0.7.x, please use L.TileLayer.MaskCanvas
   */
  L.GridLayer.MaskCanvas = L.GridLayer.extend({
    options: {
      radius: 5, // this is the default radius (specific radius values may be passed with the data)
      useAbsoluteRadius: true,  // true: radius in meters, false: radius in pixels
      color: '#000',
      opacity: 0.5,
      noMask: false,  // true results in normal (filled) circled, instead masked circles
      lineColor: undefined,  // color of the circle outline if noMask is true
      debug: false,
      zIndex: 18 // if it is lower, then the layer is not in front
    },

    initialize: function (options) {
      L.setOptions(this, options);
    },

    createTile: function (coords) {
      var tile = document.createElement('canvas');
      tile.width = tile.height = this.options.tileSize;

      this._draw(tile, coords);

      if (this.options.debug) {
        this._drawDebugInfo(tile, coords);
      }

      return tile;
    },

    _drawDebugInfo: function (canvas, coords) {
      var tileSize = this.options.tileSize;
      var ctx = canvas.getContext('2d');

      ctx.globalCompositeOperation = 'xor';

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, tileSize, tileSize);

      ctx.strokeStyle = '#000';
      ctx.strokeText('x: ' + coords.x + ', y: ' + coords.y + ', zoom: ' + coords.z, 20, 20);

      ctx.strokeStyle = '#f55';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tileSize, 0);
      ctx.lineTo(tileSize, tileSize);
      ctx.lineTo(0, tileSize);
      ctx.closePath();
      ctx.stroke();
    },

    /**
     * Pass either pairs of (y,x) or (y,x,radius) coordinates.
     * Alternatively you can also pass LatLng objects.
     *
     * Whenever there is no specific radius, the default one is used.
     *
     * @param {[[number, number]]|[[number, number, number]]|[L.LatLng]} dataset
     */
    setData: function (dataset) {
      var self = this;
      this.bounds = new L.LatLngBounds(dataset);

      this._quad = new QuadTree(this._boundsToQuery(this.bounds), false, 6, 6);

      var first = dataset[0];
      var xc = 1, yc = 0, rc = 2;
      if (first instanceof L.LatLng) {
        xc = "lng";
        yc = "lat";
      }

      this._maxRadius = 0;
      dataset.forEach(function(d) {
        var radius = d[rc] || self.options.radius;
        self._quad.insert({
          x: d[xc], //lng
          y: d[yc], //lat
          r: radius
        });
        self._maxRadius = Math.max(self._maxRadius, radius);
      });

      if (this._map) {
        this.redraw();
      }
    },

    /**
     * Set default radius value.
     *
     * @param {number} radius
     */
    setRadius: function(radius) {
      this.options.radius = radius;
      this.redraw();
    },

    /**
     * Returns the biggest radius value of all data points.
     *
     * @param {number} zoom Is required for projecting.
     * @returns {number}
     * @private
     */
    _getMaxRadius: function(zoom) {
      return this._calcRadius(this._maxRadius, zoom);
    },

    /**
     * @param {L.Point} coords
     * @param {{x: number, y: number, r: number}} pointCoordinate
     * @returns {[number, number, number]}
     * @private
     */
    _tilePoint: function (coords, pointCoordinate) {
      // start coords to tile 'space'
      var s = coords.multiplyBy(this.options.tileSize);

      // actual coords to tile 'space'
      var p = this._map.project(new L.LatLng(pointCoordinate.y, pointCoordinate.x), coords.z);

      // point to draw
      var x = Math.round(p.x - s.x);
      var y = Math.round(p.y - s.y);
      var r = this._calcRadius(pointCoordinate.r || this.options.radius, coords.z);
      return [x, y, r];
    },

    _boundsToQuery: function(bounds) {
      if (bounds.getSouthWest() == undefined) { return {x: 0, y: 0, width: 0.1, height: 0.1}; }  // for empty data sets
      return {
        x: bounds.getSouthWest().lng,
        y: bounds.getSouthWest().lat,
        width: bounds.getNorthEast().lng-bounds.getSouthWest().lng,
        height: bounds.getNorthEast().lat-bounds.getSouthWest().lat
      };
    },

    /**
     * The radius of a circle can be either absolute in pixels or in meters.
     *
     * @param {number} radius Pass either custom point radius, or default radius.
     * @param {number} zoom Zoom level
     * @returns {number} Projected radius (stays the same distance in meters across zoom levels).
     * @private
     */
    _calcRadius: function (radius, zoom) {
      var projectedRadius;

      if (this.options.useAbsoluteRadius) {
        var latRadius = (radius / 40075017) * 360,
            lngRadius = latRadius / Math.cos(Math.PI / 180 * this._latLng.lat),
            latLng2 = new L.LatLng(this._latLng.lat, this._latLng.lng - lngRadius, true),
            point2 = this._latLngToLayerPoint(latLng2, zoom),
            point = this._latLngToLayerPoint(this._latLng, zoom);

        projectedRadius = Math.max(Math.round(point.x - point2.x), 1);
      } else {
        projectedRadius = radius;
      }

      return projectedRadius;
    },

    /**
     * This is used instead of this._map.latLngToLayerPoint
     * in order to use custom zoom value.
     *
     * @param {L.LatLng} latLng
     * @param {number} zoom
     * @returns {L.Point}
     * @private
     */
    _latLngToLayerPoint: function (latLng, zoom) {
      var point = this._map.project(latLng, zoom)._round();
      return point._subtract(this._map.getPixelOrigin());
    },

    /**
     * @param {HTMLCanvasElement|HTMLElement} canvas
     * @param {L.Point} coords
     * @private
     */
    _draw: function (canvas, coords) {
      if (!this._quad || !this._map) {
        return;
      }

      var tileSize = this.options.tileSize;

      var nwPoint = coords.multiplyBy(tileSize);
      var sePoint = nwPoint.add(new L.Point(tileSize, tileSize));

      if (this.options.useAbsoluteRadius) {
        var centerPoint = nwPoint.add(new L.Point(tileSize/2, tileSize/2));
        this._latLng = this._map.unproject(centerPoint, coords.z);
      }

      // padding
      var pad = new L.Point(this._getMaxRadius(coords.z), this._getMaxRadius(coords.z));
      nwPoint = nwPoint.subtract(pad);
      sePoint = sePoint.add(pad);

      var bounds = new L.LatLngBounds(this._map.unproject(sePoint, coords.z), this._map.unproject(nwPoint, coords.z));

      var pointCoordinates = this._quad.retrieveInBounds(this._boundsToQuery(bounds));

      this._drawPoints(canvas, coords, pointCoordinates);
    },

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {L.Point} coords
     * @param {[{x: number, y: number, r: number}]} pointCoordinates
     * @private
     */
    _drawPoints: function (canvas, coords, pointCoordinates) {
      var ctx = canvas.getContext('2d'),
          tilePoint;
      ctx.fillStyle = this.options.color;

      if (this.options.lineColor) {
        ctx.strokeStyle = this.options.lineColor;
        ctx.lineWidth = this.options.lineWidth || 1;
      }

      ctx.globalCompositeOperation = 'source-over';
      if (!this.options.noMask && !this.options.debug) {
        ctx.fillRect(0, 0, this.options.tileSize, this.options.tileSize);
        ctx.globalCompositeOperation = 'destination-out';
      }

      for (var index in pointCoordinates) {
        if (pointCoordinates.hasOwnProperty(index)) {
          tilePoint = this._tilePoint(coords, pointCoordinates[index]);

          ctx.beginPath();
          ctx.arc(tilePoint[0], tilePoint[1], tilePoint[2], 0, Math.PI * 2);
          ctx.fill();
          if (this.options.lineColor) {
            ctx.stroke();
          }
        }
      }
    }
  });

  L.TileLayer.maskCanvas = function(options) {
    return new L.GridLayer.MaskCanvas(options);
  };

}());

/*
* Raphael SVG Import Classic Copyright (c) 2015 Chris Chang, Ingvar Stepanyan
* Original Raphael SVG Import Copyright (c) 2009 Wout Fierens
* Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.

++ 2017-09-02 devleechanho 
  1. 이미지 요소 생성이 안되는 문제 수정
  2. rect 요소를 백그라운드로 설정했을시 문제점 개선
  3. matrix transformation 반영 안되는 문제 수정
*/

if (!Raphael && require){
  var Raphael = require('raphael');
}
Raphael.fn.importSVG = function (svgXML, options) {
  "use strict";
  var myNewSet = this.set();
  var groupSet = {};
  var defaultTextAttr = {
    // stroke: "none"
    "text-anchor": "start"  // raphael defaults to "middle"
  };
  // minimal polyfill for String.trim()
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim#Polyfill
  var trim = function(string){
      return string.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
  // polyfill for Array.forEach
  var forEach = Function.prototype.bind && Array.prototype.forEach ? Function.prototype.call.bind(Array.prototype.forEach) : function (arr, callback) {
    for (var i = 0, length = arr.length; i < length; i++) {
      callback(arr[i], i, arr);
    }
  };

  this.parseElement = function(elShape) {
    // skip text nodes
    if (elShape.nodeType === 3) {
      return;
    }
    var attr = {"stroke": "none", "stroke-width": 1, "fill":"black"},
        shapeName = elShape.nodeName,
        i, n, key, shape;
    if (elShape.attributes) {
      for (i = 0, n = elShape.attributes.length; i < n; i++) {
        attr[elShape.attributes[i].name] = elShape.attributes[i].value;
      }
    }
    switch(shapeName) {
      case "svg":
      case "g":
        var groupId = elShape.getAttribute('id');
        var groupClass = elShape.getAttribute('class');
        if (groupId || groupClass) {
          var elShapeChildren = elShape.childNodes;
          for (i = 0, n = elShapeChildren.length; i < n; i++) {
            var elShapeChild = elShapeChildren[i];
            if (elShapeChild.nodeType === 3) {
              // skip text nodes
              continue;
            }
            if (groupId) {
              // FIXME data-* attrs are not part of the SVG spec
              elShapeChild.setAttribute('data-svg-group', groupId);
            }
            if (groupClass) {
              elShapeChild.setAttribute('class', (elShapeChild.getAttribute('class') || '') + ' ' + groupClass);
            }
          }
        }
        var thisGroup = this.set();
        // rect 요소를 백그라운드로 설정시 i = 1 부터 아닐경우 0 부터
        for (i = 1, n = elShape.childNodes.length; i < n; i++) {
          thisGroup.push(this.parseElement(elShape.childNodes.item(i)));
        }

        // handle transform attribute
        if (attr.transform){
          var match = /translate\(([^,]+),([^,]+)\)/.exec(attr.transform);
          if (match.length == 3){
            thisGroup.translate(match[1], match[2]);
          }
        }

        // handle display=none
        if (attr.display === "none") {
          thisGroup.hide();
        }
        // hold onto thisGroup just in case
        if (groupId && elShape.childNodes.length) {
          groupSet[groupId] = thisGroup;
        }
        return;
      case "rect":
        if (attr.rx && attr.ry) {
          attr.r = (+(attr.rx || 0) + (+(attr.ry || 0))) / 2;
          delete attr.rx;
          delete attr.ry;
        } else {
          attr.r = attr.rx || attr.ry || 0;
          delete attr.rx;
          delete attr.ry;
        }
        /* falls through */
      case "circle":
      case "ellipse":
        shape = this[shapeName]();
      break;
      case "path":
        shape = this.path(attr.d);
        delete attr.d;
      break;
      case "polygon":
        shape = this.polygon(attr);
      break;
      case "polyline":
        shape = this.polyline(attr);
      break;
      case "line":
        shape = this.line(attr);
      break;
      case "image":
        shape = this.image(elShape.href.baseVal);
      break;
      case "text":
        for (key in defaultTextAttr){
          if (!attr[key] && defaultTextAttr.hasOwnProperty(key)) {
            attr[key] = defaultTextAttr[key];
          }
        }
        shape = this.text(attr.x, attr.y, elShape.text || elShape.textContent || elShape.innerText || elShape.outerText);
      break;
      default:
        var elSVG = elShape.getElementsByTagName("svg");
        if (elSVG.length){
          elSVG[0].normalize();
          this.parseElement(elSVG[0]);
        }
        return;
    }

    // apply matrix transformation
    var matrix = attr.transform;
    if (matrix) {
      // strip `matrix(...)` text and then tokenize
      matrix = matrix.substring(7, matrix.length-1).split(',');
      // cast matrix elements, parseFloat don't care if there's commas or not
      for (var idx in matrix) {
        matrix[idx] = parseFloat(matrix[idx]);
      }
      var m = shape.matrix;
      m.add.apply(m, matrix);
      // this seems like a very odd step:
      shape.transform(m.toTransformString());
      delete attr.transform;
    }

    // Raphael throws away the `style` attribute; re-interpret it.
    if (attr.style) {
      var styleBits = attr.style.split(';'),
          styleBitBits;
      for (i = 0; i < styleBits.length; i++) {
        styleBitBits = styleBits[i].split(':');
        key = trim(styleBitBits[0]);
        if (key) {
          attr[key] = trim(styleBitBits[1]);
        }
      }
    }
    shape.attr(attr);

    // Adds dataattributes to raphael
    for (var attributeIndex = 0; attributeIndex < elShape.attributes.length; attributeIndex++) {
        var attribute = elShape.attributes[attributeIndex];
        // Checks if attribute is an data-attribute
        if(attribute.name.indexOf('data-') === 0) {
            shape.data(attribute.name.replace(/data-/, ''), attribute.value);
        }
    }

    // copy group id
    var shapeClass = elShape.getAttribute('class');
    if (shapeClass) {
      shape.node.setAttribute('class', (shape.node.getAttribute('class') || '') + ' ' + shapeClass);
    }
    // FIXME data-* attrs are not part of the SVG spec
    shape.node.setAttribute('data-svg', shapeName);

    var group = elShape.getAttribute('data-svg-group');
    if (group) {
      // FIXME data-* attrs are not part of the SVG spec
      shape.node.setAttribute('data-svg-group', group);
    }

    var nodeID = elShape.getAttribute("id");
    if (nodeID) {
      shape.node.id = nodeID;
    }

    if (options && options.parseElement) {
      shape = options.parseElement(shape, elShape);
    }

    if (shape) {
      myNewSet.push(shape);
    }

    return shape;
  };

  this.parseElement(svgXML);


  // TODO add tests for svg style attr functionality
  var paper = this;
  forEach(svgXML.getElementsByTagName('style'), function (xmlStyle) {
    var domStyle = document.createElement('style'), css = xmlStyle.textContent || xmlStyle.text;
    domStyle.type = 'text/css';
    document.head.appendChild(domStyle);
    var rules;
    if (domStyle.styleSheet) {
      domStyle.styleSheet.cssText = css;
      rules = domStyle.styleSheet.rules;
    } else {
      domStyle.appendChild(document.createTextNode(css));
      rules = domStyle.sheet.cssRules;
    }
    forEach(rules, function (rule) {
      var style = rule.style, elements = document.querySelectorAll(rule.selectorText), attrs = {};
      for (var name in Raphael._availableAttrs) {
        var value = style[name];
        if (!value) continue;
        // fix for Chrome
        attrs[name] = typeof Raphael._availableAttrs[name] === 'number' ? parseFloat(value) : value;
      }
      forEach(elements, function (element) {
        paper.getById(element.raphaelid).attr(attrs);
      });
    });
  });

  var groupsExist = false, x;
  for (x in groupSet){
    groupsExist = true;
    break;
  }
  if (groupsExist) {
    myNewSet.groups = groupSet;
  }
  return myNewSet;
};


Raphael.fn.line = function(attr){
  var pathString = ["M",
                    attr.x1,
                    attr.y1,
                    "L",
                    attr.x2,
                    attr.y2,
                    "Z"];
  delete attr.x1;
  delete attr.y1;
  delete attr.x2;
  delete attr.y2;
  return this.path(pathString);
};


// extending raphael with a polygon function
Raphael.fn.polygon = function(attr) {
  var pointString = attr.points;
  var poly = ['M'],
      point = pointString.split(' ');

  for(var i=0; i < point.length; i++) {
     var c = point[i].split(',');
     for(var j=0; j < c.length; j++) {
        var d = parseFloat(c[j]);
        if (!isNaN(d))
          poly.push(d);
     }
     if (i === 0)
      poly.push('L');
  }
  poly.push('Z');
  delete attr.points;
  return this.path(poly);
};


Raphael.fn.polyline = function(attr) {
  var pointString = attr.points;
  var poly = ['M'],
      point = pointString.split(' ');

  for(var i=0; i < point.length; i++) {
     var c = point[i].split(',');
     for(var j=0; j < c.length; j++) {
        var d = parseFloat(c[j]);
        if (!isNaN(d))
          poly.push(d);
     }
     if (i === 0)
      poly.push('L');
  }
  delete attr.points;
  return this.path(poly);
};
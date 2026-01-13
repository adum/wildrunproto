
  /**
   * @license
   * author: BAI TIANLIANG
   * ghostban.js v3.0.0-alpha.149
   * Released under the MIT license.
   */

'use strict';

var tslib = require('tslib');
var lodash = require('lodash');
var SparkMD5 = require('spark-md5');
var jsBase64 = require('js-base64');

/**
 * Sort an array using the merge sort algorithm.
 *
 * @param comparatorFn The comparator function.
 * @param arr The array to sort.
 * @returns The sorted array.
 */
function mergeSort(comparatorFn, arr) {
    var len = arr.length;
    if (len >= 2) {
        var firstHalf = arr.slice(0, len / 2);
        var secondHalf = arr.slice(len / 2, len);
        return merge(comparatorFn, mergeSort(comparatorFn, firstHalf), mergeSort(comparatorFn, secondHalf));
    }
    else {
        return arr.slice();
    }
}
/**
 * The merge part of the merge sort algorithm.
 *
 * @param comparatorFn The comparator function.
 * @param arr1 The first sorted array.
 * @param arr2 The second sorted array.
 * @returns The merged and sorted array.
 */
function merge(comparatorFn, arr1, arr2) {
    var result = [];
    var left1 = arr1.length;
    var left2 = arr2.length;
    while (left1 > 0 && left2 > 0) {
        if (comparatorFn(arr1[0], arr2[0]) <= 0) {
            result.push(arr1.shift()); // non-null assertion: safe since we just checked length
            left1--;
        }
        else {
            result.push(arr2.shift());
            left2--;
        }
    }
    if (left1 > 0) {
        result.push.apply(result, tslib.__spreadArray([], tslib.__read(arr1), false));
    }
    else {
        result.push.apply(result, tslib.__spreadArray([], tslib.__read(arr2), false));
    }
    return result;
}

function findInsertIndex(comparatorFn, arr, el) {
    var i;
    var len = arr.length;
    for (i = 0; i < len; i++) {
        if (comparatorFn(arr[i], el) > 0) {
            break;
        }
    }
    return i;
}
var TNode = /** @class */ (function () {
    function TNode(config, model) {
        this.children = [];
        this.config = config;
        this.model = model;
    }
    TNode.prototype.isRoot = function () {
        return this.parent === undefined;
    };
    TNode.prototype.hasChildren = function () {
        return this.children.length > 0;
    };
    TNode.prototype.addChild = function (child) {
        return addChild(this, child);
    };
    TNode.prototype.addChildAtIndex = function (child, index) {
        if (this.config.modelComparatorFn) {
            throw new Error('Cannot add child at index when using a comparator function.');
        }
        var prop = this.config.childrenPropertyName || 'children';
        if (!this.model[prop]) {
            this.model[prop] = [];
        }
        var modelChildren = this.model[prop];
        if (index < 0 || index > this.children.length) {
            throw new Error('Invalid index.');
        }
        child.parent = this;
        modelChildren.splice(index, 0, child.model);
        this.children.splice(index, 0, child);
        return child;
    };
    TNode.prototype.getPath = function () {
        var path = [];
        var current = this;
        while (current) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    };
    TNode.prototype.getIndex = function () {
        return this.isRoot() ? 0 : this.parent.children.indexOf(this);
    };
    TNode.prototype.setIndex = function (index) {
        if (this.config.modelComparatorFn) {
            throw new Error('Cannot set node index when using a comparator function.');
        }
        if (this.isRoot()) {
            if (index === 0) {
                return this;
            }
            throw new Error('Invalid index.');
        }
        if (!this.parent) {
            throw new Error('Node has no parent.');
        }
        var siblings = this.parent.children;
        var modelSiblings = this.parent.model[this.config.childrenPropertyName || 'children'];
        var oldIndex = siblings.indexOf(this);
        if (index < 0 || index >= siblings.length) {
            throw new Error('Invalid index.');
        }
        siblings.splice(index, 0, siblings.splice(oldIndex, 1)[0]);
        modelSiblings.splice(index, 0, modelSiblings.splice(oldIndex, 1)[0]);
        return this;
    };
    TNode.prototype.walk = function (fn) {
        var walkRecursive = function (node) {
            var e_1, _a;
            if (fn(node) === false)
                return false;
            try {
                for (var _b = tslib.__values(node.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (walkRecursive(child) === false)
                        return false;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return true;
        };
        walkRecursive(this);
    };
    TNode.prototype.first = function (fn) {
        var result;
        this.walk(function (node) {
            if (fn(node)) {
                result = node;
                return false;
            }
        });
        return result;
    };
    TNode.prototype.all = function (fn) {
        var result = [];
        this.walk(function (node) {
            if (fn(node))
                result.push(node);
        });
        return result;
    };
    TNode.prototype.drop = function () {
        if (this.parent) {
            var idx = this.parent.children.indexOf(this);
            if (idx >= 0) {
                this.parent.children.splice(idx, 1);
                var prop = this.config.childrenPropertyName || 'children';
                this.parent.model[prop].splice(idx, 1);
            }
            this.parent = undefined;
        }
        return this;
    };
    return TNode;
}());
function addChild(parent, child) {
    var prop = parent.config.childrenPropertyName || 'children';
    if (!parent.model[prop]) {
        parent.model[prop] = [];
    }
    var modelChildren = parent.model[prop];
    child.parent = parent;
    if (parent.config.modelComparatorFn) {
        var index = findInsertIndex(parent.config.modelComparatorFn, modelChildren, child.model);
        modelChildren.splice(index, 0, child.model);
        parent.children.splice(index, 0, child);
    }
    else {
        modelChildren.push(child.model);
        parent.children.push(child);
    }
    return child;
}
var TreeModel = /** @class */ (function () {
    function TreeModel(config) {
        if (config === void 0) { config = {}; }
        this.config = {
            childrenPropertyName: config.childrenPropertyName || 'children',
            modelComparatorFn: config.modelComparatorFn,
        };
    }
    TreeModel.prototype.parse = function (model) {
        var e_2, _a;
        if (typeof model !== 'object' || model === null) {
            throw new TypeError('Model must be of type object.');
        }
        var node = new TNode(this.config, model);
        var prop = this.config.childrenPropertyName;
        var children = model[prop];
        if (Array.isArray(children)) {
            if (this.config.modelComparatorFn) {
                model[prop] = mergeSort(this.config.modelComparatorFn, children);
            }
            try {
                for (var _b = tslib.__values(model[prop]), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var childModel = _c.value;
                    var childNode = this.parse(childModel);
                    addChild(node, childNode);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return node;
    };
    return TreeModel;
}());

var calcHash = function (node, moveProps) {
    if (moveProps === void 0) { moveProps = []; }
    var fullname = 'n';
    if (moveProps.length > 0) {
        fullname += "".concat(moveProps[0].token).concat(moveProps[0].value);
    }
    if (node) {
        var path = node.getPath();
        if (path.length > 0) {
            fullname = path.map(function (n) { return n.model.id; }).join('=>') + "=>".concat(fullname);
        }
    }
    return SparkMD5.hash(fullname).slice(0, 6);
};
function isCharacterInNode(sgf, n, nodes) {
    if (nodes === void 0) { nodes = ['C', 'TM', 'GN', 'PC']; }
    var pattern = new RegExp("(".concat(nodes.join('|'), ")\\[([^\\]]*)\\]"), 'g');
    var match;
    while ((match = pattern.exec(sgf)) !== null) {
        var contentStart = match.index + match[1].length + 1; // +1 for the '['
        var contentEnd = contentStart + match[2].length;
        if (n >= contentStart && n <= contentEnd) {
            return true;
        }
    }
    return false;
}
function buildPropertyValueRanges(sgf, keys) {
    if (keys === void 0) { keys = ['C', 'TM', 'GN', 'PC']; }
    var ranges = [];
    var pattern = new RegExp("\\b(".concat(keys.join('|'), ")\\["), 'g');
    var match;
    var _loop_1 = function () {
        var propStart = match.index;
        var valueStart = propStart + match[1].length + 1; // +1 for '['
        // Check if this match is inside any existing range
        var isInsideExistingRange = ranges.some(function (_a) {
            var _b = tslib.__read(_a, 2), start = _b[0], end = _b[1];
            return propStart >= start && propStart <= end;
        });
        if (isInsideExistingRange) {
            return "continue";
        }
        // Find the first unescaped closing bracket
        var i = valueStart;
        var escaped = false;
        while (i < sgf.length) {
            var char = sgf[i];
            if (escaped) {
                escaped = false;
            }
            else if (char === '\\') {
                escaped = true;
            }
            else if (char === ']') {
                // Found unescaped closing bracket
                break;
            }
            i++;
        }
        if (i < sgf.length) {
            ranges.push([valueStart, i]);
        }
    };
    while ((match = pattern.exec(sgf)) !== null) {
        _loop_1();
    }
    return ranges;
}
function isInAnyRange(index, ranges) {
    // ranges must be sorted
    var left = 0;
    var right = ranges.length - 1;
    while (left <= right) {
        var mid = (left + right) >> 1;
        var _a = tslib.__read(ranges[mid], 2), start = _a[0], end = _a[1];
        if (index < start) {
            right = mid - 1;
        }
        else if (index > end) {
            left = mid + 1;
        }
        else {
            return true;
        }
    }
    return false;
}
var getDeduplicatedProps = function (targetProps) {
    return lodash.filter(targetProps, function (prop, index) {
        return index ===
            lodash.findLastIndex(targetProps, function (lastPro) {
                return prop.token === lastPro.token && prop.value === lastPro.value;
            });
    });
};
var isMoveNode = function (n) {
    return n.model.moveProps.length > 0;
};
var isRootNode = function (n) {
    return n.model.rootProps.length > 0 || n.isRoot();
};
var isSetupNode = function (n) {
    return n.model.setupProps.length > 0;
};
var getNodeNumber = function (n, parent) {
    var path = n.getPath();
    var movesCount = path.filter(function (n) { return isMoveNode(n); }).length;
    if (parent) {
        movesCount += parent.getPath().filter(function (n) { return isMoveNode(n); }).length;
    }
    return movesCount;
};

/**
 * Theme property keys for type-safe access to theme configuration
 */
exports.ThemePropertyKey = void 0;
(function (ThemePropertyKey) {
    ThemePropertyKey["PositiveNodeColor"] = "positiveNodeColor";
    ThemePropertyKey["NegativeNodeColor"] = "negativeNodeColor";
    ThemePropertyKey["NeutralNodeColor"] = "neutralNodeColor";
    ThemePropertyKey["DefaultNodeColor"] = "defaultNodeColor";
    ThemePropertyKey["WarningNodeColor"] = "warningNodeColor";
    ThemePropertyKey["ShadowColor"] = "shadowColor";
    ThemePropertyKey["BoardLineColor"] = "boardLineColor";
    ThemePropertyKey["ActiveColor"] = "activeColor";
    ThemePropertyKey["InactiveColor"] = "inactiveColor";
    ThemePropertyKey["BoardBackgroundColor"] = "boardBackgroundColor";
    ThemePropertyKey["FlatBlackColor"] = "flatBlackColor";
    ThemePropertyKey["FlatBlackColorAlt"] = "flatBlackColorAlt";
    ThemePropertyKey["FlatWhiteColor"] = "flatWhiteColor";
    ThemePropertyKey["FlatWhiteColorAlt"] = "flatWhiteColorAlt";
    ThemePropertyKey["BoardEdgeLineWidth"] = "boardEdgeLineWidth";
    ThemePropertyKey["BoardLineWidth"] = "boardLineWidth";
    ThemePropertyKey["BoardLineExtent"] = "boardLineExtent";
    ThemePropertyKey["StarSize"] = "starSize";
    ThemePropertyKey["MarkupLineWidth"] = "markupLineWidth";
    ThemePropertyKey["HighlightColor"] = "highlightColor";
})(exports.ThemePropertyKey || (exports.ThemePropertyKey = {}));
exports.Ki = void 0;
(function (Ki) {
    Ki[Ki["Black"] = 1] = "Black";
    Ki[Ki["White"] = -1] = "White";
    Ki[Ki["Empty"] = 0] = "Empty";
})(exports.Ki || (exports.Ki = {}));
exports.Theme = void 0;
(function (Theme) {
    Theme["BlackAndWhite"] = "black_and_white";
    Theme["Flat"] = "flat";
    Theme["Subdued"] = "subdued";
    Theme["ShellStone"] = "shell_stone";
    Theme["SlateAndShell"] = "slate_and_shell";
    Theme["Walnut"] = "walnut";
    Theme["Photorealistic"] = "photorealistic";
    Theme["Dark"] = "dark";
    Theme["Warm"] = "warm";
    Theme["YunziMonkeyDark"] = "yunzi_monkey_dark";
    Theme["HighContrast"] = "high_contrast";
})(exports.Theme || (exports.Theme = {}));
exports.AnalysisPointTheme = void 0;
(function (AnalysisPointTheme) {
    AnalysisPointTheme["Default"] = "default";
    AnalysisPointTheme["Problem"] = "problem";
    AnalysisPointTheme["Scenario"] = "scenario";
})(exports.AnalysisPointTheme || (exports.AnalysisPointTheme = {}));
exports.Center = void 0;
(function (Center) {
    Center["Left"] = "l";
    Center["Right"] = "r";
    Center["Top"] = "t";
    Center["Bottom"] = "b";
    Center["TopRight"] = "tr";
    Center["TopLeft"] = "tl";
    Center["BottomLeft"] = "bl";
    Center["BottomRight"] = "br";
    Center["Center"] = "c";
})(exports.Center || (exports.Center = {}));
exports.Effect = void 0;
(function (Effect) {
    Effect["None"] = "";
    Effect["Ban"] = "ban";
    Effect["Dim"] = "dim";
    Effect["Highlight"] = "highlight";
})(exports.Effect || (exports.Effect = {}));
exports.Markup = void 0;
(function (Markup) {
    Markup["Current"] = "cu";
    Markup["Circle"] = "ci";
    Markup["CircleSolid"] = "cis";
    Markup["Square"] = "sq";
    Markup["SquareSolid"] = "sqs";
    Markup["Triangle"] = "tri";
    Markup["Cross"] = "cr";
    Markup["Number"] = "num";
    Markup["Letter"] = "le";
    Markup["PositiveNode"] = "pos";
    Markup["PositiveActiveNode"] = "posa";
    Markup["PositiveDashedNode"] = "posda";
    Markup["PositiveDottedNode"] = "posdt";
    Markup["PositiveDashedActiveNode"] = "posdaa";
    Markup["PositiveDottedActiveNode"] = "posdta";
    Markup["NegativeNode"] = "neg";
    Markup["NegativeActiveNode"] = "nega";
    Markup["NegativeDashedNode"] = "negda";
    Markup["NegativeDottedNode"] = "negdt";
    Markup["NegativeDashedActiveNode"] = "negdaa";
    Markup["NegativeDottedActiveNode"] = "negdta";
    Markup["NeutralNode"] = "neu";
    Markup["NeutralActiveNode"] = "neua";
    Markup["NeutralDashedNode"] = "neuda";
    Markup["NeutralDottedNode"] = "neudt";
    Markup["NeutralDashedActiveNode"] = "neudta";
    Markup["NeutralDottedActiveNode"] = "neudaa";
    Markup["WarningNode"] = "wa";
    Markup["WarningActiveNode"] = "waa";
    Markup["WarningDashedNode"] = "wada";
    Markup["WarningDottedNode"] = "wadt";
    Markup["WarningDashedActiveNode"] = "wadaa";
    Markup["WarningDottedActiveNode"] = "wadta";
    Markup["DefaultNode"] = "de";
    Markup["DefaultActiveNode"] = "dea";
    Markup["DefaultDashedNode"] = "deda";
    Markup["DefaultDottedNode"] = "dedt";
    Markup["DefaultDashedActiveNode"] = "dedaa";
    Markup["DefaultDottedActiveNode"] = "dedta";
    Markup["Node"] = "node";
    Markup["DashedNode"] = "danode";
    Markup["DottedNode"] = "dtnode";
    Markup["ActiveNode"] = "anode";
    Markup["DashedActiveNode"] = "danode";
    Markup["Highlight"] = "hl";
    Markup["None"] = "";
})(exports.Markup || (exports.Markup = {}));
exports.Cursor = void 0;
(function (Cursor) {
    Cursor["None"] = "";
    Cursor["BlackStone"] = "b";
    Cursor["WhiteStone"] = "w";
    Cursor["Circle"] = "c";
    Cursor["Square"] = "s";
    Cursor["Triangle"] = "tri";
    Cursor["Cross"] = "cr";
    Cursor["Clear"] = "cl";
    Cursor["Text"] = "t";
})(exports.Cursor || (exports.Cursor = {}));
exports.ProblemAnswerType = void 0;
(function (ProblemAnswerType) {
    ProblemAnswerType["Right"] = "1";
    ProblemAnswerType["Wrong"] = "2";
    ProblemAnswerType["Variant"] = "3";
})(exports.ProblemAnswerType || (exports.ProblemAnswerType = {}));
exports.PathDetectionStrategy = void 0;
(function (PathDetectionStrategy) {
    PathDetectionStrategy["Post"] = "post";
    PathDetectionStrategy["Pre"] = "pre";
    PathDetectionStrategy["Both"] = "both";
})(exports.PathDetectionStrategy || (exports.PathDetectionStrategy = {}));

var _a$1;
var settings = { cdn: 'https://s.shaowq.com' };
var BASE_THEME_CONFIG = {
    positiveNodeColor: '#4d7c0f',
    negativeNodeColor: '#b91c1c',
    neutralNodeColor: '#a16207',
    defaultNodeColor: '#404040',
    warningNodeColor: '#ffdf20',
    shadowColor: '#555555',
    boardLineColor: '#000000',
    activeColor: '#000000',
    inactiveColor: '#666666',
    boardBackgroundColor: '#FFFFFF',
    flatBlackColor: '#000000',
    flatBlackColorAlt: '#000000', // Alternative, temporarily same as main color
    flatWhiteColor: '#FFFFFF',
    flatWhiteColorAlt: '#FFFFFF', // Alternative, temporarily same as main color
    boardEdgeLineWidth: 2,
    boardLineWidth: 1.2,
    boardLineExtent: 0.5,
    starSize: 3,
    markupLineWidth: 2,
    highlightColor: '#ffeb64',
    stoneRatio: 0.45,
};
var MAX_BOARD_SIZE = 29;
var DEFAULT_BOARD_SIZE = 19;
var A1_LETTERS = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
];
var A1_LETTERS_WITH_I = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
];
var A1_NUMBERS = [
    19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];
var SGF_LETTERS = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
];
// export const BLANK_ARRAY = chunk(new Array(361).fill(0), 19);
var DOT_SIZE = 3;
var EXPAND_H = 5;
var EXPAND_V = 5;
var RESPONSE_TIME = 100;
var DEFAULT_OPTIONS = {
    boardSize: 19,
    padding: 15,
    extent: 2,
    interactive: false,
    coordinate: true,
    theme: exports.Theme.Flat,
    background: false,
    zoom: false,
    showAnalysis: false,
};
var THEME_RESOURCES = (_a$1 = {},
    _a$1[exports.Theme.BlackAndWhite] = {
        blacks: [],
        whites: [],
    },
    _a$1[exports.Theme.Subdued] = {
        board: "".concat(settings.cdn, "/assets/theme/subdued/board.png"),
        blacks: ["".concat(settings.cdn, "/assets/theme/subdued/black.png")],
        whites: ["".concat(settings.cdn, "/assets/theme/subdued/white.png")],
    },
    _a$1[exports.Theme.ShellStone] = {
        board: "".concat(settings.cdn, "/assets/theme/shell-stone/board.png"),
        blacks: ["".concat(settings.cdn, "/assets/theme/shell-stone/black.png")],
        whites: [
            "".concat(settings.cdn, "/assets/theme/shell-stone/white0.png"),
            "".concat(settings.cdn, "/assets/theme/shell-stone/white1.png"),
            "".concat(settings.cdn, "/assets/theme/shell-stone/white2.png"),
            "".concat(settings.cdn, "/assets/theme/shell-stone/white3.png"),
            "".concat(settings.cdn, "/assets/theme/shell-stone/white4.png"),
        ],
    },
    _a$1[exports.Theme.SlateAndShell] = {
        board: "".concat(settings.cdn, "/assets/theme/slate-and-shell/board.png"),
        blacks: [
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/slate1.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/slate2.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/slate3.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/slate4.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/slate5.png"),
        ],
        whites: [
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/shell1.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/shell2.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/shell3.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/shell4.png"),
            "".concat(settings.cdn, "/assets/theme/slate-and-shell/shell5.png"),
        ],
    },
    _a$1[exports.Theme.Walnut] = {
        board: "".concat(settings.cdn, "/assets/theme/walnut/board.jpg"),
        blacks: ["".concat(settings.cdn, "/assets/theme/walnut/black.png")],
        whites: ["".concat(settings.cdn, "/assets/theme/walnut/white.png")],
    },
    _a$1[exports.Theme.Photorealistic] = {
        board: "".concat(settings.cdn, "/assets/theme/photorealistic/board.png"),
        blacks: ["".concat(settings.cdn, "/assets/theme/photorealistic/black.png")],
        whites: ["".concat(settings.cdn, "/assets/theme/photorealistic/white.png")],
    },
    _a$1[exports.Theme.Flat] = {
        blacks: [],
        whites: [],
    },
    _a$1[exports.Theme.Warm] = {
        blacks: [],
        whites: [],
    },
    _a$1[exports.Theme.Dark] = {
        blacks: [],
        whites: [],
    },
    _a$1[exports.Theme.YunziMonkeyDark] = {
        board: "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-Bo-V10_lessborder1920px.png"),
        blacks: [
            "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-B-v14-338px.png"),
        ],
        whites: [
            "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-W-v14-338px.png"),
        ],
        lowRes: {
            board: "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-Bo-V10_lessborder-960px.png"),
            blacks: [
                "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-B-v14-135px.png"),
            ],
            whites: [
                "".concat(settings.cdn, "/assets/theme/ymd/yunzi-monkey-dark/YMD-W-v14-135px.png"),
            ],
        },
        microRes: {
            board: "".concat(settings.cdn, "/assets/theme/ymd/YMD-Bo-V10_lessborder-960px.png"),
            blacks: ["".concat(settings.cdn, "/assets/theme/ymd/YMD-B_197to59px.png")],
            whites: ["".concat(settings.cdn, "/assets/theme/ymd/YMD-W_197to59px.png")],
        },
    },
    _a$1[exports.Theme.HighContrast] = {
        blacks: [],
        whites: [],
    },
    _a$1);
var LIGHT_GREEN_RGB = 'rgba(136, 170, 60, 1)';
var LIGHT_YELLOW_RGB = 'rgba(206, 210, 83, 1)';
var YELLOW_RGB = 'rgba(242, 217, 60, 1)';
var LIGHT_RED_RGB = 'rgba(236, 146, 73, 1)';

var MOVE_PROP_LIST = [
    'B',
    // KO is standard in move list but usually be used for komi in gameinfo props
    // 'KO',
    'MN',
    'W',
];
var SETUP_PROP_LIST = [
    'AB',
    'AE',
    'AW',
    //TODO: PL is a value of color type
    // 'PL'
];
var NODE_ANNOTATION_PROP_LIST = [
    'A',
    'C',
    'DM',
    'GB',
    'GW',
    'HO',
    'N',
    'UC',
    'V',
];
var MOVE_ANNOTATION_PROP_LIST = [
    'BM',
    'DO',
    'IT',
    // TE is standard in move annotation for tesuji
    // 'TE',
];
var MARKUP_PROP_LIST = [
    'AR',
    'CR',
    'LB',
    'LN',
    'MA',
    'SL',
    'SQ',
    'TR',
];
var ROOT_PROP_LIST = ['AP', 'CA', 'FF', 'GM', 'ST', 'SZ'];
var GAME_INFO_PROP_LIST = [
    //TE Non-standard
    'TE',
    //KO Non-standard
    'KO',
    'AN',
    'BR',
    'BT',
    'CP',
    'DT',
    'EV',
    'GN',
    'GC',
    'ON',
    'OT',
    'PB',
    'PC',
    'PW',
    'RE',
    'RO',
    'RU',
    'SO',
    'TM',
    'US',
    'WR',
    'WT',
];
var TIMING_PROP_LIST = ['BL', 'OB', 'OW', 'WL'];
var MISCELLANEOUS_PROP_LIST = ['FG', 'PM', 'VW'];
var CUSTOM_PROP_LIST = ['PI', 'PAI', 'NID', 'PAT'];
var LIST_OF_POINTS_PROP = ['AB', 'AE', 'AW', 'MA', 'SL', 'SQ', 'TR'];
var TOKEN_REGEX = new RegExp(/([A-Z]*)\[([\s\S]*?)\]/);
// Updated regex to handle escaped brackets properly for Text type properties
// (?:[^\]\\]|\\.)* matches any char except ] and \, OR any escaped char
var TOKEN_REGEX_WITH_ESCAPES = new RegExp(/([A-Z]*)\[((?:[^\]\\]|\\.)*)\]/);
var SgfPropBase = /** @class */ (function () {
    function SgfPropBase(token, value) {
        this.type = '-';
        this._value = '';
        this._values = [];
        this.token = token;
        if (typeof value === 'string' || value instanceof String) {
            this.value = value;
        }
        else if (Array.isArray(value)) {
            this.values = value;
        }
    }
    Object.defineProperty(SgfPropBase.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SgfPropBase.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    SgfPropBase.prototype.toString = function () {
        return "".concat(this.token).concat(this._values.map(function (v) { return "[".concat(v, "]"); }).join(''));
    };
    return SgfPropBase;
}());
var MoveProp = /** @class */ (function (_super) {
    tslib.__extends(MoveProp, _super);
    function MoveProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'move';
        return _this;
    }
    MoveProp.from = function (str) {
        var match = str.match(/([A-Z]*)\[([\s\S]*?)\]/);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new MoveProp(token, val);
        }
        return new MoveProp('', '');
    };
    Object.defineProperty(MoveProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MoveProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return MoveProp;
}(SgfPropBase));
var SetupProp = /** @class */ (function (_super) {
    tslib.__extends(SetupProp, _super);
    function SetupProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'setup';
        return _this;
    }
    SetupProp.from = function (str) {
        var tokenMatch = str.match(TOKEN_REGEX);
        var valMatches = str.matchAll(/\[([\s\S]*?)\]/g);
        var token = '';
        var vals = tslib.__spreadArray([], tslib.__read(valMatches), false).map(function (m) { return m[1]; });
        if (tokenMatch)
            token = tokenMatch[1];
        return new SetupProp(token, vals);
    };
    Object.defineProperty(SetupProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SetupProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return SetupProp;
}(SgfPropBase));
var NodeAnnotationProp = /** @class */ (function (_super) {
    tslib.__extends(NodeAnnotationProp, _super);
    function NodeAnnotationProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'node-annotation';
        return _this;
    }
    NodeAnnotationProp.from = function (str) {
        var match = str.match(TOKEN_REGEX_WITH_ESCAPES);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new NodeAnnotationProp(token, val);
        }
        return new NodeAnnotationProp('', '');
    };
    Object.defineProperty(NodeAnnotationProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(NodeAnnotationProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Escapes unescaped right brackets in SGF property values
     * Only escapes brackets that are not already escaped
     */
    NodeAnnotationProp.prototype.escapeValue = function (value) {
        // Replace ] with \] only if it's not already escaped
        // This regex looks for ] that is NOT preceded by \
        return value.replace(/(?<!\\)\]/g, '\\]');
    };
    NodeAnnotationProp.prototype.toString = function () {
        var _this = this;
        return "".concat(this.token).concat(this._values
            .map(function (v) { return "[".concat(_this.escapeValue(v), "]"); })
            .join(''));
    };
    return NodeAnnotationProp;
}(SgfPropBase));
var MoveAnnotationProp = /** @class */ (function (_super) {
    tslib.__extends(MoveAnnotationProp, _super);
    function MoveAnnotationProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'move-annotation';
        return _this;
    }
    MoveAnnotationProp.from = function (str) {
        var match = str.match(TOKEN_REGEX_WITH_ESCAPES);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new MoveAnnotationProp(token, val);
        }
        return new MoveAnnotationProp('', '');
    };
    Object.defineProperty(MoveAnnotationProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MoveAnnotationProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return MoveAnnotationProp;
}(SgfPropBase));
var AnnotationProp = /** @class */ (function (_super) {
    tslib.__extends(AnnotationProp, _super);
    function AnnotationProp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AnnotationProp;
}(SgfPropBase));
var MarkupProp = /** @class */ (function (_super) {
    tslib.__extends(MarkupProp, _super);
    function MarkupProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'markup';
        return _this;
    }
    MarkupProp.from = function (str) {
        var tokenMatch = str.match(TOKEN_REGEX);
        var valMatches = str.matchAll(/\[([\s\S]*?)\]/g);
        var token = '';
        var vals = tslib.__spreadArray([], tslib.__read(valMatches), false).map(function (m) { return m[1]; });
        if (tokenMatch)
            token = tokenMatch[1];
        return new MarkupProp(token, vals);
    };
    Object.defineProperty(MarkupProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MarkupProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return MarkupProp;
}(SgfPropBase));
var RootProp = /** @class */ (function (_super) {
    tslib.__extends(RootProp, _super);
    function RootProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'root';
        return _this;
    }
    RootProp.from = function (str) {
        var match = str.match(TOKEN_REGEX_WITH_ESCAPES);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new RootProp(token, val);
        }
        return new RootProp('', '');
    };
    Object.defineProperty(RootProp.prototype, "value", {
        // Duplicated code: https://github.com/microsoft/TypeScript/issues/338
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RootProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return RootProp;
}(SgfPropBase));
var GameInfoProp = /** @class */ (function (_super) {
    tslib.__extends(GameInfoProp, _super);
    function GameInfoProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'game-info';
        return _this;
    }
    GameInfoProp.from = function (str) {
        var match = str.match(TOKEN_REGEX_WITH_ESCAPES);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new GameInfoProp(token, val);
        }
        return new GameInfoProp('', '');
    };
    Object.defineProperty(GameInfoProp.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameInfoProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return GameInfoProp;
}(SgfPropBase));
var CustomProp = /** @class */ (function (_super) {
    tslib.__extends(CustomProp, _super);
    function CustomProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'custom';
        return _this;
    }
    CustomProp.from = function (str) {
        var match = str.match(TOKEN_REGEX_WITH_ESCAPES);
        if (match) {
            var token = match[1];
            var val = match[2];
            return new CustomProp(token, val);
        }
        return new CustomProp('', '');
    };
    Object.defineProperty(CustomProp.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CustomProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return CustomProp;
}(SgfPropBase));
var TimingProp = /** @class */ (function (_super) {
    tslib.__extends(TimingProp, _super);
    function TimingProp(token, value) {
        var _this = _super.call(this, token, value) || this;
        _this.type = 'Timing';
        return _this;
    }
    Object.defineProperty(TimingProp.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (newValue) {
            this._value = newValue;
            if (LIST_OF_POINTS_PROP.includes(this.token)) {
                this._values = newValue.split(',');
            }
            else {
                this._values = [newValue];
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TimingProp.prototype, "values", {
        get: function () {
            return this._values;
        },
        set: function (newValues) {
            this._values = newValues;
            this._value = newValues.join(',');
        },
        enumerable: false,
        configurable: true
    });
    return TimingProp;
}(SgfPropBase));
var MiscellaneousProp = /** @class */ (function (_super) {
    tslib.__extends(MiscellaneousProp, _super);
    function MiscellaneousProp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MiscellaneousProp;
}(SgfPropBase));

var liberties = 0;
var recursionPath = [];
/**
 * Calculates the size of a matrix.
 * @param mat The matrix to calculate the size of.
 * @returns An array containing the number of rows and columns in the matrix.
 */
var calcSize = function (mat) {
    var rowsSize = mat.length;
    var columnsSize = mat.length > 0 ? mat[0].length : 0;
    return [rowsSize, columnsSize];
};
/**
 * Calculates the liberty of a stone on the board.
 * @param mat - The board matrix.
 * @param x - The x-coordinate of the stone.
 * @param y - The y-coordinate of the stone.
 * @param ki - The value of the stone.
 */
var calcLibertyCore = function (mat, x, y, ki) {
    var size = calcSize(mat);
    if (x >= 0 && x < size[1] && y >= 0 && y < size[0]) {
        if (mat[x][y] === ki && !recursionPath.includes("".concat(x, ",").concat(y))) {
            recursionPath.push("".concat(x, ",").concat(y));
            calcLibertyCore(mat, x - 1, y, ki);
            calcLibertyCore(mat, x + 1, y, ki);
            calcLibertyCore(mat, x, y - 1, ki);
            calcLibertyCore(mat, x, y + 1, ki);
        }
        else if (mat[x][y] === 0) {
            liberties += 1;
        }
    }
};
var calcLiberty = function (mat, x, y, ki) {
    var size = calcSize(mat);
    liberties = 0;
    recursionPath = [];
    if (x < 0 || y < 0 || x > size[1] - 1 || y > size[0] - 1) {
        return {
            liberty: 4,
            recursionPath: [],
        };
    }
    if (mat[x][y] === 0) {
        return {
            liberty: 4,
            recursionPath: [],
        };
    }
    calcLibertyCore(mat, x, y, ki);
    return {
        liberty: liberties,
        recursionPath: recursionPath,
    };
};
var execCapture = function (mat, i, j, ki) {
    var newArray = mat;
    var _a = calcLiberty(mat, i, j - 1, ki), libertyUp = _a.liberty, recursionPathUp = _a.recursionPath;
    var _b = calcLiberty(mat, i, j + 1, ki), libertyDown = _b.liberty, recursionPathDown = _b.recursionPath;
    var _c = calcLiberty(mat, i - 1, j, ki), libertyLeft = _c.liberty, recursionPathLeft = _c.recursionPath;
    var _d = calcLiberty(mat, i + 1, j, ki), libertyRight = _d.liberty, recursionPathRight = _d.recursionPath;
    if (libertyUp === 0) {
        recursionPathUp.forEach(function (item) {
            var coord = item.split(',');
            newArray[parseInt(coord[0])][parseInt(coord[1])] = 0;
        });
    }
    if (libertyDown === 0) {
        recursionPathDown.forEach(function (item) {
            var coord = item.split(',');
            newArray[parseInt(coord[0])][parseInt(coord[1])] = 0;
        });
    }
    if (libertyLeft === 0) {
        recursionPathLeft.forEach(function (item) {
            var coord = item.split(',');
            newArray[parseInt(coord[0])][parseInt(coord[1])] = 0;
        });
    }
    if (libertyRight === 0) {
        recursionPathRight.forEach(function (item) {
            var coord = item.split(',');
            newArray[parseInt(coord[0])][parseInt(coord[1])] = 0;
        });
    }
    return newArray;
};
var canCapture = function (mat, i, j, ki) {
    var _a = calcLiberty(mat, i, j - 1, ki), libertyUp = _a.liberty, recursionPathUp = _a.recursionPath;
    var _b = calcLiberty(mat, i, j + 1, ki), libertyDown = _b.liberty, recursionPathDown = _b.recursionPath;
    var _c = calcLiberty(mat, i - 1, j, ki), libertyLeft = _c.liberty, recursionPathLeft = _c.recursionPath;
    var _d = calcLiberty(mat, i + 1, j, ki), libertyRight = _d.liberty, recursionPathRight = _d.recursionPath;
    if (libertyUp === 0 && recursionPathUp.length > 0) {
        return true;
    }
    if (libertyDown === 0 && recursionPathDown.length > 0) {
        return true;
    }
    if (libertyLeft === 0 && recursionPathLeft.length > 0) {
        return true;
    }
    if (libertyRight === 0 && recursionPathRight.length > 0) {
        return true;
    }
    return false;
};
/**
 * Compare if two board states are completely identical
 */
var boardStatesEqual = function (board1, board2) {
    if (board1.length !== board2.length)
        return false;
    for (var i = 0; i < board1.length; i++) {
        if (board1[i].length !== board2[i].length)
            return false;
        for (var j = 0; j < board1[i].length; j++) {
            if (board1[i][j] !== board2[i][j])
                return false;
        }
    }
    return true;
};
/**
 * Simulate the board state after making a move at specified position (including captures)
 */
var simulateMoveWithCapture = function (mat, i, j, ki) {
    var newMat = lodash.cloneDeep(mat);
    newMat[i][j] = ki;
    // Execute captures
    return execCapture(newMat, i, j, -ki);
};
var canMove = function (mat, i, j, ki, previousBoardState) {
    var _a, _b;
    if (i < 0 || j < 0 || i >= mat.length || j >= ((_b = (_a = mat[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0)) {
        return false;
    }
    if (mat[i][j] !== 0) {
        return false;
    }
    // Simulate the board state after the move (including captures)
    var boardStateAfterMove = simulateMoveWithCapture(mat, i, j, ki);
    // Ko rule check: if the board state after move is identical to previous state, it violates ko rule
    if (previousBoardState &&
        boardStatesEqual(boardStateAfterMove, previousBoardState)) {
        return false;
    }
    // Check suicide rule: if after placing the stone it has no liberties and cannot capture opponent stones, it's illegal
    var newArray = lodash.cloneDeep(mat);
    newArray[i][j] = ki;
    var liberty = calcLiberty(newArray, i, j, ki).liberty;
    if (canCapture(newArray, i, j, -ki)) {
        return true; // Can capture opponent stones, legal move
    }
    if (canCapture(newArray, i, j, ki)) {
        return false; // Own stones would be captured, illegal move
    }
    if (liberty === 0) {
        return false; // No liberties and cannot capture, illegal move
    }
    return true;
};

/**
 * Represents an SGF (Smart Game Format) file.
 */
var Sgf = /** @class */ (function () {
    /**
     * Constructs a new instance of the Sgf class.
     * @param content The content of the Sgf, either as a string or as a TNode(Root node).
     * @param parseOptions The options for parsing the Sgf content.
     */
    function Sgf(content, parseOptions) {
        if (parseOptions === void 0) { parseOptions = {
            ignorePropList: [],
        }; }
        this.content = content;
        this.parseOptions = parseOptions;
        this.NEW_NODE = ';';
        this.BRANCHING = ['(', ')'];
        this.PROPERTY = ['[', ']'];
        this.LIST_IDENTITIES = [
            'AW',
            'AB',
            'AE',
            'AR',
            'CR',
            'DD',
            'LB',
            'LN',
            'MA',
            'SL',
            'SQ',
            'TR',
            'VW',
            'TB',
            'TW',
        ];
        this.NODE_DELIMITERS = [this.NEW_NODE].concat(this.BRANCHING);
        this.tree = new TreeModel();
        this.root = null;
        this.node = null;
        this.currentNode = null;
        this.parentNode = null;
        this.nodeProps = new Map();
        if (typeof content === 'string') {
            this.parse(content);
        }
        else if (typeof content === 'object') {
            this.setRoot(content);
        }
    }
    /**
     * Sets the root node of the SGF tree.
     *
     * @param root The root node to set.
     * @returns The updated SGF instance.
     */
    Sgf.prototype.setRoot = function (root) {
        this.root = root;
        return this;
    };
    /**
     * Converts the current SGF tree to an SGF string representation.
     * @returns The SGF string representation of the tree.
     */
    Sgf.prototype.toSgf = function () {
        return "(".concat(this.nodeToString(this.root), ")");
    };
    /**
     * Converts the game tree to SGF format without including analysis data.
     *
     * @returns The SGF representation of the game tree.
     */
    Sgf.prototype.toSgfWithoutAnalysis = function () {
        var sgf = "(".concat(this.nodeToString(this.root), ")");
        return lodash.replace(sgf, /](A\[.*?\])/g, ']');
    };
    /**
     * Parses the given SGF (Smart Game Format) string.
     *
     * @param sgf - The SGF string to parse.
     */
    Sgf.prototype.parse = function (sgf) {
        var e_1, _a;
        if (!sgf)
            return;
        // First, get all property value ranges from the original string
        // Use all known SGF property keys from the constants
        var allPropertyKeys = tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray([], tslib.__read(ROOT_PROP_LIST), false), tslib.__read(MOVE_PROP_LIST), false), tslib.__read(SETUP_PROP_LIST), false), tslib.__read(MARKUP_PROP_LIST), false), tslib.__read(NODE_ANNOTATION_PROP_LIST), false), tslib.__read(MOVE_ANNOTATION_PROP_LIST), false), tslib.__read(GAME_INFO_PROP_LIST), false), tslib.__read(CUSTOM_PROP_LIST), false);
        var propertyValueRanges = buildPropertyValueRanges(sgf, allPropertyKeys).sort(function (a, b) { return a[0] - b[0]; });
        // Remove spaces only outside property value ranges
        var processedSgf = '';
        var lastIndex = 0;
        try {
            for (var propertyValueRanges_1 = tslib.__values(propertyValueRanges), propertyValueRanges_1_1 = propertyValueRanges_1.next(); !propertyValueRanges_1_1.done; propertyValueRanges_1_1 = propertyValueRanges_1.next()) {
                var _b = tslib.__read(propertyValueRanges_1_1.value, 2), start = _b[0], end = _b[1];
                // Process text before this property value (remove spaces)
                var beforeProp = sgf.slice(lastIndex, start);
                processedSgf += beforeProp.replace(/\s+/gm, '');
                // Keep property value as-is (preserve spaces)
                var propValue = sgf.slice(start, end);
                processedSgf += propValue;
                lastIndex = end;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (propertyValueRanges_1_1 && !propertyValueRanges_1_1.done && (_a = propertyValueRanges_1.return)) _a.call(propertyValueRanges_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Process remaining text after last property value (remove spaces)
        var remaining = sgf.slice(lastIndex);
        processedSgf += remaining.replace(/\s+/gm, '');
        // Now use the processed SGF for parsing
        sgf = processedSgf;
        var nodeStart = 0;
        var counter = 0;
        var stack = [];
        var inNodeRanges = buildPropertyValueRanges(sgf).sort(function (a, b) { return a[0] - b[0]; });
        var _loop_1 = function (i) {
            var c = sgf[i];
            var insideProp = isInAnyRange(i, inNodeRanges);
            if (this_1.NODE_DELIMITERS.includes(c) && !insideProp) {
                var content = sgf.slice(nodeStart, i);
                if (content !== '') {
                    var moveProps_1 = [];
                    var setupProps_1 = [];
                    var rootProps_1 = [];
                    var markupProps_1 = [];
                    var gameInfoProps_1 = [];
                    var nodeAnnotationProps_1 = [];
                    var moveAnnotationProps_1 = [];
                    var customProps_1 = [];
                    var matches = tslib.__spreadArray([], tslib.__read(content.matchAll(
                    // RegExp(/([A-Z]+\[[a-z\[\]]*\]+)/, 'g')
                    // RegExp(/([A-Z]+\[.*?\]+)/, 'g')
                    // RegExp(/[A-Z]+(\[.*?\]){1,}/, 'g')
                    // RegExp(/[A-Z]+(\[[\s\S]*?\]){1,}/, 'g'),
                    // Simplified regex to handle escaped brackets properly
                    // [^\]\\]|\\.  matches: any char except ] and \, OR any escaped char (\.)
                    RegExp(/\w+(?:\[(?:[^\]\\]|\\.)*\])+/g))), false);
                    matches.forEach(function (m) {
                        var tokenMatch = m[0].match(/([A-Z]+)\[/);
                        if (tokenMatch) {
                            var token = tokenMatch[1];
                            if (MOVE_PROP_LIST.includes(token)) {
                                moveProps_1.push(MoveProp.from(m[0]));
                            }
                            if (SETUP_PROP_LIST.includes(token)) {
                                setupProps_1.push(SetupProp.from(m[0]));
                            }
                            if (ROOT_PROP_LIST.includes(token)) {
                                rootProps_1.push(RootProp.from(m[0]));
                            }
                            if (MARKUP_PROP_LIST.includes(token)) {
                                markupProps_1.push(MarkupProp.from(m[0]));
                            }
                            if (GAME_INFO_PROP_LIST.includes(token)) {
                                gameInfoProps_1.push(GameInfoProp.from(m[0]));
                            }
                            if (NODE_ANNOTATION_PROP_LIST.includes(token)) {
                                nodeAnnotationProps_1.push(NodeAnnotationProp.from(m[0]));
                            }
                            if (MOVE_ANNOTATION_PROP_LIST.includes(token)) {
                                moveAnnotationProps_1.push(MoveAnnotationProp.from(m[0]));
                            }
                            if (CUSTOM_PROP_LIST.includes(token)) {
                                customProps_1.push(CustomProp.from(m[0]));
                            }
                        }
                    });
                    if (matches.length > 0) {
                        var hash = calcHash(this_1.currentNode, moveProps_1);
                        var node = this_1.tree.parse({
                            id: hash,
                            name: hash,
                            index: counter,
                            number: 0,
                            moveProps: moveProps_1,
                            setupProps: setupProps_1,
                            rootProps: rootProps_1,
                            markupProps: markupProps_1,
                            gameInfoProps: gameInfoProps_1,
                            nodeAnnotationProps: nodeAnnotationProps_1,
                            moveAnnotationProps: moveAnnotationProps_1,
                            customProps: customProps_1,
                        });
                        if (this_1.currentNode) {
                            this_1.currentNode.addChild(node);
                            node.model.number = getNodeNumber(node);
                        }
                        else {
                            this_1.root = node;
                            this_1.parentNode = node;
                        }
                        this_1.currentNode = node;
                        counter += 1;
                    }
                }
            }
            if (c === '(' && this_1.currentNode && !insideProp) {
                stack.push(this_1.currentNode);
            }
            if (c === ')' && !insideProp && stack.length > 0) {
                var node = stack.pop();
                if (node) {
                    this_1.currentNode = node;
                }
            }
            if (this_1.NODE_DELIMITERS.includes(c) && !insideProp) {
                nodeStart = i;
            }
        };
        var this_1 = this;
        for (var i = 0; i < sgf.length; i++) {
            _loop_1(i);
        }
    };
    /**
     * Converts a node to a string representation.
     *
     * @param node - The node to convert.
     * @returns The string representation of the node.
     */
    Sgf.prototype.nodeToString = function (node) {
        var _this = this;
        var content = '';
        node.walk(function (n) {
            var _a = n.model, rootProps = _a.rootProps, moveProps = _a.moveProps, customProps = _a.customProps, setupProps = _a.setupProps, markupProps = _a.markupProps, nodeAnnotationProps = _a.nodeAnnotationProps, moveAnnotationProps = _a.moveAnnotationProps, gameInfoProps = _a.gameInfoProps;
            var nodes = lodash.compact(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray(tslib.__spreadArray([], tslib.__read(rootProps), false), tslib.__read(customProps), false), tslib.__read(moveProps), false), tslib.__read(getDeduplicatedProps(setupProps)), false), tslib.__read(getDeduplicatedProps(markupProps)), false), tslib.__read(gameInfoProps), false), tslib.__read(nodeAnnotationProps), false), tslib.__read(moveAnnotationProps), false));
            content += ';';
            nodes.forEach(function (n) {
                content += n.toString();
            });
            if (n.children.length > 1) {
                n.children.forEach(function (child) {
                    content += "(".concat(_this.nodeToString(child), ")");
                });
            }
            return n.children.length < 2;
        });
        return content;
    };
    return Sgf;
}());

var calcDoubtfulMovesThresholdRange = function (threshold) {
    // 8D-9D
    if (threshold >= 25) {
        return {
            evil: { winrateRange: [-1, -0.15], scoreRange: [-100, -3] },
            bad: { winrateRange: [-0.15, -0.1], scoreRange: [-3, -2] },
            poor: { winrateRange: [-0.1, -0.05], scoreRange: [-2, -1] },
            ok: { winrateRange: [-0.05, -0.02], scoreRange: [-1, -0.5] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 5D-7D
    if (threshold >= 23 && threshold < 25) {
        return {
            evil: { winrateRange: [-1, -0.2], scoreRange: [-100, -8] },
            bad: { winrateRange: [-0.2, -0.15], scoreRange: [-8, -4] },
            poor: { winrateRange: [-0.15, -0.05], scoreRange: [-4, -2] },
            ok: { winrateRange: [-0.05, -0.02], scoreRange: [-2, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 3D-5D
    if (threshold >= 20 && threshold < 23) {
        return {
            evil: { winrateRange: [-1, -0.25], scoreRange: [-100, -12] },
            bad: { winrateRange: [-0.25, -0.1], scoreRange: [-12, -5] },
            poor: { winrateRange: [-0.1, -0.05], scoreRange: [-5, -2] },
            ok: { winrateRange: [-0.05, -0.02], scoreRange: [-2, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 1D-3D
    if (threshold >= 18 && threshold < 20) {
        return {
            evil: { winrateRange: [-1, -0.3], scoreRange: [-100, -15] },
            bad: { winrateRange: [-0.3, -0.1], scoreRange: [-15, -7] },
            poor: { winrateRange: [-0.1, -0.05], scoreRange: [-7, -5] },
            ok: { winrateRange: [-0.05, -0.02], scoreRange: [-5, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 5K-1K
    if (threshold >= 13 && threshold < 18) {
        return {
            evil: { winrateRange: [-1, -0.35], scoreRange: [-100, -20] },
            bad: { winrateRange: [-0.35, -0.12], scoreRange: [-20, -10] },
            poor: { winrateRange: [-0.12, -0.08], scoreRange: [-10, -5] },
            ok: { winrateRange: [-0.08, -0.02], scoreRange: [-5, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 5K-10K
    if (threshold >= 8 && threshold < 13) {
        return {
            evil: { winrateRange: [-1, -0.4], scoreRange: [-100, -25] },
            bad: { winrateRange: [-0.4, -0.15], scoreRange: [-25, -10] },
            poor: { winrateRange: [-0.15, -0.1], scoreRange: [-10, -5] },
            ok: { winrateRange: [-0.1, -0.02], scoreRange: [-5, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    // 18K-10K
    if (threshold >= 0 && threshold < 8) {
        return {
            evil: { winrateRange: [-1, -0.45], scoreRange: [-100, -35] },
            bad: { winrateRange: [-0.45, -0.2], scoreRange: [-35, -20] },
            poor: { winrateRange: [-0.2, -0.1], scoreRange: [-20, -10] },
            ok: { winrateRange: [-0.1, -0.02], scoreRange: [-10, -1] },
            good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
            great: { winrateRange: [0, 1], scoreRange: [0, 100] },
        };
    }
    return {
        evil: { winrateRange: [-1, -0.3], scoreRange: [-100, -30] },
        bad: { winrateRange: [-0.3, -0.2], scoreRange: [-30, -20] },
        poor: { winrateRange: [-0.2, -0.1], scoreRange: [-20, -10] },
        ok: { winrateRange: [-0.1, -0.02], scoreRange: [-10, -1] },
        good: { winrateRange: [-0.02, 0], scoreRange: [0, 100] },
        great: { winrateRange: [0, 1], scoreRange: [0, 100] },
    };
};
var round2 = function (v, scale, fixed) {
    if (scale === void 0) { scale = 1; }
    if (fixed === void 0) { fixed = 2; }
    return ((Math.round(v * 100) / 100) * scale).toFixed(fixed);
};
var round3 = function (v, scale, fixed) {
    if (scale === void 0) { scale = 1; }
    if (fixed === void 0) { fixed = 3; }
    return ((Math.round(v * 1000) / 1000) * scale).toFixed(fixed);
};
var isAnswerNode = function (n, kind) {
    var _a;
    var pat = (_a = n.model.customProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'PAT'; });
    return (pat === null || pat === void 0 ? void 0 : pat.value) === kind;
};
var isChoiceNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return !!(c === null || c === void 0 ? void 0 : c.value.includes('CHOICE'));
};
var isTargetNode = isChoiceNode;
var isForceNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return c === null || c === void 0 ? void 0 : c.value.includes('FORCE');
};
var isPreventMoveNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return c === null || c === void 0 ? void 0 : c.value.includes('NOTTHIS');
};
// export const isRightLeaf = (n: TNode) => {
//   return isRightNode(n) && !n.hasChildren();
// };
var isRightNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return !!(c === null || c === void 0 ? void 0 : c.value.includes('RIGHT'));
};
// export const isFirstRightLeaf = (n: TNode) => {
//   const root = n.getPath()[0];
//   const firstRightLeave = root.first((n: TNode) =>
//     isRightLeaf(n)
//   );
//   return firstRightLeave?.model.id === n.model.id;
// };
var isFirstRightNode = function (n) {
    var root = n.getPath()[0];
    var firstRightNode = root.first(function (n) { return isRightNode(n); });
    return (firstRightNode === null || firstRightNode === void 0 ? void 0 : firstRightNode.model.id) === n.model.id;
};
var isVariantNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return !!(c === null || c === void 0 ? void 0 : c.value.includes('VARIANT'));
};
// export const isVariantLeaf = (n: TNode) => {
//   return isVariantNode(n) && !n.hasChildren();
// };
var isWrongNode = function (n) {
    var _a;
    var c = (_a = n.model.nodeAnnotationProps) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.token === 'C'; });
    return (!(c === null || c === void 0 ? void 0 : c.value.includes('VARIANT')) && !(c === null || c === void 0 ? void 0 : c.value.includes('RIGHT'))) || !c;
};
// export const isWrongLeaf = (n: TNode) => {
//   return isWrongNode(n) && !n.hasChildren();
// };
var inPath = function (node, detectionMethod, strategy, preNodes, postNodes) {
    var _a;
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    var path = preNodes !== null && preNodes !== void 0 ? preNodes : node.getPath();
    var postRightNodes = (_a = postNodes === null || postNodes === void 0 ? void 0 : postNodes.filter(function (n) { return detectionMethod(n); })) !== null && _a !== void 0 ? _a : node.all(function (n) { return detectionMethod(n); });
    var preRightNodes = path.filter(function (n) { return detectionMethod(n); });
    switch (strategy) {
        case exports.PathDetectionStrategy.Post:
            return postRightNodes.length > 0;
        case exports.PathDetectionStrategy.Pre:
            return preRightNodes.length > 0;
        case exports.PathDetectionStrategy.Both:
            return preRightNodes.length > 0 || postRightNodes.length > 0;
        default:
            return false;
    }
};
var inRightPath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    return inPath(node, isRightNode, strategy, preNodes, postNodes);
};
var inFirstRightPath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    return inPath(node, isFirstRightNode, strategy, preNodes, postNodes);
};
var inFirstBranchRightPath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Pre; }
    if (!inRightPath(node))
        return false;
    var path = preNodes !== null && preNodes !== void 0 ? preNodes : node.getPath();
    var postRightNodes = postNodes !== null && postNodes !== void 0 ? postNodes : node.all(function () { return true; });
    var result = [];
    switch (strategy) {
        case exports.PathDetectionStrategy.Post:
            result = postRightNodes.filter(function (n) { return n.getIndex() > 0; });
            break;
        case exports.PathDetectionStrategy.Pre:
            result = path.filter(function (n) { return n.getIndex() > 0; });
            break;
        case exports.PathDetectionStrategy.Both:
            result = path.concat(postRightNodes).filter(function (n) { return n.getIndex() > 0; });
            break;
    }
    return result.length === 0;
};
var inChoicePath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    return inPath(node, isChoiceNode, strategy, preNodes, postNodes);
};
var inTargetPath = inChoicePath;
var inVariantPath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    return inPath(node, isVariantNode, strategy, preNodes, postNodes);
};
var inWrongPath = function (node, strategy, preNodes, postNodes) {
    if (strategy === void 0) { strategy = exports.PathDetectionStrategy.Post; }
    return inPath(node, isWrongNode, strategy, preNodes, postNodes);
};
var nFormatter = function (num, fixed) {
    if (fixed === void 0) { fixed = 1; }
    var lookup = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'k' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'G' },
        { value: 1e12, symbol: 'T' },
        { value: 1e15, symbol: 'P' },
        { value: 1e18, symbol: 'E' },
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup
        .slice()
        .reverse()
        .find(function (item) {
        return num >= item.value;
    });
    return item
        ? (num / item.value).toFixed(fixed).replace(rx, '$1') + item.symbol
        : '0';
};
var pathToIndexes = function (path) {
    return path.map(function (n) { return n.model.id; });
};
var pathToInitialStones = function (path, xOffset, yOffset) {
    if (xOffset === void 0) { xOffset = 0; }
    if (yOffset === void 0) { yOffset = 0; }
    var inits = path
        .filter(function (n) { return n.model.setupProps.length > 0; })
        .map(function (n) {
        return n.model.setupProps.map(function (setup) {
            return setup.values.map(function (v) {
                var a = A1_LETTERS[SGF_LETTERS.indexOf(v[0]) + xOffset];
                var b = A1_NUMBERS[SGF_LETTERS.indexOf(v[1]) + yOffset];
                var token = setup.token === 'AB' ? 'B' : 'W';
                return [token, a + b];
            });
        });
    });
    return lodash.flattenDepth(inits[0], 1);
};
var pathToAiMoves = function (path, xOffset, yOffset) {
    if (xOffset === void 0) { xOffset = 0; }
    if (yOffset === void 0) { yOffset = 0; }
    var moves = path
        .filter(function (n) { return n.model.moveProps.length > 0; })
        .map(function (n) {
        var prop = n.model.moveProps[0];
        var a = A1_LETTERS[SGF_LETTERS.indexOf(prop.value[0]) + xOffset];
        var b = A1_NUMBERS[SGF_LETTERS.indexOf(prop.value[1]) + yOffset];
        return [prop.token, a + b];
    });
    return moves;
};
var getIndexFromAnalysis = function (a) {
    if (/indexes/.test(a.id)) {
        return JSON.parse(a.id).indexes[0];
    }
    return '';
};
var isMainPath = function (node) {
    return lodash.sum(node.getPath().map(function (n) { return n.getIndex(); })) === 0;
};
var sgfToPos = function (str) {
    var ki = str[0] === 'B' ? 1 : -1;
    var tempStr = /\[(.*)\]/.exec(str);
    if (tempStr) {
        var pos = tempStr[1];
        var x = SGF_LETTERS.indexOf(pos[0]);
        var y = SGF_LETTERS.indexOf(pos[1]);
        return { x: x, y: y, ki: ki };
    }
    return { x: -1, y: -1, ki: 0 };
};
var sgfToA1 = function (str) {
    var _a = sgfToPos(str), x = _a.x, y = _a.y;
    return A1_LETTERS[x] + A1_NUMBERS[y];
};
var a1ToPos = function (move) {
    var x = A1_LETTERS.indexOf(move[0]);
    var y = A1_NUMBERS.indexOf(parseInt(move.substr(1), 0));
    return { x: x, y: y };
};
var a1ToIndex = function (move, boardSize) {
    if (boardSize === void 0) { boardSize = 19; }
    var x = A1_LETTERS.indexOf(move[0]);
    var y = A1_NUMBERS.indexOf(parseInt(move.substr(1), 0));
    return x * boardSize + y;
};
var sgfOffset = function (sgf, offset) {
    if (offset === void 0) { offset = 0; }
    if (offset === 0)
        return sgf;
    var res = lodash.clone(sgf);
    var charIndex = SGF_LETTERS.indexOf(sgf[2]) - offset;
    return res.substr(0, 2) + SGF_LETTERS[charIndex] + res.substr(2 + 1);
};
var a1ToSGF = function (str, type, offsetX, offsetY) {
    if (type === void 0) { type = 'B'; }
    if (offsetX === void 0) { offsetX = 0; }
    if (offsetY === void 0) { offsetY = 0; }
    if (str === 'pass')
        return "".concat(type, "[]");
    var inx = A1_LETTERS.indexOf(str[0]) + offsetX;
    var iny = A1_NUMBERS.indexOf(parseInt(str.substr(1), 0)) + offsetY;
    var sgf = "".concat(type, "[").concat(SGF_LETTERS[inx]).concat(SGF_LETTERS[iny], "]");
    return sgf;
};
var posToSgf = function (x, y, ki) {
    var ax = SGF_LETTERS[x];
    var ay = SGF_LETTERS[y];
    if (ki === exports.Ki.Empty)
        return '';
    if (ki === exports.Ki.White)
        return "B[".concat(ax).concat(ay, "]");
    if (ki === exports.Ki.Black)
        return "W[".concat(ax).concat(ay, "]");
    return '';
};
var matToPosition = function (mat, xOffset, yOffset) {
    var result = '';
    xOffset = xOffset !== null && xOffset !== void 0 ? xOffset : 0;
    yOffset = yOffset !== null && yOffset !== void 0 ? yOffset : DEFAULT_BOARD_SIZE - mat.length;
    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[i].length; j++) {
            var value = mat[i][j];
            if (value !== 0) {
                var x = A1_LETTERS[i + xOffset];
                var y = A1_NUMBERS[j + yOffset];
                var color = value === 1 ? 'b' : 'w';
                result += "".concat(color, " ").concat(x).concat(y, " ");
            }
        }
    }
    return result;
};
var matToListOfTuples = function (mat, xOffset, yOffset) {
    if (xOffset === void 0) { xOffset = 0; }
    if (yOffset === void 0) { yOffset = 0; }
    var results = [];
    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[i].length; j++) {
            var value = mat[i][j];
            if (value !== 0) {
                var x = A1_LETTERS[i + xOffset];
                var y = A1_NUMBERS[j + yOffset];
                var color = value === 1 ? 'B' : 'W';
                results.push([color, x + y]);
            }
        }
    }
    return results;
};
var convertStoneTypeToString = function (type) { return (type === 1 ? 'B' : 'W'); };
var convertStepsForAI = function (steps, offset) {
    if (offset === void 0) { offset = 0; }
    var res = lodash.clone(steps);
    res = res.map(function (s) { return sgfOffset(s, offset); });
    var header = "(;FF[4]GM[1]SZ[".concat(19 - offset, "]GN[226]PB[Black]HA[0]PW[White]KM[7.5]DT[2017-08-01]TM[1800]RU[Chinese]CP[Copyright ghost-go.com]AP[ghost-go.com]PL[Black];");
    var count = 0;
    var prev = '';
    steps.forEach(function (step, index) {
        if (step[0] === prev[0]) {
            if (step[0] === 'B') {
                res.splice(index + count, 0, 'W[tt]');
                count += 1;
            }
            else {
                res.splice(index + count, 0, 'B[tt]');
                count += 1;
            }
        }
        prev = step;
    });
    return "".concat(header).concat(res.join(';'), ")");
};
var offsetA1Move = function (move, ox, oy) {
    if (ox === void 0) { ox = 0; }
    if (oy === void 0) { oy = 0; }
    if (move === 'pass')
        return move;
    // console.log('oxy', ox, oy);
    var inx = A1_LETTERS.indexOf(move[0]) + ox;
    var iny = A1_NUMBERS.indexOf(parseInt(move.substr(1), 0)) + oy;
    // console.log('inxy', inx, iny, `${A1_LETTERS[inx]}${A1_NUMBERS[iny]}`);
    return "".concat(A1_LETTERS[inx]).concat(A1_NUMBERS[iny]);
};
var reverseOffsetA1Move = function (move, mat, analysis, boardSize) {
    if (boardSize === void 0) { boardSize = 19; }
    if (move === 'pass')
        return move;
    var idObj = JSON.parse(analysis.id);
    var _a = reverseOffset(mat, idObj.bx, idObj.by, boardSize), x = _a.x, y = _a.y;
    var inx = A1_LETTERS.indexOf(move[0]) + x;
    var iny = A1_NUMBERS.indexOf(parseInt(move.substr(1), 0)) + y;
    return "".concat(A1_LETTERS[inx]).concat(A1_NUMBERS[iny]);
};
var calcScoreDiffText = function (rootInfo, currInfo, fixed, reverse) {
    if (fixed === void 0) { fixed = 1; }
    if (reverse === void 0) { reverse = false; }
    if (!rootInfo || !currInfo)
        return '';
    var score = calcScoreDiff(rootInfo, currInfo);
    if (reverse)
        score = -score;
    var fixedScore = score.toFixed(fixed);
    return score > 0 ? "+".concat(fixedScore) : "".concat(fixedScore);
};
var calcWinrateDiffText = function (rootInfo, currInfo, fixed, reverse) {
    if (fixed === void 0) { fixed = 1; }
    if (reverse === void 0) { reverse = false; }
    if (!rootInfo || !currInfo)
        return '';
    var winrate = calcWinrateDiff(rootInfo, currInfo);
    if (reverse)
        winrate = -winrate;
    var fixedWinrate = winrate.toFixed(fixed);
    return winrate >= 0 ? "+".concat(fixedWinrate, "%") : "".concat(fixedWinrate, "%");
};
var calcScoreDiff = function (rootInfo, currInfo) {
    var sign = rootInfo.currentPlayer === 'B' ? 1 : -1;
    var score = Math.round((currInfo.scoreLead - rootInfo.scoreLead) * sign * 1000) / 1000;
    return score;
};
var calcWinrateDiff = function (rootInfo, currInfo) {
    var sign = rootInfo.currentPlayer === 'B' ? 1 : -1;
    var score = Math.round((currInfo.winrate - rootInfo.winrate) * sign * 1000 * 100) /
        1000;
    return score;
};
var calcAnalysisPointColor = function (rootInfo, moveInfo) {
    var prior = moveInfo.prior, order = moveInfo.order;
    var score = calcScoreDiff(rootInfo, moveInfo);
    var pointColor = 'rgba(255, 255, 255, 0.5)';
    if (prior >= 0.5 ||
        (prior >= 0.1 && order < 3 && score > -0.3) ||
        order === 0 ||
        score >= 0) {
        pointColor = LIGHT_GREEN_RGB;
    }
    else if ((prior > 0.05 && score > -0.5) || (prior > 0.01 && score > -0.1)) {
        pointColor = LIGHT_YELLOW_RGB;
    }
    else if (prior > 0.01 && score > -1) {
        pointColor = YELLOW_RGB;
    }
    else {
        pointColor = LIGHT_RED_RGB;
    }
    return pointColor;
};
// export const GoBanDetection = (pixelData, canvas) => {
// const columns = canvas.width;
// const rows = canvas.height;
// const dataType = JsFeat.U8C1_t;
// const distMatrixT = new JsFeat.matrix_t(columns, rows, dataType);
// JsFeat.imgproc.grayscale(pixelData, columns, rows, distMatrixT);
// JsFeat.imgproc.gaussian_blur(distMatrixT, distMatrixT, 2, 0);
// JsFeat.imgproc.canny(distMatrixT, distMatrixT, 50, 50);
// const newPixelData = new Uint32Array(pixelData.buffer);
// const alpha = (0xff << 24);
// let i = distMatrixT.cols * distMatrixT.rows;
// let pix = 0;
// while (i >= 0) {
//   pix = distMatrixT.data[i];
//   newPixelData[i] = alpha | (pix << 16) | (pix << 8) | pix;
//   i -= 1;
// }
// };
var extractPAI = function (n) {
    var pai = n.model.customProps.find(function (p) { return p.token === 'PAI'; });
    if (!pai)
        return;
    var data = JSON.parse(pai.value);
    return data;
};
var extractAnswerType = function (n) {
    var pat = n.model.customProps.find(function (p) { return p.token === 'PAT'; });
    return pat === null || pat === void 0 ? void 0 : pat.value;
};
var extractPI = function (n) {
    var pi = n.model.customProps.find(function (p) { return p.token === 'PI'; });
    if (!pi)
        return;
    var data = JSON.parse(pi.value);
    return data;
};
var initNodeData = function (sha, number) {
    return {
        id: sha,
        name: sha,
        number: number || 0,
        rootProps: [],
        moveProps: [],
        setupProps: [],
        markupProps: [],
        gameInfoProps: [],
        nodeAnnotationProps: [],
        moveAnnotationProps: [],
        customProps: [],
    };
};
/**
 * Creates the initial root node of the tree.
 *
 * @param rootProps - The root properties.
 * @returns The initial root node.
 */
var initialRootNode = function (rootProps) {
    if (rootProps === void 0) { rootProps = [
        'FF[4]',
        'GM[1]',
        'CA[UTF-8]',
        'AP[ghostgo:0.1.0]',
        'SZ[19]',
        'ST[0]',
    ]; }
    var tree = new TreeModel();
    var root = tree.parse({
        // '1b16b1' is the SHA256 hash of the 'n'
        id: '',
        name: '',
        index: 0,
        number: 0,
        rootProps: rootProps.map(function (p) { return RootProp.from(p); }),
        moveProps: [],
        setupProps: [],
        markupProps: [],
        gameInfoProps: [],
        nodeAnnotationProps: [],
        moveAnnotationProps: [],
        customProps: [],
    });
    var hash = calcHash(root);
    root.model.id = hash;
    return root;
};
/**
 * Builds a new tree node with the given move, parent node, and additional properties.
 *
 * @param move - The move to be added to the node.
 * @param parentNode - The parent node of the new node. Optional.
 * @param props - Additional properties to be added to the new node. Optional.
 * @returns The newly created tree node.
 */
var buildMoveNode = function (move, parentNode, props) {
    var tree = new TreeModel();
    var moveProp = MoveProp.from(move);
    var hash = calcHash(parentNode, [moveProp]);
    var number = 1;
    if (parentNode)
        number = getNodeNumber(parentNode) + 1;
    var nodeData = initNodeData(hash, number);
    nodeData.moveProps = [moveProp];
    var node = tree.parse(tslib.__assign(tslib.__assign({}, nodeData), props));
    return node;
};
var getLastIndex = function (root) {
    var lastNode = root;
    root.walk(function (node) {
        // Halt the traversal by returning false
        lastNode = node;
        return true;
    });
    return lastNode.model.index;
};
var cutMoveNodes = function (root, returnRoot) {
    var node = lodash.cloneDeep(root);
    while (node && node.hasChildren() && node.model.moveProps.length === 0) {
        node = node.children[0];
        node.children = [];
    }
    if (returnRoot) {
        while (node && node.parent && !node.isRoot()) {
            node = node.parent;
        }
    }
    return node;
};
var getRoot = function (node) {
    var root = node;
    while (root && root.parent && !root.isRoot()) {
        root = root.parent;
    }
    return root;
};
var zeros = function (size) {
    return new Array(size[0]).fill(0).map(function () { return new Array(size[1]).fill(0); });
};
var empty = function (size) {
    return new Array(size[0]).fill('').map(function () { return new Array(size[1]).fill(''); });
};
var calcMost = function (mat, boardSize) {
    if (boardSize === void 0) { boardSize = 19; }
    var leftMost = boardSize - 1;
    var rightMost = 0;
    var topMost = boardSize - 1;
    var bottomMost = 0;
    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[i].length; j++) {
            var value = mat[i][j];
            if (value !== 0) {
                if (leftMost > i)
                    leftMost = i;
                if (rightMost < i)
                    rightMost = i;
                if (topMost > j)
                    topMost = j;
                if (bottomMost < j)
                    bottomMost = j;
            }
        }
    }
    return { leftMost: leftMost, rightMost: rightMost, topMost: topMost, bottomMost: bottomMost };
};
var calcCenter = function (mat, boardSize) {
    if (boardSize === void 0) { boardSize = 19; }
    var _a = calcMost(mat, boardSize), leftMost = _a.leftMost, rightMost = _a.rightMost, topMost = _a.topMost, bottomMost = _a.bottomMost;
    var top = topMost < boardSize - 1 - bottomMost;
    var left = leftMost < boardSize - 1 - rightMost;
    if (top && left)
        return exports.Center.TopLeft;
    if (!top && left)
        return exports.Center.BottomLeft;
    if (top && !left)
        return exports.Center.TopRight;
    if (!top && !left)
        return exports.Center.BottomRight;
    return exports.Center.Center;
};
var calcBoardSize = function (mat, boardSize, extent) {
    if (boardSize === void 0) { boardSize = 19; }
    if (extent === void 0) { extent = 2; }
    var result = [19, 19];
    var center = calcCenter(mat);
    var _a = calcMost(mat, boardSize), leftMost = _a.leftMost, rightMost = _a.rightMost, topMost = _a.topMost, bottomMost = _a.bottomMost;
    if (center === exports.Center.TopLeft) {
        result[0] = rightMost + extent + 1;
        result[1] = bottomMost + extent + 1;
    }
    if (center === exports.Center.TopRight) {
        result[0] = boardSize - leftMost + extent;
        result[1] = bottomMost + extent + 1;
    }
    if (center === exports.Center.BottomLeft) {
        result[0] = rightMost + extent + 1;
        result[1] = boardSize - topMost + extent;
    }
    if (center === exports.Center.BottomRight) {
        result[0] = boardSize - leftMost + extent;
        result[1] = boardSize - topMost + extent;
    }
    result[0] = Math.min(result[0], boardSize);
    result[1] = Math.min(result[1], boardSize);
    return result;
};
var calcPartialArea = function (mat, extent, boardSize) {
    if (extent === void 0) { extent = 2; }
    if (boardSize === void 0) { boardSize = 19; }
    var _a = calcMost(mat), leftMost = _a.leftMost, rightMost = _a.rightMost, topMost = _a.topMost, bottomMost = _a.bottomMost;
    var size = boardSize - 1;
    var x1 = leftMost - extent < 0 ? 0 : leftMost - extent;
    var y1 = topMost - extent < 0 ? 0 : topMost - extent;
    var x2 = rightMost + extent > size ? size : rightMost + extent;
    var y2 = bottomMost + extent > size ? size : bottomMost + extent;
    return [
        [x1, y1],
        [x2, y2],
    ];
};
var calcAvoidMovesForPartialAnalysis = function (partialArea, boardSize) {
    var e_1, _a, e_2, _b;
    if (boardSize === void 0) { boardSize = 19; }
    var result = [];
    var _c = tslib.__read(partialArea, 2), _d = tslib.__read(_c[0], 2), x1 = _d[0], y1 = _d[1], _e = tslib.__read(_c[1], 2), x2 = _e[0], y2 = _e[1];
    try {
        for (var _f = tslib.__values(A1_LETTERS.slice(0, boardSize)), _g = _f.next(); !_g.done; _g = _f.next()) {
            var col = _g.value;
            try {
                for (var _h = (e_2 = void 0, tslib.__values(A1_NUMBERS.slice(-boardSize))), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var row = _j.value;
                    var x = A1_LETTERS.indexOf(col);
                    var y = A1_NUMBERS.indexOf(row);
                    if (x < x1 || x > x2 || y < y1 || y > y2) {
                        result.push("".concat(col).concat(row));
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
};
var calcTsumegoFrame = function (mat, extent, boardSize, komi, turn, ko) {
    if (boardSize === void 0) { boardSize = 19; }
    if (komi === void 0) { komi = 7.5; }
    if (turn === void 0) { turn = exports.Ki.Black; }
    var result = lodash.cloneDeep(mat);
    var partialArea = calcPartialArea(mat, extent, boardSize);
    var center = calcCenter(mat);
    var putBorder = function (mat) {
        var _a = tslib.__read(partialArea[0], 2), x1 = _a[0], y1 = _a[1];
        var _b = tslib.__read(partialArea[1], 2), x2 = _b[0], y2 = _b[1];
        for (var i = x1; i <= x2; i++) {
            for (var j = y1; j <= y2; j++) {
                if (center === exports.Center.TopLeft &&
                    ((i === x2 && i < boardSize - 1) ||
                        (j === y2 && j < boardSize - 1) ||
                        (i === x1 && i > 0) ||
                        (j === y1 && j > 0))) {
                    mat[i][j] = turn;
                }
                else if (center === exports.Center.TopRight &&
                    ((i === x1 && i > 0) ||
                        (j === y2 && j < boardSize - 1) ||
                        (i === x2 && i < boardSize - 1) ||
                        (j === y1 && j > 0))) {
                    mat[i][j] = turn;
                }
                else if (center === exports.Center.BottomLeft &&
                    ((i === x2 && i < boardSize - 1) ||
                        (j === y1 && j > 0) ||
                        (i === x1 && i > 0) ||
                        (j === y2 && j < boardSize - 1))) {
                    mat[i][j] = turn;
                }
                else if (center === exports.Center.BottomRight &&
                    ((i === x1 && i > 0) ||
                        (j === y1 && j > 0) ||
                        (i === x2 && i < boardSize - 1) ||
                        (j === y2 && j < boardSize - 1))) {
                    mat[i][j] = turn;
                }
                else if (center === exports.Center.Center) {
                    mat[i][j] = turn;
                }
            }
        }
    };
    var putOutside = function (mat) {
        var offenceToWin = 10;
        var offenseKomi = turn * komi;
        var _a = tslib.__read(partialArea[0], 2), x1 = _a[0], y1 = _a[1];
        var _b = tslib.__read(partialArea[1], 2), x2 = _b[0], y2 = _b[1];
        // TODO: Hard code for now
        // const blackToAttack = turn === Ki.Black;
        var blackToAttack = turn === exports.Ki.Black;
        var isize = x2 - x1;
        var jsize = y2 - y1;
        // TODO: 361 is hardcoded
        // const defenseArea = Math.floor(
        //   (361 - isize * jsize - offenseKomi - offenceToWin) / 2
        // );
        var defenseArea = Math.floor((361 - isize * jsize) / 2) - offenseKomi - offenceToWin;
        // const defenseArea = 30;
        // outside the frame
        var count = 0;
        for (var i = 0; i < boardSize; i++) {
            for (var j = 0; j < boardSize; j++) {
                if (i < x1 || i > x2 || j < y1 || j > y2) {
                    count++;
                    var ki = exports.Ki.Empty;
                    if (center === exports.Center.TopLeft || center === exports.Center.BottomLeft) {
                        ki = blackToAttack !== count <= defenseArea ? exports.Ki.White : exports.Ki.Black;
                    }
                    else if (center === exports.Center.TopRight ||
                        center === exports.Center.BottomRight) {
                        ki = blackToAttack !== count <= defenseArea ? exports.Ki.Black : exports.Ki.White;
                    }
                    if ((i + j) % 2 === 0 && Math.abs(count - defenseArea) > boardSize) {
                        ki = exports.Ki.Empty;
                    }
                    mat[i][j] = ki;
                }
            }
        }
    };
    putBorder(result);
    putOutside(result);
    // const flipSpec =
    //   imin < jmin
    //     ? [false, false, true]
    //     : [needFlip(imin, imax, isize), needFlip(jmin, jmax, jsize), false];
    // if (flipSpec.includes(true)) {
    //   const flipped = flipStones(stones, flipSpec);
    //   const filled = tsumegoFrameStones(flipped, komi, blackToPlay, ko, margin);
    //   return flipStones(filled, flipSpec);
    // }
    // const i0 = imin - margin;
    // const i1 = imax + margin;
    // const j0 = jmin - margin;
    // const j1 = jmax + margin;
    // const frameRange: Region = [i0, i1, j0, j1];
    // const blackToAttack = guessBlackToAttack(
    //   [top, bottom, left, right],
    //   [isize, jsize]
    // );
    // putBorder(mat, [isize, jsize], frameRange, blackToAttack);
    // putOutside(
    //   stones,
    //   [isize, jsize],
    //   frameRange,
    //   blackToAttack,
    //   blackToPlay,
    //   komi
    // );
    // putKoThreat(
    //   stones,
    //   [isize, jsize],
    //   frameRange,
    //   blackToAttack,
    //   blackToPlay,
    //   ko
    // );
    // return stones;
    return result;
};
var calcOffset = function (mat) {
    var boardSize = calcBoardSize(mat);
    var ox = 19 - boardSize[0];
    var oy = 19 - boardSize[1];
    var center = calcCenter(mat);
    var oox = ox;
    var ooy = oy;
    switch (center) {
        case exports.Center.TopLeft: {
            oox = 0;
            ooy = oy;
            break;
        }
        case exports.Center.TopRight: {
            oox = -ox;
            ooy = oy;
            break;
        }
        case exports.Center.BottomLeft: {
            oox = 0;
            ooy = 0;
            break;
        }
        case exports.Center.BottomRight: {
            oox = -ox;
            ooy = 0;
            break;
        }
    }
    return { x: oox, y: ooy };
};
var reverseOffset = function (mat, bx, by, boardSize) {
    if (bx === void 0) { bx = 19; }
    if (by === void 0) { by = 19; }
    if (boardSize === void 0) { boardSize = 19; }
    var ox = boardSize - bx;
    var oy = boardSize - by;
    var center = calcCenter(mat);
    var oox = ox;
    var ooy = oy;
    switch (center) {
        case exports.Center.TopLeft: {
            oox = 0;
            ooy = -oy;
            break;
        }
        case exports.Center.TopRight: {
            oox = ox;
            ooy = -oy;
            break;
        }
        case exports.Center.BottomLeft: {
            oox = 0;
            ooy = 0;
            break;
        }
        case exports.Center.BottomRight: {
            oox = ox;
            ooy = 0;
            break;
        }
    }
    return { x: oox, y: ooy };
};
function calcVisibleArea(mat, extent, allowRectangle) {
    if (mat === void 0) { mat = zeros([19, 19]); }
    if (allowRectangle === void 0) { allowRectangle = false; }
    var minRow = mat.length;
    var maxRow = 0;
    var minCol = mat[0].length;
    var maxCol = 0;
    var empty = true;
    for (var i = 0; i < mat.length; i++) {
        for (var j = 0; j < mat[0].length; j++) {
            if (mat[i][j] !== 0) {
                empty = false;
                minRow = Math.min(minRow, i);
                maxRow = Math.max(maxRow, i);
                minCol = Math.min(minCol, j);
                maxCol = Math.max(maxCol, j);
            }
        }
    }
    if (empty) {
        return [
            [0, mat.length - 1],
            [0, mat[0].length - 1],
        ];
    }
    if (!allowRectangle) {
        var minRowWithExtent = Math.max(minRow - extent, 0);
        var maxRowWithExtent = Math.min(maxRow + extent, mat.length - 1);
        var minColWithExtent = Math.max(minCol - extent, 0);
        var maxColWithExtent = Math.min(maxCol + extent, mat[0].length - 1);
        var maxRange = Math.max(maxRowWithExtent - minRowWithExtent, maxColWithExtent - minColWithExtent);
        minRow = minRowWithExtent;
        maxRow = minRow + maxRange;
        if (maxRow >= mat.length) {
            maxRow = mat.length - 1;
            minRow = maxRow - maxRange;
        }
        minCol = minColWithExtent;
        maxCol = minCol + maxRange;
        if (maxCol >= mat[0].length) {
            maxCol = mat[0].length - 1;
            minCol = maxCol - maxRange;
        }
    }
    else {
        minRow = Math.max(0, minRow - extent);
        maxRow = Math.min(mat.length - 1, maxRow + extent);
        minCol = Math.max(0, minCol - extent);
        maxCol = Math.min(mat[0].length - 1, maxCol + extent);
    }
    return [
        [minRow, maxRow],
        [minCol, maxCol],
    ];
}
function move(mat, i, j, ki) {
    if (i < 0 || j < 0)
        return mat;
    var newMat = lodash.cloneDeep(mat);
    newMat[i][j] = ki;
    return execCapture(newMat, i, j, -ki);
}
function showKi(mat, steps, isCaptured) {
    if (isCaptured === void 0) { isCaptured = true; }
    var newMat = lodash.cloneDeep(mat);
    var hasMoved = false;
    steps.forEach(function (str) {
        var _a = sgfToPos(str), x = _a.x, y = _a.y, ki = _a.ki;
        if (isCaptured) {
            if (canMove(newMat, x, y, ki)) {
                newMat[x][y] = ki;
                newMat = execCapture(newMat, x, y, -ki);
                hasMoved = true;
            }
        }
        else {
            newMat[x][y] = ki;
            hasMoved = true;
        }
    });
    return {
        arrangement: newMat,
        hasMoved: hasMoved,
    };
}
// TODO:
var handleMove = function (mat, i, j, turn, currentNode, onAfterMove) {
    if (turn === exports.Ki.Empty)
        return;
    if (canMove(mat, i, j, turn)) {
        // dispatch(uiSlice.actions.setTurn(-turn));
        var value = SGF_LETTERS[i] + SGF_LETTERS[j];
        var token = turn === exports.Ki.Black ? 'B' : 'W';
        var hash_1 = calcHash(currentNode, [MoveProp.from("".concat(token, "[").concat(value, "]"))]);
        var filtered = currentNode.children.filter(function (n) { return n.model.id === hash_1; });
        var node = void 0;
        if (filtered.length > 0) {
            node = filtered[0];
        }
        else {
            node = buildMoveNode("".concat(token, "[").concat(value, "]"), currentNode);
            currentNode.addChild(node);
        }
        if (onAfterMove)
            onAfterMove(node, true);
    }
    else {
        if (onAfterMove)
            onAfterMove(currentNode, false);
    }
};
/**
 * Clear stone from the currentNode
 * @param currentNode
 * @param value
 */
var clearStoneFromCurrentNode = function (currentNode, value) {
    var path = currentNode.getPath();
    path.forEach(function (node) {
        var setupProps = node.model.setupProps;
        if (setupProps.filter(function (s) { return s.value === value; }).length > 0) {
            node.model.setupProps = setupProps.filter(function (s) { return s.value !== value; });
        }
        else {
            setupProps.forEach(function (s) {
                s.values = s.values.filter(function (v) { return v !== value; });
                if (s.values.length === 0) {
                    node.model.setupProps = node.model.setupProps.filter(function (p) { return p.token !== s.token; });
                }
            });
        }
    });
};
/**
 * Adds a stone to the current node in the tree.
 *
 * @param currentNode The current node in the tree.
 * @param mat The matrix representing the board.
 * @param i The row index of the stone.
 * @param j The column index of the stone.
 * @param ki The color of the stone (Ki.White or Ki.Black).
 * @returns True if the stone was removed from previous nodes, false otherwise.
 */
var addStoneToCurrentNode = function (currentNode, mat, i, j, ki) {
    var value = SGF_LETTERS[i] + SGF_LETTERS[j];
    var token = ki === exports.Ki.White ? 'AW' : 'AB';
    var prop = findProp(currentNode, token);
    var result = false;
    if (mat[i][j] !== exports.Ki.Empty) {
        clearStoneFromCurrentNode(currentNode, value);
    }
    else {
        if (prop) {
            prop.values = tslib.__spreadArray(tslib.__spreadArray([], tslib.__read(prop.values), false), [value], false);
        }
        else {
            currentNode.model.setupProps = tslib.__spreadArray(tslib.__spreadArray([], tslib.__read(currentNode.model.setupProps), false), [
                new SetupProp(token, value),
            ], false);
        }
        result = true;
    }
    return result;
};
/**
 * Adds a move to the given matrix and returns the corresponding node in the tree.
 * If the ki is empty, no move is added and null is returned.
 *
 * @param mat - The matrix representing the game board.
 * @param currentNode - The current node in the tree.
 * @param i - The row index of the move.
 * @param j - The column index of the move.
 * @param ki - The type of move (Ki).
 * @returns The corresponding node in the tree, or null if no move is added.
 */
// TODO: The params here is weird
var addMoveToCurrentNode = function (currentNode, mat, i, j, ki) {
    if (ki === exports.Ki.Empty)
        return;
    var previousBoardState = currentNode.parent
        ? calcMatAndMarkup(currentNode.parent).mat
        : null;
    var node;
    if (canMove(mat, i, j, ki, previousBoardState)) {
        var value = SGF_LETTERS[i] + SGF_LETTERS[j];
        var token = ki === exports.Ki.Black ? 'B' : 'W';
        var hash_2 = calcHash(currentNode, [MoveProp.from("".concat(token, "[").concat(value, "]"))]);
        var filtered = currentNode.children.filter(function (n) { return n.model.id === hash_2; });
        if (filtered.length > 0) {
            node = filtered[0];
        }
        else {
            node = buildMoveNode("".concat(token, "[").concat(value, "]"), currentNode);
            currentNode.addChild(node);
        }
    }
    return node;
};
var calcPreventMoveMatForDisplayOnly = function (node, defaultBoardSize) {
    if (defaultBoardSize === void 0) { defaultBoardSize = 19; }
    if (!node)
        return zeros([defaultBoardSize, defaultBoardSize]);
    var size = extractBoardSize(node, defaultBoardSize);
    var preventMoveMat = zeros([size, size]);
    preventMoveMat.forEach(function (row) { return row.fill(1); });
    if (node.hasChildren()) {
        node.children.forEach(function (n) {
            n.model.moveProps.forEach(function (m) {
                var i = SGF_LETTERS.indexOf(m.value[0]);
                var j = SGF_LETTERS.indexOf(m.value[1]);
                if (i >= 0 && j >= 0 && i < size && j < size) {
                    preventMoveMat[i][j] = 0;
                }
            });
        });
    }
    return preventMoveMat;
};
var calcPreventMoveMat = function (node, defaultBoardSize) {
    if (defaultBoardSize === void 0) { defaultBoardSize = 19; }
    if (!node)
        return zeros([defaultBoardSize, defaultBoardSize]);
    var size = extractBoardSize(node, defaultBoardSize);
    var preventMoveMat = zeros([size, size]);
    var preventMoveNodes = [];
    if (node.hasChildren()) {
        preventMoveNodes = node.children.filter(function (n) { return isPreventMoveNode(n); });
    }
    if (isForceNode(node)) {
        preventMoveMat.forEach(function (row) { return row.fill(1); });
        if (node.hasChildren()) {
            node.children.forEach(function (n) {
                n.model.moveProps.forEach(function (m) {
                    var i = SGF_LETTERS.indexOf(m.value[0]);
                    var j = SGF_LETTERS.indexOf(m.value[1]);
                    if (i >= 0 && j >= 0 && i < size && j < size) {
                        preventMoveMat[i][j] = 0;
                    }
                });
            });
        }
    }
    preventMoveNodes.forEach(function (n) {
        n.model.moveProps.forEach(function (m) {
            var i = SGF_LETTERS.indexOf(m.value[0]);
            var j = SGF_LETTERS.indexOf(m.value[1]);
            if (i >= 0 && j >= 0 && i < size && j < size) {
                preventMoveMat[i][j] = 1;
            }
        });
    });
    return preventMoveMat;
};
/**
 * Calculates the markup matrix for variations in a given SGF node.
 *
 * @param node - The SGF node to calculate the markup for.
 * @param policy - The policy for handling the markup. Defaults to 'append'.
 * @returns The calculated markup for the variations.
 */
var calcVariationsMarkup = function (node, policy, activeIndex, defaultBoardSize) {
    if (policy === void 0) { policy = 'append'; }
    if (activeIndex === void 0) { activeIndex = 0; }
    if (defaultBoardSize === void 0) { defaultBoardSize = 19; }
    var res = calcMatAndMarkup(node);
    var mat = res.mat, markup = res.markup;
    var size = extractBoardSize(node, defaultBoardSize);
    if (node.hasChildren()) {
        node.children.forEach(function (n) {
            n.model.moveProps.forEach(function (m) {
                var i = SGF_LETTERS.indexOf(m.value[0]);
                var j = SGF_LETTERS.indexOf(m.value[1]);
                if (i < 0 || j < 0)
                    return;
                if (i < size && j < size) {
                    var mark = exports.Markup.NeutralNode;
                    if (inWrongPath(n)) {
                        mark =
                            n.getIndex() === activeIndex
                                ? exports.Markup.NegativeActiveNode
                                : exports.Markup.NegativeNode;
                    }
                    if (inRightPath(n)) {
                        mark =
                            n.getIndex() === activeIndex
                                ? exports.Markup.PositiveActiveNode
                                : exports.Markup.PositiveNode;
                    }
                    if (mat[i][j] === exports.Ki.Empty) {
                        switch (policy) {
                            case 'prepend':
                                markup[i][j] = mark + '|' + markup[i][j];
                                break;
                            case 'replace':
                                markup[i][j] = mark;
                                break;
                            case 'append':
                            default:
                                markup[i][j] += '|' + mark;
                        }
                    }
                }
            });
        });
    }
    return markup;
};
var detectST = function (node) {
    // Reference: https://www.red-bean.com/sgf/properties.html#ST
    var root = node.getPath()[0];
    var stProp = root.model.rootProps.find(function (p) { return p.token === 'ST'; });
    var showVariationsMarkup = false;
    var showChildrenMarkup = false;
    var showSiblingsMarkup = false;
    var st = (stProp === null || stProp === void 0 ? void 0 : stProp.value) || '0';
    if (st) {
        if (st === '0') {
            showSiblingsMarkup = false;
            showChildrenMarkup = true;
            showVariationsMarkup = true;
        }
        else if (st === '1') {
            showSiblingsMarkup = true;
            showChildrenMarkup = false;
            showVariationsMarkup = true;
        }
        else if (st === '2') {
            showSiblingsMarkup = false;
            showChildrenMarkup = true;
            showVariationsMarkup = false;
        }
        else if (st === '3') {
            showSiblingsMarkup = true;
            showChildrenMarkup = false;
            showVariationsMarkup = false;
        }
    }
    return { showVariationsMarkup: showVariationsMarkup, showChildrenMarkup: showChildrenMarkup, showSiblingsMarkup: showSiblingsMarkup };
};
/**
 * Calculates the mat and markup arrays based on the currentNode and defaultBoardSize.
 * @param currentNode The current node in the tree.
 * @param defaultBoardSize The default size of the board (optional, default is 19).
 * @returns An object containing the mat/visibleAreaMat/markup/numMarkup arrays.
 */
var calcMatAndMarkup = function (currentNode, defaultBoardSize) {
    if (defaultBoardSize === void 0) { defaultBoardSize = 19; }
    var path = currentNode.getPath();
    var root = path[0];
    var li, lj;
    var setupCount = 0;
    var size = extractBoardSize(currentNode, defaultBoardSize);
    var mat = zeros([size, size]);
    var visibleAreaMat = zeros([size, size]);
    var markup = empty([size, size]);
    var numMarkup = empty([size, size]);
    path.forEach(function (node, index) {
        var _a = node.model, moveProps = _a.moveProps, setupProps = _a.setupProps; _a.rootProps;
        if (setupProps.length > 0)
            setupCount += 1;
        moveProps.forEach(function (m) {
            var i = SGF_LETTERS.indexOf(m.value[0]);
            var j = SGF_LETTERS.indexOf(m.value[1]);
            if (i < 0 || j < 0)
                return;
            if (i < size && j < size) {
                li = i;
                lj = j;
                mat = move(mat, i, j, m.token === 'B' ? exports.Ki.Black : exports.Ki.White);
                if (li !== undefined && lj !== undefined && li >= 0 && lj >= 0) {
                    numMarkup[li][lj] = (node.model.number || index - setupCount).toString();
                }
                if (index === path.length - 1) {
                    markup[li][lj] = exports.Markup.Current;
                }
            }
        });
        // Setup props should override move props
        setupProps.forEach(function (setup) {
            setup.values.forEach(function (value) {
                var i = SGF_LETTERS.indexOf(value[0]);
                var j = SGF_LETTERS.indexOf(value[1]);
                if (i < 0 || j < 0)
                    return;
                if (i < size && j < size) {
                    li = i;
                    lj = j;
                    mat[i][j] = setup.token === 'AB' ? 1 : -1;
                    if (setup.token === 'AE')
                        mat[i][j] = 0;
                }
            });
        });
        // If the root node does not include any setup properties
        // check whether its first child is a setup node (i.e., a non-move node)
        // and apply its setup properties instead
        if (setupProps.length === 0 && currentNode.isRoot()) {
            var firstChildNode = currentNode.children[0];
            if (firstChildNode &&
                isSetupNode(firstChildNode) &&
                !isMoveNode(firstChildNode)) {
                var setupProps_1 = firstChildNode.model.setupProps;
                setupProps_1.forEach(function (setup) {
                    setup.values.forEach(function (value) {
                        var i = SGF_LETTERS.indexOf(value[0]);
                        var j = SGF_LETTERS.indexOf(value[1]);
                        if (i < 0 || j < 0)
                            return;
                        if (i < size && j < size) {
                            li = i;
                            lj = j;
                            mat[i][j] = setup.token === 'AB' ? 1 : -1;
                            if (setup.token === 'AE')
                                mat[i][j] = 0;
                        }
                    });
                });
            }
        }
        // Clear number when stones are captured
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                if (mat[i][j] === 0)
                    numMarkup[i][j] = '';
            }
        }
    });
    // Calculating the visible area
    if (root) {
        root.all(function (node) {
            var _a = node.model, moveProps = _a.moveProps, setupProps = _a.setupProps; _a.rootProps;
            if (setupProps.length > 0)
                setupCount += 1;
            setupProps.forEach(function (setup) {
                setup.values.forEach(function (value) {
                    var i = SGF_LETTERS.indexOf(value[0]);
                    var j = SGF_LETTERS.indexOf(value[1]);
                    if (i >= 0 && j >= 0 && i < size && j < size) {
                        visibleAreaMat[i][j] = exports.Ki.Black;
                        if (setup.token === 'AE')
                            visibleAreaMat[i][j] = 0;
                    }
                });
            });
            moveProps.forEach(function (m) {
                var i = SGF_LETTERS.indexOf(m.value[0]);
                var j = SGF_LETTERS.indexOf(m.value[1]);
                if (i >= 0 && j >= 0 && i < size && j < size) {
                    visibleAreaMat[i][j] = exports.Ki.Black;
                }
            });
            return true;
        });
    }
    var markupProps = currentNode.model.markupProps;
    markupProps.forEach(function (m) {
        var token = m.token;
        var values = m.values;
        values.forEach(function (value) {
            var i = SGF_LETTERS.indexOf(value[0]);
            var j = SGF_LETTERS.indexOf(value[1]);
            if (i < 0 || j < 0)
                return;
            if (i < size && j < size) {
                var mark = void 0;
                switch (token) {
                    case 'CR':
                        mark = exports.Markup.Circle;
                        break;
                    case 'SQ':
                        mark = exports.Markup.Square;
                        break;
                    case 'TR':
                        mark = exports.Markup.Triangle;
                        break;
                    case 'MA':
                        mark = exports.Markup.Cross;
                        break;
                    default: {
                        mark = value.split(':')[1];
                    }
                }
                markup[i][j] = mark;
            }
        });
    });
    // if (
    //   li !== undefined &&
    //   lj !== undefined &&
    //   li >= 0 &&
    //   lj >= 0 &&
    //   !markup[li][lj]
    // ) {
    //   markup[li][lj] = Markup.Current;
    // }
    return { mat: mat, visibleAreaMat: visibleAreaMat, markup: markup, numMarkup: numMarkup };
};
/**
 * Finds a property in the given node based on the provided token.
 * @param node The node to search for the property.
 * @param token The token of the property to find.
 * @returns The found property or null if not found.
 */
var findProp = function (node, token) {
    if (!node)
        return;
    if (MOVE_PROP_LIST.includes(token)) {
        return node.model.moveProps.find(function (p) { return p.token === token; });
    }
    if (NODE_ANNOTATION_PROP_LIST.includes(token)) {
        return node.model.nodeAnnotationProps.find(function (p) { return p.token === token; });
    }
    if (MOVE_ANNOTATION_PROP_LIST.includes(token)) {
        return node.model.moveAnnotationProps.find(function (p) { return p.token === token; });
    }
    if (ROOT_PROP_LIST.includes(token)) {
        return node.model.rootProps.find(function (p) { return p.token === token; });
    }
    if (SETUP_PROP_LIST.includes(token)) {
        return node.model.setupProps.find(function (p) { return p.token === token; });
    }
    if (MARKUP_PROP_LIST.includes(token)) {
        return node.model.markupProps.find(function (p) { return p.token === token; });
    }
    if (GAME_INFO_PROP_LIST.includes(token)) {
        return node.model.gameInfoProps.find(function (p) { return p.token === token; });
    }
    return null;
};
/**
 * Finds properties in a given node based on the provided token.
 * @param node - The node to search for properties.
 * @param token - The token to match against the properties.
 * @returns An array of properties that match the provided token.
 */
var findProps = function (node, token) {
    if (MOVE_PROP_LIST.includes(token)) {
        return node.model.moveProps.filter(function (p) { return p.token === token; });
    }
    if (NODE_ANNOTATION_PROP_LIST.includes(token)) {
        return node.model.nodeAnnotationProps.filter(function (p) { return p.token === token; });
    }
    if (MOVE_ANNOTATION_PROP_LIST.includes(token)) {
        return node.model.moveAnnotationProps.filter(function (p) { return p.token === token; });
    }
    if (ROOT_PROP_LIST.includes(token)) {
        return node.model.rootProps.filter(function (p) { return p.token === token; });
    }
    if (SETUP_PROP_LIST.includes(token)) {
        return node.model.setupProps.filter(function (p) { return p.token === token; });
    }
    if (MARKUP_PROP_LIST.includes(token)) {
        return node.model.markupProps.filter(function (p) { return p.token === token; });
    }
    if (GAME_INFO_PROP_LIST.includes(token)) {
        return node.model.gameInfoProps.filter(function (p) { return p.token === token; });
    }
    return [];
};
var genMove = function (node, onRight, onWrong, onVariant, onOffPath) {
    var nextNode;
    var getPath = function (node) {
        var newPath = lodash.compact(node.getPath().map(function (n) { var _a; return (_a = n.model.moveProps[0]) === null || _a === void 0 ? void 0 : _a.toString(); })).join(';');
        return newPath;
    };
    var checkResult = function (node) {
        if (node.hasChildren())
            return;
        var path = getPath(node);
        if (isRightNode(node)) {
            if (onRight)
                onRight(path);
        }
        else if (isVariantNode(node)) {
            if (onVariant)
                onVariant(path);
        }
        else {
            if (onWrong)
                onWrong(path);
        }
    };
    if (node.hasChildren()) {
        var rightNodes = node.children.filter(function (n) { return inRightPath(n); });
        var wrongNodes = node.children.filter(function (n) { return inWrongPath(n); });
        var variantNodes = node.children.filter(function (n) { return inVariantPath(n); });
        nextNode = node;
        if (inRightPath(node) && rightNodes.length > 0) {
            nextNode = lodash.sample(rightNodes);
        }
        else if (inWrongPath(node) && wrongNodes.length > 0) {
            nextNode = lodash.sample(wrongNodes);
        }
        else if (inVariantPath(node) && variantNodes.length > 0) {
            nextNode = lodash.sample(variantNodes);
        }
        else if (isRightNode(node)) {
            onRight(getPath(nextNode));
        }
        else {
            onWrong(getPath(nextNode));
        }
        if (nextNode)
            checkResult(nextNode);
    }
    else {
        checkResult(node);
    }
    return nextNode;
};
var extractBoardSize = function (node, defaultBoardSize) {
    var _a;
    if (defaultBoardSize === void 0) { defaultBoardSize = 19; }
    var root = node.getPath()[0];
    var size = Math.min(parseInt(String(((_a = findProp(root, 'SZ')) === null || _a === void 0 ? void 0 : _a.value) || defaultBoardSize)), MAX_BOARD_SIZE);
    return size;
};
var getFirstToMoveColorFromRoot = function (root, defaultMoveColor) {
    if (defaultMoveColor === void 0) { defaultMoveColor = exports.Ki.Black; }
    if (root) {
        var setupNode = root.first(function (n) { return isSetupNode(n); });
        if (setupNode) {
            var firstMoveNode = setupNode.first(function (n) { return isMoveNode(n); });
            if (!firstMoveNode)
                return defaultMoveColor;
            return getMoveColor(firstMoveNode);
        }
    }
    // console.warn('Default first to move color', defaultMoveColor);
    return defaultMoveColor;
};
var getFirstToMoveColorFromSgf = function (sgf, defaultMoveColor) {
    if (defaultMoveColor === void 0) { defaultMoveColor = exports.Ki.Black; }
    var sgfParser = new Sgf(sgf);
    if (sgfParser.root)
        getFirstToMoveColorFromRoot(sgfParser.root, defaultMoveColor);
    // console.warn('Default first to move color', defaultMoveColor);
    return defaultMoveColor;
};
var getMoveColor = function (node, defaultMoveColor) {
    var _a, _b;
    if (defaultMoveColor === void 0) { defaultMoveColor = exports.Ki.Black; }
    var moveProp = (_b = (_a = node.model) === null || _a === void 0 ? void 0 : _a.moveProps) === null || _b === void 0 ? void 0 : _b[0];
    switch (moveProp === null || moveProp === void 0 ? void 0 : moveProp.token) {
        case 'W':
            return exports.Ki.White;
        case 'B':
            return exports.Ki.Black;
        default:
            // console.warn('Default move color is', defaultMoveColor);
            return defaultMoveColor;
    }
};

var Stone = /** @class */ (function () {
    function Stone(ctx, x, y, ki) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.ki = ki;
        this.globalAlpha = 1;
        this.size = 0;
    }
    Stone.prototype.draw = function () {
        // Base draw method - to be implemented by subclasses
    };
    Stone.prototype.setGlobalAlpha = function (alpha) {
        this.globalAlpha = alpha;
    };
    Stone.prototype.setSize = function (size) {
        this.size = size;
    };
    return Stone;
}());

var FlatStone = /** @class */ (function (_super) {
    tslib.__extends(FlatStone, _super);
    function FlatStone(ctx, x, y, ki, themeContext) {
        var _this = _super.call(this, ctx, x, y, ki) || this;
        _this.themeContext = themeContext;
        return _this;
    }
    /**
     * Get a theme property value with fallback
     */
    FlatStone.prototype.getThemeProperty = function (key) {
        var _a;
        if (!this.themeContext) {
            return BASE_THEME_CONFIG[key];
        }
        var _b = this.themeContext, theme = _b.theme, themeOptions = _b.themeOptions;
        var themeSpecific = themeOptions[theme];
        var defaultConfig = themeOptions.default;
        // Try theme-specific value first, then default
        var result = ((_a = themeSpecific === null || themeSpecific === void 0 ? void 0 : themeSpecific[key]) !== null && _a !== void 0 ? _a : defaultConfig[key]);
        return result;
    };
    FlatStone.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, size = _a.size, ki = _a.ki, globalAlpha = _a.globalAlpha;
        if (size <= 0)
            return;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI, true);
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.getThemeProperty('boardLineColor');
        if (ki === exports.Ki.Black) {
            ctx.fillStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.White) {
            ctx.fillStyle = this.getThemeProperty('flatWhiteColor');
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };
    return FlatStone;
}(Stone));

var ImageStone = /** @class */ (function (_super) {
    tslib.__extends(ImageStone, _super);
    function ImageStone(ctx, x, y, ki, mod, blacks, whites, themeContext) {
        var _this = _super.call(this, ctx, x, y, ki) || this;
        _this.mod = mod;
        _this.blacks = blacks;
        _this.whites = whites;
        _this.themeContext = themeContext;
        // Create FlatStone as fallback option
        if (themeContext) {
            _this.fallbackStone = new FlatStone(ctx, x, y, ki, themeContext);
        }
        return _this;
    }
    ImageStone.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, size = _a.size, ki = _a.ki, blacks = _a.blacks, whites = _a.whites, mod = _a.mod;
        if (size <= 0)
            return;
        var img;
        if (ki === exports.Ki.Black) {
            img = blacks[mod % blacks.length];
        }
        else {
            img = whites[mod % whites.length];
        }
        // Check if image is loaded completely
        if (img && img.complete && img.naturalHeight !== 0) {
            // Image loaded, render with image
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }
        else {
            // Image not loaded or load failed, use FlatStone as fallback
            if (this.fallbackStone) {
                this.fallbackStone.setSize(size);
                this.fallbackStone.draw();
            }
        }
    };
    ImageStone.prototype.setSize = function (size) {
        _super.prototype.setSize.call(this, size);
        // Synchronously update fallbackStone size
        if (this.fallbackStone) {
            this.fallbackStone.setSize(size);
        }
    };
    return ImageStone;
}(Stone));

var AnalysisPoint = /** @class */ (function () {
    function AnalysisPoint(options) {
        var _this = this;
        var _a;
        this.drawProblemAnalysisPoint = function () {
            var _a = _this, ctx = _a.ctx, x = _a.x, y = _a.y, r = _a.r, rootInfo = _a.rootInfo, moveInfo = _a.moveInfo, outlineColor = _a.outlineColor;
            var order = moveInfo.order;
            var pColor = calcAnalysisPointColor(rootInfo, moveInfo);
            if (order < 5) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                ctx.lineWidth = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0)';
                var gradient = ctx.createRadialGradient(x, y, r * 0.9, x, y, r);
                gradient.addColorStop(0, pColor);
                gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0');
                ctx.fillStyle = gradient;
                ctx.fill();
                if (outlineColor) {
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = outlineColor;
                    ctx.stroke();
                }
                var fontSize = r / 1.5;
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = "".concat(fontSize, "px Tahoma");
                var scoreText = calcScoreDiffText(rootInfo, moveInfo);
                ctx.fillText(scoreText, x, y);
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.fillText(nFormatter(moveInfo.visits), x, y + r / 2 + fontSize / 8);
            }
            else {
                _this.drawCandidatePoint();
            }
        };
        this.drawDefaultAnalysisPoint = function () {
            var _a = _this, ctx = _a.ctx, x = _a.x, y = _a.y, r = _a.r, rootInfo = _a.rootInfo, moveInfo = _a.moveInfo;
            var order = moveInfo.order;
            var pColor = calcAnalysisPointColor(rootInfo, moveInfo);
            if (order < 5) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                ctx.lineWidth = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0)';
                var gradient = ctx.createRadialGradient(x, y, r * 0.9, x, y, r);
                gradient.addColorStop(0, pColor);
                gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0');
                ctx.fillStyle = gradient;
                ctx.fill();
                var fontSize = r / 1.5;
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                var winrate = rootInfo.currentPlayer === 'B'
                    ? moveInfo.winrate
                    : 1 - moveInfo.winrate;
                ctx.fillText(round3(winrate, 100, 1), x, y - r / 2 + fontSize / 5);
                ctx.font = "".concat(fontSize, "px Tahoma");
                var scoreText = calcScoreDiffText(rootInfo, moveInfo);
                ctx.fillText(scoreText, x, y + fontSize / 3);
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.fillText(nFormatter(moveInfo.visits), x, y + r / 2 + fontSize / 3);
                var order_1 = moveInfo.order;
                ctx.fillText((order_1 + 1).toString(), x + r, y - r / 2);
            }
            else {
                _this.drawCandidatePoint();
            }
        };
        this.drawScenarioAnalysisPoint = function () {
            var _a = _this, ctx = _a.ctx, x = _a.x, y = _a.y, r = _a.r, rootInfo = _a.rootInfo, moveInfo = _a.moveInfo;
            var order = moveInfo.order;
            var pColor = calcAnalysisPointColor(rootInfo, moveInfo);
            if (order < 9) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                ctx.lineWidth = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0)';
                var gradient = ctx.createRadialGradient(x, y, r * 0.9, x, y, r);
                gradient.addColorStop(0, pColor);
                gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0');
                ctx.fillStyle = gradient;
                ctx.fill();
                var fontSize = r / 1.5;
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                // Display humanPolicy value (from policyValue) or fallback to moveInfo.prior
                // Filter out -1 values (illegal positions in policy array)
                var policy = _this.policyValue !== undefined && _this.policyValue !== -1
                    ? _this.policyValue
                    : moveInfo.prior;
                var policyPercent = round3(policy, 100, 1);
                ctx.fillText(policyPercent, x, y - r / 2 + fontSize / 5);
                ctx.font = "".concat(fontSize, "px Tahoma");
                var scoreText = calcScoreDiffText(rootInfo, moveInfo);
                ctx.fillText(scoreText, x, y + fontSize / 3);
                ctx.font = "".concat(fontSize * 0.8, "px Tahoma");
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.fillText(nFormatter(moveInfo.visits), x, y + r / 2 + fontSize / 3);
                var order_2 = moveInfo.order;
                ctx.fillText((order_2 + 1).toString(), x + r, y - r / 2);
            }
            else {
                _this.drawCandidatePoint();
            }
        };
        this.drawCandidatePoint = function () {
            var _a = _this, ctx = _a.ctx, x = _a.x, y = _a.y, r = _a.r, rootInfo = _a.rootInfo, moveInfo = _a.moveInfo;
            var pColor = calcAnalysisPointColor(rootInfo, moveInfo);
            ctx.beginPath();
            ctx.arc(x, y, r * 0.6, 0, 2 * Math.PI, true);
            ctx.lineWidth = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0)';
            var gradient = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
            gradient.addColorStop(0, pColor);
            gradient.addColorStop(0.95, 'rgba(255, 255, 255, 0');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.stroke();
        };
        this.ctx = options.ctx;
        this.x = options.x;
        this.y = options.y;
        this.r = options.r;
        this.rootInfo = options.rootInfo;
        this.moveInfo = options.moveInfo;
        this.policyValue = options.policyValue;
        this.theme = (_a = options.theme) !== null && _a !== void 0 ? _a : exports.AnalysisPointTheme.Default;
        this.outlineColor = options.outlineColor;
    }
    AnalysisPoint.prototype.draw = function () {
        var _a = this, ctx = _a.ctx; _a.x; _a.y; var r = _a.r; _a.rootInfo; _a.moveInfo; var theme = _a.theme;
        if (r < 0)
            return;
        ctx.save();
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 0;
        // this.drawDefaultAnalysisPoint();
        if (theme === exports.AnalysisPointTheme.Default) {
            this.drawDefaultAnalysisPoint();
        }
        else if (theme === exports.AnalysisPointTheme.Problem) {
            this.drawProblemAnalysisPoint();
        }
        else if (theme === exports.AnalysisPointTheme.Scenario) {
            this.drawScenarioAnalysisPoint();
        }
        ctx.restore();
    };
    return AnalysisPoint;
}());

var Markup = /** @class */ (function () {
    function Markup(ctx, x, y, s, ki, themeContext, val) {
        if (val === void 0) { val = ''; }
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.s = s;
        this.ki = ki;
        this.val = val;
        this.globalAlpha = 1;
        this.color = '';
        this.lineDash = [];
        this.themeContext = themeContext;
    }
    Markup.prototype.draw = function () {
        // Base draw method - to be implemented by subclasses
    };
    Markup.prototype.setGlobalAlpha = function (alpha) {
        this.globalAlpha = alpha;
    };
    Markup.prototype.setColor = function (color) {
        this.color = color;
    };
    Markup.prototype.setLineDash = function (lineDash) {
        this.lineDash = lineDash;
    };
    /**
     * Get a theme property value with fallback
     */
    Markup.prototype.getThemeProperty = function (key) {
        var _a;
        if (!this.themeContext) {
            return BASE_THEME_CONFIG[key];
        }
        var _b = this.themeContext, theme = _b.theme, themeOptions = _b.themeOptions;
        var themeSpecific = themeOptions[theme];
        var defaultConfig = themeOptions.default;
        // Try theme-specific value first, then default
        var result = ((_a = themeSpecific === null || themeSpecific === void 0 ? void 0 : themeSpecific[key]) !== null && _a !== void 0 ? _a : defaultConfig[key]);
        return result;
    };
    return Markup;
}());

var CircleMarkup = /** @class */ (function (_super) {
    tslib.__extends(CircleMarkup, _super);
    function CircleMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CircleMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, globalAlpha = _a.globalAlpha, color = _a.color;
        var radius = s * 0.5;
        var size = radius * 0.65;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.lineWidth = this.getThemeProperty('markupLineWidth');
        ctx.setLineDash(this.lineDash);
        if (ki === exports.Ki.White) {
            ctx.strokeStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.Black) {
            ctx.strokeStyle = this.getThemeProperty('flatWhiteColor');
        }
        else {
            ctx.strokeStyle = this.getThemeProperty('boardLineColor');
            ctx.lineWidth = 3;
        }
        if (color)
            ctx.strokeStyle = color;
        if (size > 0) {
            ctx.arc(x, y, size, 0, 2 * Math.PI, true);
            ctx.stroke();
        }
        ctx.restore();
    };
    return CircleMarkup;
}(Markup));

var CrossMarkup = /** @class */ (function (_super) {
    tslib.__extends(CrossMarkup, _super);
    function CrossMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CrossMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, globalAlpha = _a.globalAlpha;
        var radius = s * 0.5;
        var size = radius * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.globalAlpha = globalAlpha;
        if (ki === exports.Ki.White) {
            ctx.strokeStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.Black) {
            ctx.strokeStyle = this.getThemeProperty('flatWhiteColor');
        }
        else {
            ctx.strokeStyle = this.getThemeProperty('boardLineColor');
            size = radius * 0.58;
        }
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };
    return CrossMarkup;
}(Markup));

var TextMarkup = /** @class */ (function (_super) {
    tslib.__extends(TextMarkup, _super);
    function TextMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TextMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, val = _a.val, globalAlpha = _a.globalAlpha;
        var size = s * 0.8;
        var fontSize = size / 1.5;
        ctx.save();
        ctx.globalAlpha = globalAlpha;
        if (ki === exports.Ki.White) {
            ctx.fillStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.Black) {
            ctx.fillStyle = this.getThemeProperty('flatWhiteColor');
        }
        else {
            ctx.fillStyle = this.getThemeProperty('boardLineColor');
        }
        // else {
        //   ctx.clearRect(x - size / 2, y - size / 2, size, size);
        // }
        if (val.toString().length === 1) {
            fontSize = size / 1.5;
        }
        else if (val.toString().length === 2) {
            fontSize = size / 1.8;
        }
        else {
            fontSize = size / 2.0;
        }
        ctx.font = "bold ".concat(fontSize, "px Tahoma");
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toString(), x, y + 2);
        ctx.restore();
    };
    return TextMarkup;
}(Markup));

var SquareMarkup = /** @class */ (function (_super) {
    tslib.__extends(SquareMarkup, _super);
    function SquareMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SquareMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, globalAlpha = _a.globalAlpha;
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = this.getThemeProperty('markupLineWidth');
        ctx.globalAlpha = globalAlpha;
        var size = s * 0.55;
        if (ki === exports.Ki.White) {
            ctx.strokeStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.Black) {
            ctx.strokeStyle = this.getThemeProperty('flatWhiteColor');
        }
        else {
            ctx.strokeStyle = this.getThemeProperty('boardLineColor');
            ctx.lineWidth = 3;
        }
        ctx.rect(x - size / 2, y - size / 2, size, size);
        ctx.stroke();
        ctx.restore();
    };
    return SquareMarkup;
}(Markup));

var TriangleMarkup = /** @class */ (function (_super) {
    tslib.__extends(TriangleMarkup, _super);
    function TriangleMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TriangleMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, globalAlpha = _a.globalAlpha;
        var radius = s * 0.5;
        var size = radius * 0.75;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size * Math.cos(0.523), y + size * Math.sin(0.523));
        ctx.lineTo(x + size * Math.cos(0.523), y + size * Math.sin(0.523));
        ctx.lineWidth = this.getThemeProperty('markupLineWidth');
        if (ki === exports.Ki.White) {
            ctx.strokeStyle = this.getThemeProperty('flatBlackColor');
        }
        else if (ki === exports.Ki.Black) {
            ctx.strokeStyle = this.getThemeProperty('flatWhiteColor');
        }
        else {
            ctx.strokeStyle = this.getThemeProperty('boardLineColor');
            ctx.lineWidth = 3;
            size = radius * 0.7;
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };
    return TriangleMarkup;
}(Markup));

var NodeMarkup = /** @class */ (function (_super) {
    tslib.__extends(NodeMarkup, _super);
    function NodeMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NodeMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s; _a.ki; var color = _a.color, globalAlpha = _a.globalAlpha;
        var radius = s * 0.5;
        var size = radius * 0.4;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.setLineDash(this.lineDash);
        if (size > 0) {
            ctx.arc(x, y, size, 0, 2 * Math.PI, true);
            ctx.stroke();
        }
        ctx.restore();
    };
    return NodeMarkup;
}(Markup));

var ActiveNodeMarkup = /** @class */ (function (_super) {
    tslib.__extends(ActiveNodeMarkup, _super);
    function ActiveNodeMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ActiveNodeMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s; _a.ki; var color = _a.color, globalAlpha = _a.globalAlpha;
        var radius = s * 0.5;
        var size = radius * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.setLineDash(this.lineDash);
        if (size > 0) {
            ctx.arc(x, y, size, 0, 2 * Math.PI, true);
            ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = color;
        if (size > 0) {
            ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI, true);
            ctx.fill();
        }
        ctx.restore();
    };
    return ActiveNodeMarkup;
}(Markup));

var CircleSolidMarkup = /** @class */ (function (_super) {
    tslib.__extends(CircleSolidMarkup, _super);
    function CircleSolidMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CircleSolidMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki, globalAlpha = _a.globalAlpha, color = _a.color;
        var radius = s * 0.25;
        var size = radius * 0.65;
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = globalAlpha;
        ctx.lineWidth = this.getThemeProperty('markupLineWidth');
        ctx.setLineDash(this.lineDash);
        if (ki === exports.Ki.Black) {
            ctx.fillStyle = this.getThemeProperty('flatWhiteColor');
        }
        else if (ki === exports.Ki.White) {
            ctx.fillStyle = this.getThemeProperty('flatBlackColor');
        }
        else {
            ctx.fillStyle = this.getThemeProperty('boardLineColor');
            ctx.lineWidth = 3;
        }
        if (color)
            ctx.fillStyle = color;
        if (size > 0) {
            ctx.arc(x, y, size, 0, 2 * Math.PI, true);
            ctx.fill();
        }
        ctx.restore();
    };
    return CircleSolidMarkup;
}(Markup));

var HighlightMarkup = /** @class */ (function (_super) {
    tslib.__extends(HighlightMarkup, _super);
    function HighlightMarkup() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HighlightMarkup.prototype.draw = function () {
        var _a = this, ctx = _a.ctx, x = _a.x, y = _a.y, s = _a.s, ki = _a.ki; _a.globalAlpha;
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = this.getThemeProperty('markupLineWidth');
        ctx.globalAlpha = 0.6;
        var size = s * 0.4;
        ctx.fillStyle = this.getThemeProperty('highlightColor');
        if (ki === exports.Ki.White || ki === exports.Ki.Black) {
            size = s * 0.35;
        }
        ctx.arc(x, y, size, 0, 2 * Math.PI, true);
        ctx.fill();
        ctx.restore();
    };
    return HighlightMarkup;
}(Markup));

var EffectBase = /** @class */ (function () {
    function EffectBase(ctx, x, y, size, ki) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.size = size;
        this.ki = ki;
        this.globalAlpha = 1;
        this.color = '';
    }
    EffectBase.prototype.play = function () {
        // Base play method - to be implemented by subclasses
    };
    return EffectBase;
}());

var banSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-ban\" viewBox=\"0 0 16 16\">\n  <path d=\"M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.874ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0\"/>\n</svg>";
var BanEffect = /** @class */ (function (_super) {
    tslib.__extends(BanEffect, _super);
    function BanEffect(ctx, x, y, size, ki) {
        var _this = _super.call(this, ctx, x, y, size, ki) || this;
        _this.ctx = ctx;
        _this.x = x;
        _this.y = y;
        _this.size = size;
        _this.ki = ki;
        _this.img = new Image();
        _this.alpha = 0;
        _this.fadeInDuration = 200;
        _this.fadeOutDuration = 150;
        _this.stayDuration = 400;
        _this.startTime = performance.now();
        _this.isFadingOut = false;
        _this.play = function () {
            if (!_this.img.complete) {
                return;
            }
            var _a = _this, ctx = _a.ctx, x = _a.x, y = _a.y, size = _a.size, img = _a.img, fadeInDuration = _a.fadeInDuration, fadeOutDuration = _a.fadeOutDuration;
            var now = performance.now();
            if (!_this.startTime) {
                _this.startTime = now;
            }
            ctx.clearRect(x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = _this.alpha;
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = 1;
            var elapsed = now - _this.startTime;
            if (!_this.isFadingOut) {
                _this.alpha = Math.min(elapsed / fadeInDuration, 1);
                if (elapsed >= fadeInDuration) {
                    _this.alpha = 1;
                    setTimeout(function () {
                        _this.isFadingOut = true;
                        _this.startTime = performance.now();
                    }, _this.stayDuration);
                }
            }
            else {
                var fadeElapsed = now - _this.startTime;
                _this.alpha = Math.max(1 - fadeElapsed / fadeOutDuration, 0);
                if (fadeElapsed >= fadeOutDuration) {
                    _this.alpha = 0;
                    ctx.clearRect(x - size / 2, y - size / 2, size, size);
                    return;
                }
            }
            requestAnimationFrame(_this.play);
        };
        // Convert SVG string to a data URL
        new Blob([banSvg], { type: 'image/svg+xml' });
        var svgDataUrl = "data:image/svg+xml;base64,".concat(jsBase64.encode(banSvg));
        _this.img = new Image();
        _this.img.src = svgDataUrl;
        return _this;
    }
    return BanEffect;
}(EffectBase));

var _a;
var getThemeResources = function (theme, themeResources, boardSize) {
    var _a, _b, _c, _d;
    if (boardSize === void 0) { boardSize = 512; }
    var resources = themeResources[theme];
    if (!resources)
        return null;
    // If board size < 256 and microRes exists, use microRes resources
    if (boardSize < 256 && resources.microRes) {
        return {
            board: resources.microRes.board || resources.board,
            blacks: ((_a = resources.microRes.blacks) === null || _a === void 0 ? void 0 : _a.length) > 0
                ? resources.microRes.blacks
                : resources.blacks,
            whites: ((_b = resources.microRes.whites) === null || _b === void 0 ? void 0 : _b.length) > 0
                ? resources.microRes.whites
                : resources.whites,
        };
    }
    // If board size < 512 and lowRes exists, use lowRes resources
    if (boardSize < 512 && resources.lowRes) {
        return {
            board: resources.lowRes.board || resources.board,
            blacks: ((_c = resources.lowRes.blacks) === null || _c === void 0 ? void 0 : _c.length) > 0
                ? resources.lowRes.blacks
                : resources.blacks,
            whites: ((_d = resources.lowRes.whites) === null || _d === void 0 ? void 0 : _d.length) > 0
                ? resources.lowRes.whites
                : resources.whites,
        };
    }
    // Otherwise use regular resources
    return {
        board: resources.board,
        blacks: resources.blacks,
        whites: resources.whites,
    };
};
// Get all theme resources for preloading (all resolutions)
var getAllThemeResources = function (theme, themeResources) {
    var resources = themeResources[theme];
    if (!resources)
        return [];
    var allImages = [];
    // Add regular resolution resources
    if (resources.board)
        allImages.push(resources.board);
    if (resources.blacks)
        allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.blacks), false));
    if (resources.whites)
        allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.whites), false));
    // Add lowRes resources if they exist
    if (resources.lowRes) {
        if (resources.lowRes.board)
            allImages.push(resources.lowRes.board);
        if (resources.lowRes.blacks)
            allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.lowRes.blacks), false));
        if (resources.lowRes.whites)
            allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.lowRes.whites), false));
    }
    // Add microRes resources if they exist
    if (resources.microRes) {
        if (resources.microRes.board)
            allImages.push(resources.microRes.board);
        if (resources.microRes.blacks)
            allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.microRes.blacks), false));
        if (resources.microRes.whites)
            allImages.push.apply(allImages, tslib.__spreadArray([], tslib.__read(resources.microRes.whites), false));
    }
    // Remove duplicates
    return Array.from(new Set(allImages));
};
var images = {};
// Helper function to set high-quality image smoothing for canvas context
var setImageSmoothingQuality = function (ctx) {
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
};
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
function preload(urls, done, onImageLoaded) {
    var loaded = 0;
    var imageLoaded = function () {
        loaded++;
        if (loaded === urls.length) {
            done();
        }
    };
    var _loop_1 = function (i) {
        if (!images[urls[i]]) {
            images[urls[i]] = new Image();
            images[urls[i]].src = urls[i];
            images[urls[i]].onload = function () {
                imageLoaded();
                // Callback when single image load completes
                if (onImageLoaded) {
                    onImageLoaded(urls[i]);
                }
            };
            images[urls[i]].onerror = function () {
                imageLoaded();
            };
        }
        else if (images[urls[i]].complete) {
            // Image already loaded
            imageLoaded();
        }
    };
    for (var i = 0; i < urls.length; i++) {
        _loop_1(i);
    }
}
var dpr = 1.0;
if (typeof window !== 'undefined') {
    dpr = window.devicePixelRatio || 1.0;
}
var DEFAULT_THEME_OPTIONS = (_a = {
        default: BASE_THEME_CONFIG
    },
    _a[exports.Theme.Flat] = {
        boardBackgroundColor: '#e6bb85',
    },
    _a[exports.Theme.Warm] = {
        boardBackgroundColor: '#C18B50',
    },
    _a[exports.Theme.Dark] = {
        activeColor: '#9CA3AF',
        inactiveColor: '#666666',
        boardLineColor: '#9CA3AF',
        boardBackgroundColor: '#2B3035',
    },
    _a[exports.Theme.YunziMonkeyDark] = {
        activeColor: '#A1C9AF',
        inactiveColor: '#A1C9AF',
        boardLineColor: '#A1C9AF',
        flatBlackColor: '#0E2019',
        flatBlackColorAlt: '#021D11',
        flatWhiteColor: '#A2C8B4',
        flatWhiteColorAlt: '#AFCBBC',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        stoneRatio: 0.5115,
    },
    _a[exports.Theme.HighContrast] = {
        // High contrast theme, friendly for all types of color blindness
        boardBackgroundColor: '#F5F5DC', // Beige background, gentle on eyes
        boardLineColor: '#2F4F4F', // Dark slate gray lines for high contrast
        activeColor: '#2F4F4F',
        inactiveColor: '#808080',
        // Stone colors: traditional black and white for maximum contrast and color blind friendliness
        flatBlackColor: '#000000', // Pure black - universally accessible
        flatBlackColorAlt: '#1A1A1A', // Very dark gray variant
        flatWhiteColor: '#FFFFFF', // Pure white - maximum contrast with black
        flatWhiteColorAlt: '#F8F8F8', // Very light gray variant
        // Node and markup colors - using colorblind-friendly colors that avoid red-green combinations
        positiveNodeColor: '#0284C7', // Blue (positive) - safe for all color blindness types
        negativeNodeColor: '#EA580C', // Orange (negative) - distinguishable from blue for all users
        neutralNodeColor: '#7C2D12', // Brown (neutral) - alternative to problematic colors
        defaultNodeColor: '#4B5563', // Dark gray
        warningNodeColor: '#FBBF24', // Bright yellow warning
        // Highlight and shadow
        highlightColor: '#FDE047', // Bright yellow highlight
        shadowColor: '#374151', // Dark gray shadow
    },
    _a);
var GhostBan = /** @class */ (function () {
    function GhostBan(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this.defaultOptions = {
            boardSize: 19,
            dynamicPadding: false,
            padding: 10,
            extent: 3,
            interactive: false,
            coordinate: true,
            theme: exports.Theme.BlackAndWhite,
            analysisPointTheme: exports.AnalysisPointTheme.Default,
            background: false,
            showAnalysis: false,
            showOwnership: false,
            adaptiveBoardLine: true,
            themeOptions: DEFAULT_THEME_OPTIONS,
            themeResources: THEME_RESOURCES,
            moveSound: false,
            adaptiveStarSize: true,
            mobileIndicatorOffset: 0,
        };
        this.cursor = exports.Cursor.None;
        this.cursorValue = '';
        this.touchMoving = false;
        this.touchStartPoint = new DOMPoint();
        this.cursorPoint = new DOMPoint();
        this.actualCursorPoint = new DOMPoint();
        this.previousBoardState = null;
        this.nodeMarkupStyles = {};
        this.setCursorWithRender = function (domPoint, offsetY) {
            var _a, _b;
            if (offsetY === void 0) { offsetY = 0; }
            var padding = _this.options.padding;
            var space = _this.calcSpaceAndPadding().space;
            var point = _this.transMat.inverse().transformPoint(domPoint);
            var idx = Math.round((point.x - padding + space / 2) / space);
            var idy = Math.round((point.y - padding + space / 2) / space) + offsetY;
            var xx = idx * space;
            var yy = idy * space;
            var pointOnCanvas = new DOMPoint(xx, yy);
            var p = _this.transMat.transformPoint(pointOnCanvas);
            _this.actualCursorPoint = p;
            _this.actualCursorPosition = [idx - 1, idy - 1];
            if (((_b = (_a = _this.preventMoveMat) === null || _a === void 0 ? void 0 : _a[idx - 1]) === null || _b === void 0 ? void 0 : _b[idy - 1]) === 1) {
                _this.cursorPosition = [-1, -1];
                _this.cursorPoint = new DOMPoint();
                _this.drawCursor();
                return;
            }
            _this.cursorPoint = p;
            _this.cursorPosition = [idx - 1, idy - 1];
            _this.drawCursor();
            if (isMobileDevice())
                _this.drawBoard();
        };
        this.onMouseMove = function (e) {
            var canvas = _this.cursorCanvas;
            if (!canvas)
                return;
            e.preventDefault();
            var point = new DOMPoint(e.offsetX * dpr, e.offsetY * dpr);
            _this.setCursorWithRender(point);
        };
        this.calcTouchPoint = function (e) {
            var point = new DOMPoint();
            var canvas = _this.cursorCanvas;
            if (!canvas)
                return point;
            var rect = canvas.getBoundingClientRect();
            var touches = e.changedTouches;
            point = new DOMPoint((touches[0].clientX - rect.left) * dpr, (touches[0].clientY - rect.top) * dpr);
            return point;
        };
        this.onTouchStart = function (e) {
            var canvas = _this.cursorCanvas;
            if (!canvas)
                return;
            e.preventDefault();
            _this.touchMoving = true;
            var point = _this.calcTouchPoint(e);
            _this.touchStartPoint = point;
            _this.setCursorWithRender(point);
        };
        this.onTouchMove = function (e) {
            var canvas = _this.cursorCanvas;
            if (!canvas)
                return;
            e.preventDefault();
            _this.touchMoving = true;
            var point = _this.calcTouchPoint(e);
            var offset = 0;
            var distance = 10;
            if (Math.abs(point.x - _this.touchStartPoint.x) > distance ||
                Math.abs(point.y - _this.touchStartPoint.y) > distance) {
                offset = _this.options.mobileIndicatorOffset;
            }
            _this.setCursorWithRender(point, offset);
        };
        this.onTouchEnd = function () {
            _this.touchMoving = false;
        };
        this.calcCenter = function () {
            var visibleArea = _this.visibleArea;
            var boardSize = _this.options.boardSize;
            if ((visibleArea[0][0] === 0 && visibleArea[0][1] === boardSize - 1) ||
                (visibleArea[1][0] === 0 && visibleArea[1][1] === boardSize - 1)) {
                return exports.Center.Center;
            }
            if (visibleArea[0][0] === 0) {
                if (visibleArea[1][0] === 0)
                    return exports.Center.TopLeft;
                else if (visibleArea[1][1] === boardSize - 1)
                    return exports.Center.BottomLeft;
                else
                    return exports.Center.Left;
            }
            else if (visibleArea[0][1] === boardSize - 1) {
                if (visibleArea[1][0] === 0)
                    return exports.Center.TopRight;
                else if (visibleArea[1][1] === boardSize - 1)
                    return exports.Center.BottomRight;
                else
                    return exports.Center.Right;
            }
            else {
                if (visibleArea[1][0] === 0)
                    return exports.Center.Top;
                else if (visibleArea[1][1] === boardSize - 1)
                    return exports.Center.Bottom;
                else
                    return exports.Center.Center;
            }
        };
        this.clearAllCanvas = function () {
            _this.clearCanvas(_this.board);
            _this.clearCanvas();
            _this.clearCanvas(_this.markupCanvas);
            _this.clearOwnershipCanvas();
            _this.clearCanvas(_this.effectCanvas);
            _this.clearCursorCanvas();
            _this.clearAnalysisCanvas();
        };
        this.clearBoard = function () {
            if (!_this.board)
                return;
            var ctx = _this.board.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.restore();
            }
        };
        this.clearCanvas = function (canvas) {
            if (canvas === void 0) { canvas = _this.canvas; }
            if (!canvas)
                return;
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        };
        this.clearMarkupCanvas = function () {
            if (!_this.markupCanvas)
                return;
            var ctx = _this.markupCanvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, _this.markupCanvas.width, _this.markupCanvas.height);
                ctx.restore();
            }
        };
        this.clearCursorCanvas = function () {
            if (!_this.cursorCanvas)
                return;
            _this.options.boardSize;
            var ctx = _this.cursorCanvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, _this.cursorCanvas.width, _this.cursorCanvas.height);
                ctx.restore();
            }
        };
        this.clearAnalysisCanvas = function () {
            if (!_this.analysisCanvas)
                return;
            var ctx = _this.analysisCanvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, _this.analysisCanvas.width, _this.analysisCanvas.height);
                ctx.restore();
            }
        };
        this.drawAnalysis = function (analysis) {
            if (analysis === void 0) { analysis = _this.analysis; }
            var canvas = _this.analysisCanvas;
            var _a = _this.options, _b = _a.theme, theme = _b === void 0 ? exports.Theme.BlackAndWhite : _b, analysisPointTheme = _a.analysisPointTheme, boardSize = _a.boardSize; _a.forceAnalysisBoardSize;
            var _c = _this, mat = _c.mat, markup = _c.markup;
            if (!canvas || !analysis)
                return;
            var ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            _this.clearAnalysisCanvas();
            var rootInfo = analysis.rootInfo;
            analysis.moveInfos.forEach(function (m) {
                if (m.move === 'pass')
                    return;
                var idObj = JSON.parse(analysis.id);
                var analysisBoardSize = boardSize;
                var offsetedMove = offsetA1Move(m.move, 0, analysisBoardSize - idObj.by);
                var _a = a1ToPos(offsetedMove), i = _a.x, j = _a.y;
                if (mat[i][j] !== 0)
                    return;
                var _b = _this.calcSpaceAndPadding(), space = _b.space, scaledPadding = _b.scaledPadding;
                var x = scaledPadding + i * space;
                var y = scaledPadding + j * space;
                var ratio = 0.46;
                ctx.save();
                if (theme !== exports.Theme.Subdued &&
                    theme !== exports.Theme.BlackAndWhite &&
                    theme !== exports.Theme.Flat &&
                    theme !== exports.Theme.Warm &&
                    theme !== exports.Theme.Dark) {
                    ctx.shadowOffsetX = 30;
                    ctx.shadowOffsetY = 30;
                    ctx.shadowColor = _this.getThemeProperty(exports.ThemePropertyKey.ShadowColor);
                    ctx.shadowBlur = 8;
                }
                else {
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 0;
                }
                var outlineColor;
                if (markup[i][j].includes(exports.Markup.PositiveNode)) {
                    outlineColor = _this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor);
                }
                if (markup[i][j].includes(exports.Markup.NegativeNode)) {
                    outlineColor = _this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor);
                }
                if (markup[i][j].includes(exports.Markup.NeutralNode)) {
                    outlineColor = _this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor);
                }
                var policyValue;
                // Convert m.move to row-major index for policy array
                // KataGo's policy array is stored in row-major order: policy[row * boardSize + col]
                var _c = a1ToPos(m.move), col = _c.x, row = _c.y;
                var policyIndex = row * analysisBoardSize + col;
                if (analysisPointTheme === exports.AnalysisPointTheme.Scenario) {
                    if (analysis.humanPolicy && analysis.humanPolicy.length > 0) {
                        policyValue = analysis.humanPolicy[policyIndex];
                    }
                }
                var point = new AnalysisPoint({
                    ctx: ctx,
                    x: x,
                    y: y,
                    r: space * ratio,
                    rootInfo: rootInfo,
                    moveInfo: m,
                    policyValue: policyValue,
                    theme: analysisPointTheme,
                    outlineColor: outlineColor,
                });
                point.draw();
                ctx.restore();
            });
        };
        this.clearOwnershipCanvas = function () {
            if (!_this.ownershipCanvas)
                return;
            var ctx = _this.ownershipCanvas.getContext('2d');
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, _this.ownershipCanvas.width, _this.ownershipCanvas.height);
                ctx.restore();
            }
        };
        this.drawOwnership = function (ownership, ownershipCanvas, clear) {
            var _a, _b, _c;
            if (ownership === void 0) { ownership = (_b = (_a = _this.analysis) === null || _a === void 0 ? void 0 : _a.ownership) !== null && _b !== void 0 ? _b : null; }
            if (ownershipCanvas === void 0) { ownershipCanvas = _this.ownershipCanvas; }
            if (clear === void 0) { clear = true; }
            var canvas = ownershipCanvas;
            if (!canvas || !ownership)
                return;
            var ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            if (clear)
                _this.clearOwnershipCanvas();
            var _d = _this.calcSpaceAndPadding(), space = _d.space, scaledPadding = _d.scaledPadding;
            var boardSize = _this.options.boardSize;
            for (var i = 0; i < boardSize; i++) {
                for (var j = 0; j < boardSize; j++) {
                    // row-major order
                    var index = j * boardSize + i;
                    var ownershipValue = ownership[index];
                    if (Math.abs(ownershipValue) < 0.1)
                        continue;
                    var stoneValue = ((_c = _this.mat[i]) === null || _c === void 0 ? void 0 : _c[j]) || 0;
                    var shouldShow = stoneValue === 0 ||
                        (stoneValue === exports.Ki.Black && ownershipValue < 0) ||
                        (stoneValue === exports.Ki.White && ownershipValue > 0);
                    if (!shouldShow)
                        continue;
                    var x = scaledPadding + i * space;
                    var y = scaledPadding + j * space;
                    var squareSize = space * 0.3;
                    ctx.save();
                    var minOpacity = 0.15;
                    var rawOpacity = Math.min(Math.abs(ownershipValue), 1);
                    var opacity = minOpacity + rawOpacity * (1 - minOpacity);
                    if (ownershipValue > 0) {
                        ctx.fillStyle = "rgba(0, 0, 0, ".concat(opacity, ")");
                    }
                    else {
                        ctx.fillStyle = "rgba(255, 255, 255, ".concat(opacity, ")");
                    }
                    ctx.fillRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize);
                    ctx.restore();
                }
            }
        };
        this.drawMarkup = function (mat, markup, markupCanvas, clear) {
            if (mat === void 0) { mat = _this.mat; }
            if (markup === void 0) { markup = _this.markup; }
            if (markupCanvas === void 0) { markupCanvas = _this.markupCanvas; }
            if (clear === void 0) { clear = true; }
            var canvas = markupCanvas;
            _this.options.theme;
            if (canvas) {
                if (clear)
                    _this.clearCanvas(canvas);
                var _loop_2 = function (i) {
                    var _loop_3 = function (j) {
                        var values = markup[i][j];
                        values === null || values === void 0 ? void 0 : values.split('|').forEach(function (value) {
                            if (value !== null && value !== '') {
                                var _a = _this.calcSpaceAndPadding(), space = _a.space, scaledPadding = _a.scaledPadding;
                                var x = scaledPadding + i * space;
                                var y = scaledPadding + j * space;
                                var ki = mat[i][j];
                                var markup_1;
                                var ctx = canvas.getContext('2d');
                                if (ctx) {
                                    switch (value) {
                                        case exports.Markup.Circle: {
                                            markup_1 = new CircleMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        case exports.Markup.Current: {
                                            markup_1 = new CircleSolidMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        case exports.Markup.PositiveActiveNode:
                                        case exports.Markup.PositiveDashedActiveNode:
                                        case exports.Markup.PositiveDottedActiveNode:
                                        case exports.Markup.NegativeActiveNode:
                                        case exports.Markup.NegativeDashedActiveNode:
                                        case exports.Markup.NegativeDottedActiveNode:
                                        case exports.Markup.NeutralActiveNode:
                                        case exports.Markup.NeutralDashedActiveNode:
                                        case exports.Markup.NeutralDottedActiveNode:
                                        case exports.Markup.WarningActiveNode:
                                        case exports.Markup.WarningDashedActiveNode:
                                        case exports.Markup.WarningDottedActiveNode:
                                        case exports.Markup.DefaultActiveNode:
                                        case exports.Markup.DefaultDashedActiveNode:
                                        case exports.Markup.DefaultDottedActiveNode: {
                                            var _b = _this.nodeMarkupStyles[value], color = _b.color, lineDash = _b.lineDash;
                                            markup_1 = new ActiveNodeMarkup(ctx, x, y, space, ki, _this.createThemeContext(), exports.Markup.Circle);
                                            markup_1.setColor(color);
                                            markup_1.setLineDash(lineDash);
                                            break;
                                        }
                                        case exports.Markup.PositiveNode:
                                        case exports.Markup.PositiveDashedNode:
                                        case exports.Markup.PositiveDottedNode:
                                        case exports.Markup.NegativeNode:
                                        case exports.Markup.NegativeDashedNode:
                                        case exports.Markup.NegativeDottedNode:
                                        case exports.Markup.NeutralNode:
                                        case exports.Markup.NeutralDashedNode:
                                        case exports.Markup.NeutralDottedNode:
                                        case exports.Markup.WarningNode:
                                        case exports.Markup.WarningDashedNode:
                                        case exports.Markup.WarningDottedNode:
                                        case exports.Markup.DefaultNode:
                                        case exports.Markup.DefaultDashedNode:
                                        case exports.Markup.DefaultDottedNode:
                                        case exports.Markup.Node: {
                                            var _c = _this.nodeMarkupStyles[value], color = _c.color, lineDash = _c.lineDash;
                                            markup_1 = new NodeMarkup(ctx, x, y, space, ki, _this.createThemeContext(), exports.Markup.Circle);
                                            markup_1.setColor(color);
                                            markup_1.setLineDash(lineDash);
                                            break;
                                        }
                                        case exports.Markup.Square: {
                                            markup_1 = new SquareMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        case exports.Markup.Triangle: {
                                            markup_1 = new TriangleMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        case exports.Markup.Cross: {
                                            markup_1 = new CrossMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        case exports.Markup.Highlight: {
                                            markup_1 = new HighlightMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                                            break;
                                        }
                                        default: {
                                            if (value !== '') {
                                                markup_1 = new TextMarkup(ctx, x, y, space, ki, _this.createThemeContext(), value);
                                            }
                                            break;
                                        }
                                    }
                                    markup_1 === null || markup_1 === void 0 ? void 0 : markup_1.draw();
                                }
                            }
                        });
                    };
                    for (var j = 0; j < markup[i].length; j++) {
                        _loop_3(j);
                    }
                };
                for (var i = 0; i < markup.length; i++) {
                    _loop_2(i);
                }
            }
        };
        this.drawBoard = function (board, clear) {
            if (board === void 0) { board = _this.board; }
            if (clear === void 0) { clear = true; }
            if (clear)
                _this.clearCanvas(board);
            _this.drawBan(board);
            _this.drawBoardLine(board);
            _this.drawStars(board);
            if (_this.options.coordinate) {
                _this.drawCoordinate();
            }
        };
        this.drawBan = function (board) {
            if (board === void 0) { board = _this.board; }
            var _a = _this.options, theme = _a.theme, themeResources = _a.themeResources; _a.padding;
            if (board) {
                board.style.borderRadius = '2px';
                var ctx = board.getContext('2d');
                if (ctx) {
                    setImageSmoothingQuality(ctx);
                    if (theme === exports.Theme.BlackAndWhite ||
                        theme === exports.Theme.Flat ||
                        theme === exports.Theme.Warm ||
                        theme === exports.Theme.Dark ||
                        theme === exports.Theme.HighContrast) {
                        board.style.boxShadow =
                            theme === exports.Theme.BlackAndWhite ? '0px 0px 0px #000000' : '';
                        ctx.fillStyle = _this.getThemeProperty(exports.ThemePropertyKey.BoardBackgroundColor);
                        // ctx.fillRect(
                        //   -padding,
                        //   -padding,
                        //   board.width + padding,
                        //   board.height + padding
                        // );
                        ctx.fillRect(0, 0, board.width, board.height);
                    }
                    else {
                        var boardPixelSize = board.width;
                        var resources = getThemeResources(theme, themeResources, boardPixelSize);
                        if (resources && resources.board) {
                            var boardUrl = resources.board;
                            var boardRes = images[boardUrl];
                            if (boardRes) {
                                if (theme === exports.Theme.Walnut || theme === exports.Theme.YunziMonkeyDark) {
                                    ctx.drawImage(boardRes, 0, 0, board.width, board.height);
                                }
                                else {
                                    var pattern = ctx.createPattern(boardRes, 'repeat');
                                    if (pattern) {
                                        ctx.fillStyle = pattern;
                                        ctx.fillRect(0, 0, board.width, board.height);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        this.drawBoardLine = function (board) {
            if (board === void 0) { board = _this.board; }
            if (!board)
                return;
            var _a = _this, visibleArea = _a.visibleArea, options = _a.options, mat = _a.mat, preventMoveMat = _a.preventMoveMat, cursorPosition = _a.cursorPosition;
            var zoom = options.zoom, boardSize = options.boardSize, adaptiveBoardLine = options.adaptiveBoardLine; options.theme;
            var boardLineWidth = _this.getThemeProperty(exports.ThemePropertyKey.BoardLineWidth);
            var boardEdgeLineWidth = _this.getThemeProperty(exports.ThemePropertyKey.BoardEdgeLineWidth);
            var boardLineExtent = _this.getThemeProperty(exports.ThemePropertyKey.BoardLineExtent);
            var ctx = board.getContext('2d');
            if (ctx) {
                var _b = _this.calcSpaceAndPadding(), space = _b.space, scaledPadding = _b.scaledPadding;
                var extendSpace = zoom ? boardLineExtent * space : 0;
                var activeColor = _this.getThemeProperty(exports.ThemePropertyKey.ActiveColor);
                var inactiveColor = _this.getThemeProperty(exports.ThemePropertyKey.InactiveColor);
                ctx.fillStyle = _this.getThemeProperty(exports.ThemePropertyKey.BoardLineColor);
                var adaptiveFactor = 0.001;
                var touchingFactor = 2.5;
                var edgeLineWidth = adaptiveBoardLine
                    ? board.width * adaptiveFactor * 2
                    : boardEdgeLineWidth;
                var lineWidth = adaptiveBoardLine
                    ? board.width * adaptiveFactor
                    : boardLineWidth;
                var allowMove = canMove(mat, cursorPosition[0], cursorPosition[1], _this.turn, _this.previousBoardState) && preventMoveMat[cursorPosition[0]][cursorPosition[1]] === 0;
                for (var i = visibleArea[0][0]; i <= visibleArea[0][1]; i++) {
                    ctx.beginPath();
                    if ((visibleArea[0][0] === 0 && i === 0) ||
                        (visibleArea[0][1] === boardSize - 1 && i === boardSize - 1)) {
                        ctx.lineWidth = edgeLineWidth;
                    }
                    else {
                        ctx.lineWidth = lineWidth;
                    }
                    if (isMobileDevice() &&
                        i === _this.cursorPosition[0] &&
                        _this.touchMoving) {
                        ctx.lineWidth = ctx.lineWidth * touchingFactor;
                        ctx.strokeStyle = allowMove ? activeColor : inactiveColor;
                    }
                    else {
                        ctx.strokeStyle = activeColor;
                    }
                    var startPointY = i === 0 || i === boardSize - 1
                        ? scaledPadding + visibleArea[1][0] * space - edgeLineWidth / 2
                        : scaledPadding + visibleArea[1][0] * space;
                    if (isMobileDevice()) {
                        startPointY += dpr / 2;
                    }
                    var endPointY = i === 0 || i === boardSize - 1
                        ? space * visibleArea[1][1] + scaledPadding + edgeLineWidth / 2
                        : space * visibleArea[1][1] + scaledPadding;
                    if (isMobileDevice()) {
                        endPointY -= dpr / 2;
                    }
                    if (visibleArea[1][0] > 0)
                        startPointY -= extendSpace;
                    if (visibleArea[1][1] < boardSize - 1)
                        endPointY += extendSpace;
                    ctx.moveTo(i * space + scaledPadding, startPointY);
                    ctx.lineTo(i * space + scaledPadding, endPointY);
                    ctx.stroke();
                }
                for (var i = visibleArea[1][0]; i <= visibleArea[1][1]; i++) {
                    ctx.beginPath();
                    if ((visibleArea[1][0] === 0 && i === 0) ||
                        (visibleArea[1][1] === boardSize - 1 && i === boardSize - 1)) {
                        ctx.lineWidth = edgeLineWidth;
                    }
                    else {
                        ctx.lineWidth = lineWidth;
                    }
                    if (isMobileDevice() &&
                        i === _this.cursorPosition[1] &&
                        _this.touchMoving) {
                        ctx.lineWidth = ctx.lineWidth * touchingFactor;
                        ctx.strokeStyle = allowMove ? activeColor : inactiveColor;
                    }
                    else {
                        ctx.strokeStyle = activeColor;
                    }
                    var startPointX = i === 0 || i === boardSize - 1
                        ? scaledPadding + visibleArea[0][0] * space - edgeLineWidth / 2
                        : scaledPadding + visibleArea[0][0] * space;
                    var endPointX = i === 0 || i === boardSize - 1
                        ? space * visibleArea[0][1] + scaledPadding + edgeLineWidth / 2
                        : space * visibleArea[0][1] + scaledPadding;
                    if (isMobileDevice()) {
                        startPointX += dpr / 2;
                    }
                    if (isMobileDevice()) {
                        endPointX -= dpr / 2;
                    }
                    if (visibleArea[0][0] > 0)
                        startPointX -= extendSpace;
                    if (visibleArea[0][1] < boardSize - 1)
                        endPointX += extendSpace;
                    ctx.moveTo(startPointX, i * space + scaledPadding);
                    ctx.lineTo(endPointX, i * space + scaledPadding);
                    ctx.stroke();
                }
            }
        };
        this.drawStars = function (board) {
            if (board === void 0) { board = _this.board; }
            if (!board)
                return;
            if (_this.options.boardSize !== 19)
                return;
            var adaptiveStarSize = _this.options.adaptiveStarSize;
            var starSizeOptions = _this.getThemeProperty(exports.ThemePropertyKey.StarSize);
            var visibleArea = _this.visibleArea;
            var ctx = board.getContext('2d');
            var starSize = adaptiveStarSize ? board.width * 0.0035 : starSizeOptions;
            if (ctx) {
                var _a = _this.calcSpaceAndPadding(), space_1 = _a.space, scaledPadding_1 = _a.scaledPadding;
                ctx.stroke();
                [3, 9, 15].forEach(function (i) {
                    [3, 9, 15].forEach(function (j) {
                        if (i >= visibleArea[0][0] &&
                            i <= visibleArea[0][1] &&
                            j >= visibleArea[1][0] &&
                            j <= visibleArea[1][1]) {
                            ctx.beginPath();
                            ctx.arc(i * space_1 + scaledPadding_1, j * space_1 + scaledPadding_1, starSize, 0, 2 * Math.PI, true);
                            ctx.fillStyle = _this.getThemeProperty('boardLineColor');
                            ctx.fill();
                        }
                    });
                });
            }
        };
        this.drawCoordinate = function () {
            var _a = _this, board = _a.board, options = _a.options, visibleArea = _a.visibleArea;
            if (!board)
                return;
            var boardSize = options.boardSize; options.zoom; var padding = options.padding; options.theme;
            var boardLineExtent = _this.getThemeProperty('boardLineExtent');
            var zoomedBoardSize = visibleArea[0][1] - visibleArea[0][0] + 1;
            var ctx = board.getContext('2d');
            var _b = _this.calcSpaceAndPadding(), space = _b.space, scaledPadding = _b.scaledPadding;
            if (ctx) {
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillStyle = _this.getThemeProperty('boardLineColor');
                ctx.font = "bold ".concat(space / 3, "px Helvetica");
                var center_1 = _this.calcCenter();
                var offset_1 = space / 1.5;
                if (center_1 === exports.Center.Center &&
                    visibleArea[0][0] === 0 &&
                    visibleArea[0][1] === boardSize - 1) {
                    offset_1 -= scaledPadding / 2;
                }
                A1_LETTERS.forEach(function (l, index) {
                    var x = space * index + scaledPadding;
                    var offsetTop = offset_1;
                    var offsetBottom = offset_1;
                    if (center_1 === exports.Center.TopLeft ||
                        center_1 === exports.Center.TopRight ||
                        center_1 === exports.Center.Top) {
                        offsetTop -= space * boardLineExtent;
                    }
                    if (center_1 === exports.Center.BottomLeft ||
                        center_1 === exports.Center.BottomRight ||
                        center_1 === exports.Center.Bottom) {
                        offsetBottom -= (space * boardLineExtent) / 2;
                    }
                    var y1 = visibleArea[1][0] * space + padding - offsetTop;
                    var y2 = y1 + zoomedBoardSize * space + offsetBottom * 2;
                    if (index >= visibleArea[0][0] && index <= visibleArea[0][1]) {
                        if (center_1 !== exports.Center.BottomLeft &&
                            center_1 !== exports.Center.BottomRight &&
                            center_1 !== exports.Center.Bottom) {
                            ctx.fillText(l, x, y1);
                        }
                        if (center_1 !== exports.Center.TopLeft &&
                            center_1 !== exports.Center.TopRight &&
                            center_1 !== exports.Center.Top) {
                            ctx.fillText(l, x, y2);
                        }
                    }
                });
                A1_NUMBERS.slice(-_this.options.boardSize).forEach(function (l, index) {
                    var y = space * index + scaledPadding;
                    var offsetLeft = offset_1;
                    var offsetRight = offset_1;
                    if (center_1 === exports.Center.TopLeft ||
                        center_1 === exports.Center.BottomLeft ||
                        center_1 === exports.Center.Left) {
                        offsetLeft -= space * boardLineExtent;
                    }
                    if (center_1 === exports.Center.TopRight ||
                        center_1 === exports.Center.BottomRight ||
                        center_1 === exports.Center.Right) {
                        offsetRight -= (space * boardLineExtent) / 2;
                    }
                    var x1 = visibleArea[0][0] * space + padding - offsetLeft;
                    var x2 = x1 + zoomedBoardSize * space + 2 * offsetRight;
                    if (index >= visibleArea[1][0] && index <= visibleArea[1][1]) {
                        if (center_1 !== exports.Center.TopRight &&
                            center_1 !== exports.Center.BottomRight &&
                            center_1 !== exports.Center.Right) {
                            ctx.fillText(l.toString(), x1, y);
                        }
                        if (center_1 !== exports.Center.TopLeft &&
                            center_1 !== exports.Center.BottomLeft &&
                            center_1 !== exports.Center.Left) {
                            ctx.fillText(l.toString(), x2, y);
                        }
                    }
                });
            }
        };
        this.calcSpaceAndPadding = function (canvas) {
            if (canvas === void 0) { canvas = _this.canvas; }
            var space = 0;
            var scaledPadding = 0;
            var scaledBoardExtent = 0;
            if (canvas) {
                var _a = _this.options, padding = _a.padding, boardSize = _a.boardSize, zoom = _a.zoom;
                var boardLineExtent = _this.getThemeProperty('boardLineExtent');
                var visibleArea = _this.visibleArea;
                if ((visibleArea[0][0] !== 0 && visibleArea[0][1] === boardSize - 1) ||
                    (visibleArea[1][0] !== 0 && visibleArea[1][1] === boardSize - 1)) {
                    scaledBoardExtent = boardLineExtent;
                }
                if ((visibleArea[0][0] !== 0 && visibleArea[0][1] !== boardSize - 1) ||
                    (visibleArea[1][0] !== 0 && visibleArea[1][1] !== boardSize - 1)) {
                    scaledBoardExtent = boardLineExtent * 2;
                }
                var divisor = zoom ? boardSize + scaledBoardExtent : boardSize;
                space = (canvas.width - padding * 2) / Math.ceil(divisor);
                scaledPadding = padding + space / 2;
            }
            return { space: space, scaledPadding: scaledPadding, scaledBoardExtent: scaledBoardExtent };
        };
        this.playEffect = function (mat, effectMat, clear) {
            if (mat === void 0) { mat = _this.mat; }
            if (effectMat === void 0) { effectMat = _this.effectMat; }
            if (clear === void 0) { clear = true; }
            var canvas = _this.effectCanvas;
            if (canvas) {
                if (clear)
                    _this.clearCanvas(canvas);
                for (var i = 0; i < effectMat.length; i++) {
                    for (var j = 0; j < effectMat[i].length; j++) {
                        var value = effectMat[i][j];
                        var _a = _this.calcSpaceAndPadding(), space = _a.space, scaledPadding = _a.scaledPadding;
                        var x = scaledPadding + i * space;
                        var y = scaledPadding + j * space;
                        var ki = mat[i][j];
                        var effect = void 0;
                        var ctx = canvas.getContext('2d');
                        if (ctx) {
                            switch (value) {
                                case exports.Effect.Ban: {
                                    effect = new BanEffect(ctx, x, y, space, ki);
                                    effect.play();
                                    break;
                                }
                            }
                            effectMat[i][j] = exports.Effect.None;
                        }
                    }
                }
                var boardSize = _this.options.boardSize;
                _this.setEffectMat(empty([boardSize, boardSize]));
            }
        };
        this.drawCursor = function () {
            var _a, _b;
            var canvas = _this.cursorCanvas;
            if (canvas) {
                _this.clearCursorCanvas();
                if (_this.cursor === exports.Cursor.None)
                    return;
                if (isMobileDevice() && !_this.touchMoving)
                    return;
                var _c = _this.options, padding = _c.padding; _c.theme;
                var ctx = canvas.getContext('2d');
                var space = _this.calcSpaceAndPadding().space;
                var _d = _this, visibleArea = _d.visibleArea, cursor = _d.cursor, cursorValue = _d.cursorValue;
                var _e = tslib.__read(_this.cursorPosition, 2), idx = _e[0], idy = _e[1];
                if (idx < visibleArea[0][0] || idx > visibleArea[0][1])
                    return;
                if (idy < visibleArea[1][0] || idy > visibleArea[1][1])
                    return;
                var x = idx * space + space / 2 + padding;
                var y = idy * space + space / 2 + padding;
                var ki = ((_b = (_a = _this.mat) === null || _a === void 0 ? void 0 : _a[idx]) === null || _b === void 0 ? void 0 : _b[idy]) || exports.Ki.Empty;
                if (ctx) {
                    var cur = void 0;
                    var size = space * 0.8;
                    if (cursor === exports.Cursor.Circle) {
                        cur = new CircleMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                        cur.setGlobalAlpha(0.8);
                    }
                    else if (cursor === exports.Cursor.Square) {
                        cur = new SquareMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                        cur.setGlobalAlpha(0.8);
                    }
                    else if (cursor === exports.Cursor.Triangle) {
                        cur = new TriangleMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                        cur.setGlobalAlpha(0.8);
                    }
                    else if (cursor === exports.Cursor.Cross) {
                        cur = new CrossMarkup(ctx, x, y, space, ki, _this.createThemeContext());
                        cur.setGlobalAlpha(0.8);
                    }
                    else if (cursor === exports.Cursor.Text) {
                        cur = new TextMarkup(ctx, x, y, space, ki, _this.createThemeContext(), cursorValue);
                        cur.setGlobalAlpha(0.8);
                    }
                    else if (ki === exports.Ki.Empty && cursor === exports.Cursor.BlackStone) {
                        cur = new FlatStone(ctx, x, y, exports.Ki.Black, _this.createThemeContext());
                        cur.setSize(size);
                        cur.setGlobalAlpha(0.5);
                    }
                    else if (ki === exports.Ki.Empty && cursor === exports.Cursor.WhiteStone) {
                        cur = new FlatStone(ctx, x, y, exports.Ki.White, _this.createThemeContext());
                        cur.setSize(size);
                        cur.setGlobalAlpha(0.5);
                    }
                    else if (cursor === exports.Cursor.Clear) {
                        cur = new FlatStone(ctx, x, y, exports.Ki.Empty, _this.createThemeContext());
                        cur.setSize(size);
                    }
                    cur === null || cur === void 0 ? void 0 : cur.draw();
                }
            }
        };
        this.drawStones = function (mat, canvas, clear) {
            if (mat === void 0) { mat = _this.mat; }
            if (canvas === void 0) { canvas = _this.canvas; }
            if (clear === void 0) { clear = true; }
            var _a = _this.options, _b = _a.theme, theme = _b === void 0 ? exports.Theme.BlackAndWhite : _b, themeResources = _a.themeResources;
            if (clear)
                _this.clearCanvas();
            if (canvas) {
                for (var i = 0; i < mat.length; i++) {
                    for (var j = 0; j < mat[i].length; j++) {
                        var value = mat[i][j];
                        if (value !== 0) {
                            var ctx = canvas.getContext('2d');
                            if (ctx) {
                                setImageSmoothingQuality(ctx);
                                var _c = _this.calcSpaceAndPadding(), space = _c.space, scaledPadding = _c.scaledPadding;
                                var x = scaledPadding + i * space;
                                var y = scaledPadding + j * space;
                                var ratio = _this.getThemeProperty('stoneRatio');
                                ctx.save();
                                if (theme !== exports.Theme.Subdued &&
                                    theme !== exports.Theme.BlackAndWhite &&
                                    theme !== exports.Theme.Flat &&
                                    theme !== exports.Theme.Warm &&
                                    theme !== exports.Theme.Dark &&
                                    theme !== exports.Theme.HighContrast) {
                                    ctx.shadowOffsetX = 3;
                                    ctx.shadowOffsetY = 3;
                                    ctx.shadowColor = _this.getThemeProperty('shadowColor');
                                    ctx.shadowBlur = 8;
                                }
                                else {
                                    ctx.shadowOffsetX = 0;
                                    ctx.shadowOffsetY = 0;
                                    ctx.shadowBlur = 0;
                                }
                                var stone = void 0;
                                switch (theme) {
                                    case exports.Theme.BlackAndWhite:
                                    case exports.Theme.Flat:
                                    case exports.Theme.Warm:
                                    case exports.Theme.HighContrast: {
                                        stone = new FlatStone(ctx, x, y, value, _this.createThemeContext());
                                        stone.setSize(space * ratio * 2);
                                        break;
                                    }
                                    case exports.Theme.Dark: {
                                        stone = new FlatStone(ctx, x, y, value, _this.createThemeContext());
                                        stone.setSize(space * ratio * 2);
                                        break;
                                    }
                                    default: {
                                        var boardPixelSize = (canvas === null || canvas === void 0 ? void 0 : canvas.width) || 512;
                                        var resources = getThemeResources(theme, themeResources, boardPixelSize);
                                        if (resources) {
                                            var blacks = resources.blacks.map(function (i) { return images[i]; });
                                            var whites = resources.whites.map(function (i) { return images[i]; });
                                            var mod = i + 10 + j;
                                            stone = new ImageStone(ctx, x, y, value, mod, blacks, whites, _this.createThemeContext());
                                            stone.setSize(space * ratio * 2);
                                        }
                                    }
                                }
                                stone === null || stone === void 0 ? void 0 : stone.draw();
                                ctx.restore();
                            }
                        }
                    }
                }
            }
        };
        this.options = tslib.__assign(tslib.__assign(tslib.__assign({}, this.defaultOptions), options), { themeOptions: tslib.__assign(tslib.__assign({}, this.defaultOptions.themeOptions), (options.themeOptions || {})) });
        var size = this.options.boardSize;
        this.mat = zeros([size, size]);
        this.preventMoveMat = zeros([size, size]);
        this.markup = empty([size, size]);
        this.effectMat = empty([size, size]);
        this.turn = exports.Ki.Black;
        this.cursorPosition = [-1, -1];
        this.actualCursorPosition = [-1, -1];
        this.maxhv = size;
        this.transMat = new DOMMatrix();
        this.analysis = null;
        this.visibleArea = [
            [0, size - 1],
            [0, size - 1],
        ];
        this.updateNodeMarkupStyles();
    }
    GhostBan.prototype.getThemeProperty = function (propertyKey) {
        var key = typeof propertyKey === 'string' ? propertyKey : propertyKey;
        var currentTheme = this.options.theme;
        var themeConfig = this.options.themeOptions[currentTheme] || {};
        var defaultConfig = this.options.themeOptions.default || {};
        var result = (themeConfig[key] ||
            defaultConfig[key]);
        return result;
    };
    /**
     * Create theme context for markup components
     */
    GhostBan.prototype.createThemeContext = function () {
        return {
            theme: this.options.theme,
            themeOptions: this.options.themeOptions,
        };
    };
    GhostBan.prototype.updateNodeMarkupStyles = function () {
        var _a;
        var defaultDashedLineDash = [8, 6];
        var defaultDottedLineDash = [4, 4];
        this.nodeMarkupStyles = (_a = {},
            _a[exports.Markup.PositiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.NegativeNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.NeutralNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.DefaultNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.WarningNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.PositiveDashedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.NegativeDashedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.NeutralDashedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.DefaultDashedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.WarningDashedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.PositiveDottedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.NegativeDottedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.NeutralDottedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.DefaultDottedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.WarningDottedNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.PositiveActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.NegativeActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.NeutralActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.DefaultActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.WarningActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: [],
            },
            _a[exports.Markup.PositiveDashedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.NegativeDashedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.NeutralDashedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.DefaultDashedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.WarningDashedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: defaultDashedLineDash,
            },
            _a[exports.Markup.PositiveDottedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.PositiveNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.NegativeDottedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NegativeNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.NeutralDottedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.NeutralNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.DefaultDottedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.DefaultNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a[exports.Markup.WarningDottedActiveNode] = {
                color: this.getThemeProperty(exports.ThemePropertyKey.WarningNodeColor),
                lineDash: defaultDottedLineDash,
            },
            _a);
    };
    GhostBan.prototype.setTurn = function (turn) {
        this.turn = turn;
    };
    GhostBan.prototype.setPreviousBoardState = function (boardState) {
        this.previousBoardState = boardState;
    };
    GhostBan.prototype.getPreviousBoardState = function () {
        return this.previousBoardState;
    };
    /**
     * Record current board state as history state for ko rule checking in next move
     */
    GhostBan.prototype.recordCurrentBoardState = function () {
        this.previousBoardState = this.mat.map(function (row) { return tslib.__spreadArray([], tslib.__read(row), false); });
    };
    GhostBan.prototype.setBoardSize = function (size) {
        this.options.boardSize = Math.min(size, MAX_BOARD_SIZE);
    };
    GhostBan.prototype.resize = function () {
        if (!this.canvas ||
            !this.cursorCanvas ||
            !this.dom ||
            !this.board ||
            !this.markupCanvas ||
            !this.ownershipCanvas ||
            !this.analysisCanvas ||
            !this.effectCanvas)
            return;
        var canvases = [
            this.board,
            this.canvas,
            this.markupCanvas,
            this.ownershipCanvas,
            this.cursorCanvas,
            this.analysisCanvas,
            this.effectCanvas,
        ];
        var size = this.options.size;
        var clientWidth = this.dom.clientWidth;
        canvases.forEach(function (canvas) {
            if (size) {
                canvas.width = size * dpr;
                canvas.height = size * dpr;
            }
            else {
                canvas.style.width = clientWidth + 'px';
                canvas.style.height = clientWidth + 'px';
                canvas.width = Math.floor(clientWidth * dpr);
                canvas.height = Math.floor(clientWidth * dpr);
            }
        });
        this.render();
    };
    GhostBan.prototype.createCanvas = function (id, pointerEvents) {
        if (pointerEvents === void 0) { pointerEvents = true; }
        var canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.id = id;
        if (!pointerEvents) {
            canvas.style.pointerEvents = 'none';
        }
        return canvas;
    };
    GhostBan.prototype.init = function (dom) {
        var _this = this;
        var size = this.options.boardSize;
        this.mat = zeros([size, size]);
        this.markup = empty([size, size]);
        this.transMat = new DOMMatrix();
        this.board = this.createCanvas('ghostban-board');
        this.canvas = this.createCanvas('ghostban-canvas');
        this.ownershipCanvas = this.createCanvas('ghostban-ownership', false);
        this.markupCanvas = this.createCanvas('ghostban-markup', false);
        this.analysisCanvas = this.createCanvas('ghostban-analysis', false);
        this.cursorCanvas = this.createCanvas('ghostban-cursor');
        this.effectCanvas = this.createCanvas('ghostban-effect', false);
        this.dom = dom;
        dom.innerHTML = '';
        dom.appendChild(this.board);
        dom.appendChild(this.canvas);
        dom.appendChild(this.ownershipCanvas);
        dom.appendChild(this.markupCanvas);
        dom.appendChild(this.analysisCanvas);
        dom.appendChild(this.cursorCanvas);
        dom.appendChild(this.effectCanvas);
        this.resize();
        this.renderInteractive();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', function () {
                _this.resize();
            });
        }
    };
    GhostBan.prototype.setOptions = function (options) {
        var previousShowAnalysis = this.options.showAnalysis;
        var previousShowOwnership = this.options.showOwnership;
        this.options = tslib.__assign(tslib.__assign(tslib.__assign({}, this.options), options), { themeOptions: tslib.__assign(tslib.__assign({}, this.options.themeOptions), (options.themeOptions || {})) });
        this.updateNodeMarkupStyles();
        this.renderInteractive();
        if (previousShowAnalysis && !this.options.showAnalysis) {
            this.clearAnalysisCanvas();
        }
        if (previousShowOwnership && !this.options.showOwnership) {
            this.clearOwnershipCanvas();
        }
        if (!previousShowAnalysis && this.options.showAnalysis && this.analysis) {
            this.drawAnalysis();
        }
        if (!previousShowOwnership && this.options.showOwnership && this.analysis) {
            this.drawOwnership();
        }
    };
    GhostBan.prototype.setMat = function (mat) {
        this.mat = mat;
        if (!this.visibleAreaMat) {
            this.visibleAreaMat = mat;
        }
    };
    GhostBan.prototype.setVisibleAreaMat = function (mat) {
        this.visibleAreaMat = mat;
    };
    GhostBan.prototype.setPreventMoveMat = function (mat) {
        this.preventMoveMat = mat;
    };
    GhostBan.prototype.setEffectMat = function (mat) {
        this.effectMat = mat;
    };
    GhostBan.prototype.setMarkup = function (markup) {
        this.markup = markup;
    };
    GhostBan.prototype.setCursor = function (cursor, value) {
        if (value === void 0) { value = ''; }
        this.cursor = cursor;
        this.cursorValue = value;
    };
    GhostBan.prototype.renderInteractive = function () {
        var canvas = this.cursorCanvas;
        if (!canvas)
            return;
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseout', this.onMouseMove);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
        if (this.options.interactive) {
            canvas.addEventListener('mousemove', this.onMouseMove);
            canvas.addEventListener('mouseout', this.onMouseMove);
            canvas.addEventListener('touchstart', this.onTouchStart);
            canvas.addEventListener('touchmove', this.onTouchMove);
            canvas.addEventListener('touchend', this.onTouchEnd);
        }
    };
    GhostBan.prototype.setAnalysis = function (analysis) {
        this.analysis = analysis;
        if (!analysis) {
            this.clearAnalysisCanvas();
            this.clearOwnershipCanvas();
            return;
        }
        if (this.options.showAnalysis)
            this.drawAnalysis(analysis);
        if (this.options.showOwnership)
            this.drawOwnership();
    };
    GhostBan.prototype.setTheme = function (theme, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var themeResources = this.options.themeResources;
        if (!themeResources[theme])
            return;
        // Get all theme resources for preloading (all resolutions)
        var allThemeImages = getAllThemeResources(theme, themeResources);
        this.options.theme = theme;
        this.options = tslib.__assign(tslib.__assign(tslib.__assign(tslib.__assign({}, this.options), { theme: theme }), options), { themeOptions: tslib.__assign(tslib.__assign({}, this.options.themeOptions), (options.themeOptions || {})) });
        this.updateNodeMarkupStyles();
        // Redraw callback after image loading completes
        var onImageLoaded = function (url) {
            _this.drawBoard();
            _this.drawStones();
        };
        // Preload all theme resources (all resolutions)
        preload(allThemeImages, function () {
            _this.drawBoard();
            _this.render();
        }, onImageLoaded);
        this.drawBoard();
        this.render();
    };
    GhostBan.prototype.calcDynamicPadding = function (visibleAreaSize) {
        var coordinate = this.options.coordinate;
        var canvas = this.canvas;
        if (!canvas)
            return;
        var padding = canvas.width / (visibleAreaSize + 2) / 2;
        var paddingWithoutCoordinate = canvas.width / (visibleAreaSize + 2) / 4;
        this.options.padding = coordinate ? padding : paddingWithoutCoordinate;
    };
    GhostBan.prototype.zoomBoard = function (zoom) {
        if (zoom === void 0) { zoom = false; }
        var _a = this, canvas = _a.canvas, analysisCanvas = _a.analysisCanvas, board = _a.board, cursorCanvas = _a.cursorCanvas, markupCanvas = _a.markupCanvas, effectCanvas = _a.effectCanvas;
        if (!canvas)
            return;
        var _b = this.options, boardSize = _b.boardSize, extent = _b.extent, padding = _b.padding, dynamicPadding = _b.dynamicPadding;
        var boardLineExtent = this.getThemeProperty(exports.ThemePropertyKey.BoardLineExtent);
        var zoomedVisibleArea = calcVisibleArea(this.visibleAreaMat, extent, false);
        var ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext('2d');
        var boardCtx = board === null || board === void 0 ? void 0 : board.getContext('2d');
        var cursorCtx = cursorCanvas === null || cursorCanvas === void 0 ? void 0 : cursorCanvas.getContext('2d');
        var markupCtx = markupCanvas === null || markupCanvas === void 0 ? void 0 : markupCanvas.getContext('2d');
        var analysisCtx = analysisCanvas === null || analysisCanvas === void 0 ? void 0 : analysisCanvas.getContext('2d');
        var effectCtx = effectCanvas === null || effectCanvas === void 0 ? void 0 : effectCanvas.getContext('2d');
        var visibleArea = zoom
            ? zoomedVisibleArea
            : [
                [0, boardSize - 1],
                [0, boardSize - 1],
            ];
        this.visibleArea = visibleArea;
        var visibleAreaSize = Math.max(visibleArea[0][1] - visibleArea[0][0], visibleArea[1][1] - visibleArea[1][0]);
        if (dynamicPadding) {
            this.calcDynamicPadding(visibleAreaSize);
        }
        if (zoom) {
            var space = this.calcSpaceAndPadding().space;
            var center = this.calcCenter();
            if (dynamicPadding) {
                this.calcDynamicPadding(visibleAreaSize);
            }
            var extraVisibleSize = boardLineExtent * 2 + 1;
            if (center === exports.Center.TopRight ||
                center === exports.Center.TopLeft ||
                center === exports.Center.BottomRight ||
                center === exports.Center.BottomLeft) {
                extraVisibleSize = boardLineExtent + 0.5;
            }
            var zoomedBoardSize = visibleAreaSize + extraVisibleSize;
            if (zoomedBoardSize < boardSize) {
                var scale = (canvas.width - padding * 2) / (zoomedBoardSize * space);
                var offsetX = visibleArea[0][0] * space * scale +
                    padding * scale -
                    padding -
                    (space * extraVisibleSize * scale) / 2 +
                    (space * scale) / 2;
                var offsetY = visibleArea[1][0] * space * scale +
                    padding * scale -
                    padding -
                    (space * extraVisibleSize * scale) / 2 +
                    (space * scale) / 2;
                this.transMat = new DOMMatrix();
                this.transMat.translateSelf(-offsetX, -offsetY);
                this.transMat.scaleSelf(scale, scale);
                ctx === null || ctx === void 0 ? void 0 : ctx.setTransform(this.transMat);
                boardCtx === null || boardCtx === void 0 ? void 0 : boardCtx.setTransform(this.transMat);
                analysisCtx === null || analysisCtx === void 0 ? void 0 : analysisCtx.setTransform(this.transMat);
                cursorCtx === null || cursorCtx === void 0 ? void 0 : cursorCtx.setTransform(this.transMat);
                markupCtx === null || markupCtx === void 0 ? void 0 : markupCtx.setTransform(this.transMat);
                effectCtx === null || effectCtx === void 0 ? void 0 : effectCtx.setTransform(this.transMat);
            }
            else {
                this.resetTransform();
            }
        }
        else {
            this.resetTransform();
        }
    };
    GhostBan.prototype.calcBoardVisibleArea = function (zoom) {
        this.zoomBoard(this.options.zoom);
    };
    GhostBan.prototype.resetTransform = function () {
        var _a = this, canvas = _a.canvas, analysisCanvas = _a.analysisCanvas, board = _a.board, cursorCanvas = _a.cursorCanvas, markupCanvas = _a.markupCanvas, effectCanvas = _a.effectCanvas;
        var ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext('2d');
        var boardCtx = board === null || board === void 0 ? void 0 : board.getContext('2d');
        var cursorCtx = cursorCanvas === null || cursorCanvas === void 0 ? void 0 : cursorCanvas.getContext('2d');
        var markupCtx = markupCanvas === null || markupCanvas === void 0 ? void 0 : markupCanvas.getContext('2d');
        var analysisCtx = analysisCanvas === null || analysisCanvas === void 0 ? void 0 : analysisCanvas.getContext('2d');
        var effectCtx = effectCanvas === null || effectCanvas === void 0 ? void 0 : effectCanvas.getContext('2d');
        this.transMat = new DOMMatrix();
        ctx === null || ctx === void 0 ? void 0 : ctx.resetTransform();
        boardCtx === null || boardCtx === void 0 ? void 0 : boardCtx.resetTransform();
        analysisCtx === null || analysisCtx === void 0 ? void 0 : analysisCtx.resetTransform();
        cursorCtx === null || cursorCtx === void 0 ? void 0 : cursorCtx.resetTransform();
        markupCtx === null || markupCtx === void 0 ? void 0 : markupCtx.resetTransform();
        effectCtx === null || effectCtx === void 0 ? void 0 : effectCtx.resetTransform();
    };
    GhostBan.prototype.render = function () {
        var mat = this.mat;
        if (this.mat && mat[0])
            this.options.boardSize = mat[0].length;
        this.zoomBoard(this.options.zoom);
        this.zoomBoard(this.options.zoom);
        this.clearAllCanvas();
        this.drawBoard();
        this.drawStones();
        this.drawMarkup();
        if (this.options.showOwnership)
            this.drawOwnership();
        this.drawCursor();
        if (this.options.showAnalysis)
            this.drawAnalysis();
    };
    GhostBan.prototype.renderInOneCanvas = function (canvas) {
        if (canvas === void 0) { canvas = this.canvas; }
        this.clearAllCanvas();
        this.drawBoard(canvas, false);
        this.drawStones(this.mat, canvas, false);
        this.drawMarkup(this.mat, this.markup, canvas, false);
    };
    return GhostBan;
}());

exports.A1_LETTERS = A1_LETTERS;
exports.A1_LETTERS_WITH_I = A1_LETTERS_WITH_I;
exports.A1_NUMBERS = A1_NUMBERS;
exports.AnnotationProp = AnnotationProp;
exports.BASE_THEME_CONFIG = BASE_THEME_CONFIG;
exports.CUSTOM_PROP_LIST = CUSTOM_PROP_LIST;
exports.CustomProp = CustomProp;
exports.DEFAULT_BOARD_SIZE = DEFAULT_BOARD_SIZE;
exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
exports.DOT_SIZE = DOT_SIZE;
exports.EXPAND_H = EXPAND_H;
exports.EXPAND_V = EXPAND_V;
exports.GAME_INFO_PROP_LIST = GAME_INFO_PROP_LIST;
exports.GameInfoProp = GameInfoProp;
exports.GhostBan = GhostBan;
exports.LIGHT_GREEN_RGB = LIGHT_GREEN_RGB;
exports.LIGHT_RED_RGB = LIGHT_RED_RGB;
exports.LIGHT_YELLOW_RGB = LIGHT_YELLOW_RGB;
exports.LIST_OF_POINTS_PROP = LIST_OF_POINTS_PROP;
exports.MARKUP_PROP_LIST = MARKUP_PROP_LIST;
exports.MAX_BOARD_SIZE = MAX_BOARD_SIZE;
exports.MISCELLANEOUS_PROP_LIST = MISCELLANEOUS_PROP_LIST;
exports.MOVE_ANNOTATION_PROP_LIST = MOVE_ANNOTATION_PROP_LIST;
exports.MOVE_PROP_LIST = MOVE_PROP_LIST;
exports.MarkupProp = MarkupProp;
exports.MiscellaneousProp = MiscellaneousProp;
exports.MoveAnnotationProp = MoveAnnotationProp;
exports.MoveProp = MoveProp;
exports.NODE_ANNOTATION_PROP_LIST = NODE_ANNOTATION_PROP_LIST;
exports.NodeAnnotationProp = NodeAnnotationProp;
exports.RESPONSE_TIME = RESPONSE_TIME;
exports.ROOT_PROP_LIST = ROOT_PROP_LIST;
exports.RootProp = RootProp;
exports.SETUP_PROP_LIST = SETUP_PROP_LIST;
exports.SGF_LETTERS = SGF_LETTERS;
exports.SetupProp = SetupProp;
exports.Sgf = Sgf;
exports.SgfPropBase = SgfPropBase;
exports.THEME_RESOURCES = THEME_RESOURCES;
exports.TIMING_PROP_LIST = TIMING_PROP_LIST;
exports.TNode = TNode;
exports.TimingProp = TimingProp;
exports.TreeModel = TreeModel;
exports.YELLOW_RGB = YELLOW_RGB;
exports.a1ToIndex = a1ToIndex;
exports.a1ToPos = a1ToPos;
exports.a1ToSGF = a1ToSGF;
exports.addMoveToCurrentNode = addMoveToCurrentNode;
exports.addStoneToCurrentNode = addStoneToCurrentNode;
exports.buildMoveNode = buildMoveNode;
exports.buildPropertyValueRanges = buildPropertyValueRanges;
exports.calcAnalysisPointColor = calcAnalysisPointColor;
exports.calcAvoidMovesForPartialAnalysis = calcAvoidMovesForPartialAnalysis;
exports.calcBoardSize = calcBoardSize;
exports.calcCenter = calcCenter;
exports.calcDoubtfulMovesThresholdRange = calcDoubtfulMovesThresholdRange;
exports.calcHash = calcHash;
exports.calcMatAndMarkup = calcMatAndMarkup;
exports.calcMost = calcMost;
exports.calcOffset = calcOffset;
exports.calcPartialArea = calcPartialArea;
exports.calcPreventMoveMat = calcPreventMoveMat;
exports.calcPreventMoveMatForDisplayOnly = calcPreventMoveMatForDisplayOnly;
exports.calcScoreDiff = calcScoreDiff;
exports.calcScoreDiffText = calcScoreDiffText;
exports.calcTsumegoFrame = calcTsumegoFrame;
exports.calcVariationsMarkup = calcVariationsMarkup;
exports.calcVisibleArea = calcVisibleArea;
exports.calcWinrateDiff = calcWinrateDiff;
exports.calcWinrateDiffText = calcWinrateDiffText;
exports.canMove = canMove;
exports.clearStoneFromCurrentNode = clearStoneFromCurrentNode;
exports.convertStepsForAI = convertStepsForAI;
exports.convertStoneTypeToString = convertStoneTypeToString;
exports.cutMoveNodes = cutMoveNodes;
exports.detectST = detectST;
exports.empty = empty;
exports.execCapture = execCapture;
exports.extractAnswerType = extractAnswerType;
exports.extractBoardSize = extractBoardSize;
exports.extractPAI = extractPAI;
exports.extractPI = extractPI;
exports.findProp = findProp;
exports.findProps = findProps;
exports.genMove = genMove;
exports.getDeduplicatedProps = getDeduplicatedProps;
exports.getFirstToMoveColorFromRoot = getFirstToMoveColorFromRoot;
exports.getFirstToMoveColorFromSgf = getFirstToMoveColorFromSgf;
exports.getIndexFromAnalysis = getIndexFromAnalysis;
exports.getLastIndex = getLastIndex;
exports.getMoveColor = getMoveColor;
exports.getNodeNumber = getNodeNumber;
exports.getRoot = getRoot;
exports.handleMove = handleMove;
exports.inChoicePath = inChoicePath;
exports.inFirstBranchRightPath = inFirstBranchRightPath;
exports.inFirstRightPath = inFirstRightPath;
exports.inPath = inPath;
exports.inRightPath = inRightPath;
exports.inTargetPath = inTargetPath;
exports.inVariantPath = inVariantPath;
exports.inWrongPath = inWrongPath;
exports.initNodeData = initNodeData;
exports.initialRootNode = initialRootNode;
exports.isAnswerNode = isAnswerNode;
exports.isCharacterInNode = isCharacterInNode;
exports.isChoiceNode = isChoiceNode;
exports.isFirstRightNode = isFirstRightNode;
exports.isForceNode = isForceNode;
exports.isInAnyRange = isInAnyRange;
exports.isMainPath = isMainPath;
exports.isMoveNode = isMoveNode;
exports.isPreventMoveNode = isPreventMoveNode;
exports.isRightNode = isRightNode;
exports.isRootNode = isRootNode;
exports.isSetupNode = isSetupNode;
exports.isTargetNode = isTargetNode;
exports.isVariantNode = isVariantNode;
exports.isWrongNode = isWrongNode;
exports.matToListOfTuples = matToListOfTuples;
exports.matToPosition = matToPosition;
exports.move = move;
exports.nFormatter = nFormatter;
exports.offsetA1Move = offsetA1Move;
exports.pathToAiMoves = pathToAiMoves;
exports.pathToIndexes = pathToIndexes;
exports.pathToInitialStones = pathToInitialStones;
exports.posToSgf = posToSgf;
exports.reverseOffset = reverseOffset;
exports.reverseOffsetA1Move = reverseOffsetA1Move;
exports.round2 = round2;
exports.round3 = round3;
exports.sgfOffset = sgfOffset;
exports.sgfToA1 = sgfToA1;
exports.sgfToPos = sgfToPos;
exports.showKi = showKi;
exports.zeros = zeros;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uLy4uL2NvcmUvbWVyZ2Vzb3J0LnRzIiwiLi4vLi4vY29yZS90cmVlLnRzIiwiLi4vLi4vY29yZS9oZWxwZXJzLnRzIiwiLi4vLi4vdHlwZXMudHMiLCIuLi8uLi9jb25zdC50cyIsIi4uLy4uL2NvcmUvcHJvcHMudHMiLCIuLi8uLi9ib2FyZGNvcmUudHMiLCIuLi8uLi9jb3JlL3NnZi50cyIsIi4uLy4uL2hlbHBlci50cyIsIi4uLy4uL3N0b25lcy9iYXNlLnRzIiwiLi4vLi4vc3RvbmVzL0ZsYXRTdG9uZS50cyIsIi4uLy4uL3N0b25lcy9JbWFnZVN0b25lLnRzIiwiLi4vLi4vc3RvbmVzL0FuYWx5c2lzUG9pbnQudHMiLCIuLi8uLi9tYXJrdXBzL01hcmt1cEJhc2UudHMiLCIuLi8uLi9tYXJrdXBzL0NpcmNsZU1hcmt1cC50cyIsIi4uLy4uL21hcmt1cHMvQ3Jvc3NNYXJrdXAudHMiLCIuLi8uLi9tYXJrdXBzL1RleHRNYXJrdXAudHMiLCIuLi8uLi9tYXJrdXBzL1NxdWFyZU1hcmt1cC50cyIsIi4uLy4uL21hcmt1cHMvVHJpYW5nbGVNYXJrdXAudHMiLCIuLi8uLi9tYXJrdXBzL05vZGVNYXJrdXAudHMiLCIuLi8uLi9tYXJrdXBzL0FjdGl2ZU5vZGVNYXJrdXAudHMiLCIuLi8uLi9tYXJrdXBzL0NpcmNsZVNvbGlkTWFya3VwLnRzIiwiLi4vLi4vbWFya3Vwcy9IaWdobGlnaHRNYXJrdXAudHMiLCIuLi8uLi9lZmZlY3RzL0VmZmVjdEJhc2UudHMiLCIuLi8uLi9lZmZlY3RzL0JhbkVmZmVjdC50cyIsIi4uLy4uL2dob3N0YmFuLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB0eXBlIENvbXBhcmF0b3I8VD4gPSAoYTogVCwgYjogVCkgPT4gbnVtYmVyO1xyXG5cclxuLyoqXHJcbiAqIFNvcnQgYW4gYXJyYXkgdXNpbmcgdGhlIG1lcmdlIHNvcnQgYWxnb3JpdGhtLlxyXG4gKlxyXG4gKiBAcGFyYW0gY29tcGFyYXRvckZuIFRoZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxyXG4gKiBAcGFyYW0gYXJyIFRoZSBhcnJheSB0byBzb3J0LlxyXG4gKiBAcmV0dXJucyBUaGUgc29ydGVkIGFycmF5LlxyXG4gKi9cclxuZnVuY3Rpb24gbWVyZ2VTb3J0PFQ+KGNvbXBhcmF0b3JGbjogQ29tcGFyYXRvcjxUPiwgYXJyOiBUW10pOiBUW10ge1xyXG4gIGNvbnN0IGxlbiA9IGFyci5sZW5ndGg7XHJcbiAgaWYgKGxlbiA+PSAyKSB7XHJcbiAgICBjb25zdCBmaXJzdEhhbGYgPSBhcnIuc2xpY2UoMCwgbGVuIC8gMik7XHJcbiAgICBjb25zdCBzZWNvbmRIYWxmID0gYXJyLnNsaWNlKGxlbiAvIDIsIGxlbik7XHJcbiAgICByZXR1cm4gbWVyZ2UoXHJcbiAgICAgIGNvbXBhcmF0b3JGbixcclxuICAgICAgbWVyZ2VTb3J0KGNvbXBhcmF0b3JGbiwgZmlyc3RIYWxmKSxcclxuICAgICAgbWVyZ2VTb3J0KGNvbXBhcmF0b3JGbiwgc2Vjb25kSGFsZilcclxuICAgICk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBhcnIuc2xpY2UoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgbWVyZ2UgcGFydCBvZiB0aGUgbWVyZ2Ugc29ydCBhbGdvcml0aG0uXHJcbiAqXHJcbiAqIEBwYXJhbSBjb21wYXJhdG9yRm4gVGhlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXHJcbiAqIEBwYXJhbSBhcnIxIFRoZSBmaXJzdCBzb3J0ZWQgYXJyYXkuXHJcbiAqIEBwYXJhbSBhcnIyIFRoZSBzZWNvbmQgc29ydGVkIGFycmF5LlxyXG4gKiBAcmV0dXJucyBUaGUgbWVyZ2VkIGFuZCBzb3J0ZWQgYXJyYXkuXHJcbiAqL1xyXG5mdW5jdGlvbiBtZXJnZTxUPihjb21wYXJhdG9yRm46IENvbXBhcmF0b3I8VD4sIGFycjE6IFRbXSwgYXJyMjogVFtdKTogVFtdIHtcclxuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xyXG4gIGxldCBsZWZ0MSA9IGFycjEubGVuZ3RoO1xyXG4gIGxldCBsZWZ0MiA9IGFycjIubGVuZ3RoO1xyXG5cclxuICB3aGlsZSAobGVmdDEgPiAwICYmIGxlZnQyID4gMCkge1xyXG4gICAgaWYgKGNvbXBhcmF0b3JGbihhcnIxWzBdLCBhcnIyWzBdKSA8PSAwKSB7XHJcbiAgICAgIHJlc3VsdC5wdXNoKGFycjEuc2hpZnQoKSEpOyAvLyBub24tbnVsbCBhc3NlcnRpb246IHNhZmUgc2luY2Ugd2UganVzdCBjaGVja2VkIGxlbmd0aFxyXG4gICAgICBsZWZ0MS0tO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzdWx0LnB1c2goYXJyMi5zaGlmdCgpISk7XHJcbiAgICAgIGxlZnQyLS07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAobGVmdDEgPiAwKSB7XHJcbiAgICByZXN1bHQucHVzaCguLi5hcnIxKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmVzdWx0LnB1c2goLi4uYXJyMik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBtZXJnZVNvcnQ7XHJcbiIsImltcG9ydCBtZXJnZVNvcnQgZnJvbSAnLi9tZXJnZXNvcnQnO1xyXG5pbXBvcnQge1NnZk5vZGV9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuZnVuY3Rpb24gZmluZEluc2VydEluZGV4PFQ+KFxyXG4gIGNvbXBhcmF0b3JGbjogKGE6IFQsIGI6IFQpID0+IG51bWJlcixcclxuICBhcnI6IFRbXSxcclxuICBlbDogVFxyXG4pOiBudW1iZXIge1xyXG4gIGxldCBpOiBudW1iZXI7XHJcbiAgY29uc3QgbGVuID0gYXJyLmxlbmd0aDtcclxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgIGlmIChjb21wYXJhdG9yRm4oYXJyW2ldLCBlbCkgPiAwKSB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gaTtcclxufVxyXG5cclxudHlwZSBDb21wYXJhdG9yPFQ+ID0gKGE6IFQsIGI6IFQpID0+IG51bWJlcjtcclxuXHJcbmludGVyZmFjZSBUcmVlTW9kZWxDb25maWc8VD4ge1xyXG4gIGNoaWxkcmVuUHJvcGVydHlOYW1lPzogc3RyaW5nO1xyXG4gIG1vZGVsQ29tcGFyYXRvckZuPzogQ29tcGFyYXRvcjxUPjtcclxufVxyXG5cclxuY2xhc3MgVE5vZGUge1xyXG4gIGNvbmZpZzogVHJlZU1vZGVsQ29uZmlnPFNnZk5vZGU+O1xyXG4gIG1vZGVsOiBTZ2ZOb2RlO1xyXG4gIGNoaWxkcmVuOiBUTm9kZVtdID0gW107XHJcbiAgcGFyZW50PzogVE5vZGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogVHJlZU1vZGVsQ29uZmlnPFNnZk5vZGU+LCBtb2RlbDogU2dmTm9kZSkge1xyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcbiAgICB0aGlzLm1vZGVsID0gbW9kZWw7XHJcbiAgfVxyXG5cclxuICBpc1Jvb3QoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPT09IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuY2hpbGRyZW4ubGVuZ3RoID4gMDtcclxuICB9XHJcblxyXG4gIGFkZENoaWxkKGNoaWxkOiBUTm9kZSk6IFROb2RlIHtcclxuICAgIHJldHVybiBhZGRDaGlsZCh0aGlzLCBjaGlsZCk7XHJcbiAgfVxyXG5cclxuICBhZGRDaGlsZEF0SW5kZXgoY2hpbGQ6IFROb2RlLCBpbmRleDogbnVtYmVyKTogVE5vZGUge1xyXG4gICAgaWYgKHRoaXMuY29uZmlnLm1vZGVsQ29tcGFyYXRvckZuKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAnQ2Fubm90IGFkZCBjaGlsZCBhdCBpbmRleCB3aGVuIHVzaW5nIGEgY29tcGFyYXRvciBmdW5jdGlvbi4nXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvcCA9IHRoaXMuY29uZmlnLmNoaWxkcmVuUHJvcGVydHlOYW1lIHx8ICdjaGlsZHJlbic7XHJcbiAgICBpZiAoISh0aGlzLm1vZGVsIGFzIGFueSlbcHJvcF0pIHtcclxuICAgICAgKHRoaXMubW9kZWwgYXMgYW55KVtwcm9wXSA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1vZGVsQ2hpbGRyZW4gPSAodGhpcy5tb2RlbCBhcyBhbnkpW3Byb3BdO1xyXG5cclxuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiB0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaW5kZXguJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2hpbGQucGFyZW50ID0gdGhpcztcclxuICAgIG1vZGVsQ2hpbGRyZW4uc3BsaWNlKGluZGV4LCAwLCBjaGlsZC5tb2RlbCk7XHJcbiAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpbmRleCwgMCwgY2hpbGQpO1xyXG5cclxuICAgIHJldHVybiBjaGlsZDtcclxuICB9XHJcblxyXG4gIGdldFBhdGgoKTogVE5vZGVbXSB7XHJcbiAgICBjb25zdCBwYXRoOiBUTm9kZVtdID0gW107XHJcbiAgICBsZXQgY3VycmVudDogVE5vZGUgfCB1bmRlZmluZWQgPSB0aGlzO1xyXG4gICAgd2hpbGUgKGN1cnJlbnQpIHtcclxuICAgICAgcGF0aC51bnNoaWZ0KGN1cnJlbnQpO1xyXG4gICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxuICB9XHJcblxyXG4gIGdldEluZGV4KCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5pc1Jvb3QoKSA/IDAgOiB0aGlzLnBhcmVudCEuY2hpbGRyZW4uaW5kZXhPZih0aGlzKTtcclxuICB9XHJcblxyXG4gIHNldEluZGV4KGluZGV4OiBudW1iZXIpOiB0aGlzIHtcclxuICAgIGlmICh0aGlzLmNvbmZpZy5tb2RlbENvbXBhcmF0b3JGbikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgJ0Nhbm5vdCBzZXQgbm9kZSBpbmRleCB3aGVuIHVzaW5nIGEgY29tcGFyYXRvciBmdW5jdGlvbi4nXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuaXNSb290KCkpIHtcclxuICAgICAgaWYgKGluZGV4ID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGluZGV4LicpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5wYXJlbnQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIGhhcyBubyBwYXJlbnQuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2libGluZ3MgPSB0aGlzLnBhcmVudC5jaGlsZHJlbjtcclxuICAgIGNvbnN0IG1vZGVsU2libGluZ3MgPSAodGhpcy5wYXJlbnQubW9kZWwgYXMgYW55KVtcclxuICAgICAgdGhpcy5jb25maWcuY2hpbGRyZW5Qcm9wZXJ0eU5hbWUgfHwgJ2NoaWxkcmVuJ1xyXG4gICAgXTtcclxuXHJcbiAgICBjb25zdCBvbGRJbmRleCA9IHNpYmxpbmdzLmluZGV4T2YodGhpcyk7XHJcblxyXG4gICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSBzaWJsaW5ncy5sZW5ndGgpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGluZGV4LicpO1xyXG4gICAgfVxyXG5cclxuICAgIHNpYmxpbmdzLnNwbGljZShpbmRleCwgMCwgc2libGluZ3Muc3BsaWNlKG9sZEluZGV4LCAxKVswXSk7XHJcbiAgICBtb2RlbFNpYmxpbmdzLnNwbGljZShpbmRleCwgMCwgbW9kZWxTaWJsaW5ncy5zcGxpY2Uob2xkSW5kZXgsIDEpWzBdKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHdhbGsoZm46IChub2RlOiBUTm9kZSkgPT4gYm9vbGVhbiB8IHZvaWQpOiB2b2lkIHtcclxuICAgIGNvbnN0IHdhbGtSZWN1cnNpdmUgPSAobm9kZTogVE5vZGUpOiBib29sZWFuID0+IHtcclxuICAgICAgaWYgKGZuKG5vZGUpID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICBpZiAod2Fsa1JlY3Vyc2l2ZShjaGlsZCkgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9O1xyXG4gICAgd2Fsa1JlY3Vyc2l2ZSh0aGlzKTtcclxuICB9XHJcblxyXG4gIGZpcnN0KGZuOiAobm9kZTogVE5vZGUpID0+IGJvb2xlYW4pOiBUTm9kZSB8IHVuZGVmaW5lZCB7XHJcbiAgICBsZXQgcmVzdWx0OiBUTm9kZSB8IHVuZGVmaW5lZDtcclxuICAgIHRoaXMud2Fsayhub2RlID0+IHtcclxuICAgICAgaWYgKGZuKG5vZGUpKSB7XHJcbiAgICAgICAgcmVzdWx0ID0gbm9kZTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGFsbChmbjogKG5vZGU6IFROb2RlKSA9PiBib29sZWFuKTogVE5vZGVbXSB7XHJcbiAgICBjb25zdCByZXN1bHQ6IFROb2RlW10gPSBbXTtcclxuICAgIHRoaXMud2Fsayhub2RlID0+IHtcclxuICAgICAgaWYgKGZuKG5vZGUpKSByZXN1bHQucHVzaChub2RlKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGRyb3AoKTogdGhpcyB7XHJcbiAgICBpZiAodGhpcy5wYXJlbnQpIHtcclxuICAgICAgY29uc3QgaWR4ID0gdGhpcy5wYXJlbnQuY2hpbGRyZW4uaW5kZXhPZih0aGlzKTtcclxuICAgICAgaWYgKGlkeCA+PSAwKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XHJcbiAgICAgICAgY29uc3QgcHJvcCA9IHRoaXMuY29uZmlnLmNoaWxkcmVuUHJvcGVydHlOYW1lIHx8ICdjaGlsZHJlbic7XHJcbiAgICAgICAgKHRoaXMucGFyZW50Lm1vZGVsIGFzIGFueSlbcHJvcF0uc3BsaWNlKGlkeCwgMSk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZENoaWxkKHBhcmVudDogVE5vZGUsIGNoaWxkOiBUTm9kZSk6IFROb2RlIHtcclxuICBjb25zdCBwcm9wID0gcGFyZW50LmNvbmZpZy5jaGlsZHJlblByb3BlcnR5TmFtZSB8fCAnY2hpbGRyZW4nO1xyXG4gIGlmICghKHBhcmVudC5tb2RlbCBhcyBhbnkpW3Byb3BdKSB7XHJcbiAgICAocGFyZW50Lm1vZGVsIGFzIGFueSlbcHJvcF0gPSBbXTtcclxuICB9XHJcblxyXG4gIGNvbnN0IG1vZGVsQ2hpbGRyZW4gPSAocGFyZW50Lm1vZGVsIGFzIGFueSlbcHJvcF07XHJcblxyXG4gIGNoaWxkLnBhcmVudCA9IHBhcmVudDtcclxuICBpZiAocGFyZW50LmNvbmZpZy5tb2RlbENvbXBhcmF0b3JGbikge1xyXG4gICAgY29uc3QgaW5kZXggPSBmaW5kSW5zZXJ0SW5kZXgoXHJcbiAgICAgIHBhcmVudC5jb25maWcubW9kZWxDb21wYXJhdG9yRm4sXHJcbiAgICAgIG1vZGVsQ2hpbGRyZW4sXHJcbiAgICAgIGNoaWxkLm1vZGVsXHJcbiAgICApO1xyXG4gICAgbW9kZWxDaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGNoaWxkLm1vZGVsKTtcclxuICAgIHBhcmVudC5jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGNoaWxkKTtcclxuICB9IGVsc2Uge1xyXG4gICAgbW9kZWxDaGlsZHJlbi5wdXNoKGNoaWxkLm1vZGVsKTtcclxuICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjaGlsZDtcclxufVxyXG5cclxuY2xhc3MgVHJlZU1vZGVsIHtcclxuICBjb25maWc6IFRyZWVNb2RlbENvbmZpZzxTZ2ZOb2RlPjtcclxuXHJcbiAgY29uc3RydWN0b3IoY29uZmlnOiBUcmVlTW9kZWxDb25maWc8U2dmTm9kZT4gPSB7fSkge1xyXG4gICAgdGhpcy5jb25maWcgPSB7XHJcbiAgICAgIGNoaWxkcmVuUHJvcGVydHlOYW1lOiBjb25maWcuY2hpbGRyZW5Qcm9wZXJ0eU5hbWUgfHwgJ2NoaWxkcmVuJyxcclxuICAgICAgbW9kZWxDb21wYXJhdG9yRm46IGNvbmZpZy5tb2RlbENvbXBhcmF0b3JGbixcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwYXJzZShtb2RlbDogU2dmTm9kZSk6IFROb2RlIHtcclxuICAgIGlmICh0eXBlb2YgbW9kZWwgIT09ICdvYmplY3QnIHx8IG1vZGVsID09PSBudWxsKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01vZGVsIG11c3QgYmUgb2YgdHlwZSBvYmplY3QuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgbm9kZSA9IG5ldyBUTm9kZSh0aGlzLmNvbmZpZywgbW9kZWwpO1xyXG4gICAgY29uc3QgcHJvcCA9IHRoaXMuY29uZmlnLmNoaWxkcmVuUHJvcGVydHlOYW1lITtcclxuICAgIGNvbnN0IGNoaWxkcmVuID0gKG1vZGVsIGFzIGFueSlbcHJvcF07XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY2hpbGRyZW4pKSB7XHJcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5tb2RlbENvbXBhcmF0b3JGbikge1xyXG4gICAgICAgIChtb2RlbCBhcyBhbnkpW3Byb3BdID0gbWVyZ2VTb3J0KFxyXG4gICAgICAgICAgdGhpcy5jb25maWcubW9kZWxDb21wYXJhdG9yRm4sXHJcbiAgICAgICAgICBjaGlsZHJlblxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgZm9yIChjb25zdCBjaGlsZE1vZGVsIG9mIChtb2RlbCBhcyBhbnkpW3Byb3BdKSB7XHJcbiAgICAgICAgY29uc3QgY2hpbGROb2RlID0gdGhpcy5wYXJzZShjaGlsZE1vZGVsKTtcclxuICAgICAgICBhZGRDaGlsZChub2RlLCBjaGlsZE5vZGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQge1RyZWVNb2RlbCwgVE5vZGUsIFRyZWVNb2RlbENvbmZpZ307XHJcbiIsImltcG9ydCB7ZmlsdGVyLCBmaW5kTGFzdEluZGV4fSBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQge1ROb2RlfSBmcm9tICcuL3RyZWUnO1xyXG5pbXBvcnQge01vdmVQcm9wLCBTZ2ZQcm9wQmFzZX0gZnJvbSAnLi9wcm9wcyc7XHJcbmltcG9ydCBTcGFya01ENSBmcm9tICdzcGFyay1tZDUnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGNIYXNoID0gKFxyXG4gIG5vZGU6IFROb2RlIHwgbnVsbCB8IHVuZGVmaW5lZCxcclxuICBtb3ZlUHJvcHM6IE1vdmVQcm9wW10gPSBbXVxyXG4pOiBzdHJpbmcgPT4ge1xyXG4gIGxldCBmdWxsbmFtZSA9ICduJztcclxuICBpZiAobW92ZVByb3BzLmxlbmd0aCA+IDApIHtcclxuICAgIGZ1bGxuYW1lICs9IGAke21vdmVQcm9wc1swXS50b2tlbn0ke21vdmVQcm9wc1swXS52YWx1ZX1gO1xyXG4gIH1cclxuICBpZiAobm9kZSkge1xyXG4gICAgY29uc3QgcGF0aCA9IG5vZGUuZ2V0UGF0aCgpO1xyXG4gICAgaWYgKHBhdGgubGVuZ3RoID4gMCkge1xyXG4gICAgICBmdWxsbmFtZSA9IHBhdGgubWFwKG4gPT4gbi5tb2RlbC5pZCkuam9pbignPT4nKSArIGA9PiR7ZnVsbG5hbWV9YDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBTcGFya01ENS5oYXNoKGZ1bGxuYW1lKS5zbGljZSgwLCA2KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0NoYXJhY3RlckluTm9kZShcclxuICBzZ2Y6IHN0cmluZyxcclxuICBuOiBudW1iZXIsXHJcbiAgbm9kZXMgPSBbJ0MnLCAnVE0nLCAnR04nLCAnUEMnXVxyXG4pOiBib29sZWFuIHtcclxuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChgKCR7bm9kZXMuam9pbignfCcpfSlcXFxcWyhbXlxcXFxdXSopXFxcXF1gLCAnZycpO1xyXG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcclxuXHJcbiAgd2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyhzZ2YpKSAhPT0gbnVsbCkge1xyXG4gICAgY29uc3QgY29udGVudFN0YXJ0ID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGggKyAxOyAvLyArMSBmb3IgdGhlICdbJ1xyXG4gICAgY29uc3QgY29udGVudEVuZCA9IGNvbnRlbnRTdGFydCArIG1hdGNoWzJdLmxlbmd0aDtcclxuICAgIGlmIChuID49IGNvbnRlbnRTdGFydCAmJiBuIDw9IGNvbnRlbnRFbmQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbnR5cGUgUmFuZ2UgPSBbbnVtYmVyLCBudW1iZXJdO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUHJvcGVydHlWYWx1ZVJhbmdlcyhcclxuICBzZ2Y6IHN0cmluZyxcclxuICBrZXlzOiBzdHJpbmdbXSA9IFsnQycsICdUTScsICdHTicsICdQQyddXHJcbik6IFJhbmdlW10ge1xyXG4gIGNvbnN0IHJhbmdlczogUmFuZ2VbXSA9IFtdO1xyXG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKGBcXFxcYigke2tleXMuam9pbignfCcpfSlcXFxcW2AsICdnJyk7XHJcblxyXG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcclxuICB3aGlsZSAoKG1hdGNoID0gcGF0dGVybi5leGVjKHNnZikpICE9PSBudWxsKSB7XHJcbiAgICBjb25zdCBwcm9wU3RhcnQgPSBtYXRjaC5pbmRleDtcclxuICAgIGNvbnN0IHZhbHVlU3RhcnQgPSBwcm9wU3RhcnQgKyBtYXRjaFsxXS5sZW5ndGggKyAxOyAvLyArMSBmb3IgJ1snXHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBtYXRjaCBpcyBpbnNpZGUgYW55IGV4aXN0aW5nIHJhbmdlXHJcbiAgICBjb25zdCBpc0luc2lkZUV4aXN0aW5nUmFuZ2UgPSByYW5nZXMuc29tZShcclxuICAgICAgKFtzdGFydCwgZW5kXSkgPT4gcHJvcFN0YXJ0ID49IHN0YXJ0ICYmIHByb3BTdGFydCA8PSBlbmRcclxuICAgICk7XHJcblxyXG4gICAgaWYgKGlzSW5zaWRlRXhpc3RpbmdSYW5nZSkge1xyXG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIG1hdGNoIGFzIGl0J3MgaW5zaWRlIGFub3RoZXIgcHJvcGVydHkgdmFsdWVcclxuICAgIH1cclxuXHJcbiAgICAvLyBGaW5kIHRoZSBmaXJzdCB1bmVzY2FwZWQgY2xvc2luZyBicmFja2V0XHJcbiAgICBsZXQgaSA9IHZhbHVlU3RhcnQ7XHJcbiAgICBsZXQgZXNjYXBlZCA9IGZhbHNlO1xyXG5cclxuICAgIHdoaWxlIChpIDwgc2dmLmxlbmd0aCkge1xyXG4gICAgICBjb25zdCBjaGFyID0gc2dmW2ldO1xyXG5cclxuICAgICAgaWYgKGVzY2FwZWQpIHtcclxuICAgICAgICBlc2NhcGVkID0gZmFsc2U7XHJcbiAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJ1xcXFwnKSB7XHJcbiAgICAgICAgZXNjYXBlZCA9IHRydWU7XHJcbiAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJ10nKSB7XHJcbiAgICAgICAgLy8gRm91bmQgdW5lc2NhcGVkIGNsb3NpbmcgYnJhY2tldFxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpKys7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGkgPCBzZ2YubGVuZ3RoKSB7XHJcbiAgICAgIHJhbmdlcy5wdXNoKFt2YWx1ZVN0YXJ0LCBpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmFuZ2VzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNJbkFueVJhbmdlKGluZGV4OiBudW1iZXIsIHJhbmdlczogUmFuZ2VbXSk6IGJvb2xlYW4ge1xyXG4gIC8vIHJhbmdlcyBtdXN0IGJlIHNvcnRlZFxyXG4gIGxldCBsZWZ0ID0gMDtcclxuICBsZXQgcmlnaHQgPSByYW5nZXMubGVuZ3RoIC0gMTtcclxuXHJcbiAgd2hpbGUgKGxlZnQgPD0gcmlnaHQpIHtcclxuICAgIGNvbnN0IG1pZCA9IChsZWZ0ICsgcmlnaHQpID4+IDE7XHJcbiAgICBjb25zdCBbc3RhcnQsIGVuZF0gPSByYW5nZXNbbWlkXTtcclxuXHJcbiAgICBpZiAoaW5kZXggPCBzdGFydCkge1xyXG4gICAgICByaWdodCA9IG1pZCAtIDE7XHJcbiAgICB9IGVsc2UgaWYgKGluZGV4ID4gZW5kKSB7XHJcbiAgICAgIGxlZnQgPSBtaWQgKyAxO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBnZXREZWR1cGxpY2F0ZWRQcm9wcyA9ICh0YXJnZXRQcm9wczogU2dmUHJvcEJhc2VbXSkgPT4ge1xyXG4gIHJldHVybiBmaWx0ZXIoXHJcbiAgICB0YXJnZXRQcm9wcyxcclxuICAgIChwcm9wOiBTZ2ZQcm9wQmFzZSwgaW5kZXg6IG51bWJlcikgPT5cclxuICAgICAgaW5kZXggPT09XHJcbiAgICAgIGZpbmRMYXN0SW5kZXgoXHJcbiAgICAgICAgdGFyZ2V0UHJvcHMsXHJcbiAgICAgICAgKGxhc3RQcm86IFNnZlByb3BCYXNlKSA9PlxyXG4gICAgICAgICAgcHJvcC50b2tlbiA9PT0gbGFzdFByby50b2tlbiAmJiBwcm9wLnZhbHVlID09PSBsYXN0UHJvLnZhbHVlXHJcbiAgICAgIClcclxuICApO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzTW92ZU5vZGUgPSAobjogVE5vZGUpID0+IHtcclxuICByZXR1cm4gbi5tb2RlbC5tb3ZlUHJvcHMubGVuZ3RoID4gMDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1Jvb3ROb2RlID0gKG46IFROb2RlKSA9PiB7XHJcbiAgcmV0dXJuIG4ubW9kZWwucm9vdFByb3BzLmxlbmd0aCA+IDAgfHwgbi5pc1Jvb3QoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1NldHVwTm9kZSA9IChuOiBUTm9kZSkgPT4ge1xyXG4gIHJldHVybiBuLm1vZGVsLnNldHVwUHJvcHMubGVuZ3RoID4gMDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXROb2RlTnVtYmVyID0gKG46IFROb2RlLCBwYXJlbnQ/OiBUTm9kZSkgPT4ge1xyXG4gIGNvbnN0IHBhdGggPSBuLmdldFBhdGgoKTtcclxuICBsZXQgbW92ZXNDb3VudCA9IHBhdGguZmlsdGVyKG4gPT4gaXNNb3ZlTm9kZShuKSkubGVuZ3RoO1xyXG4gIGlmIChwYXJlbnQpIHtcclxuICAgIG1vdmVzQ291bnQgKz0gcGFyZW50LmdldFBhdGgoKS5maWx0ZXIobiA9PiBpc01vdmVOb2RlKG4pKS5sZW5ndGg7XHJcbiAgfVxyXG4gIHJldHVybiBtb3Zlc0NvdW50O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlbWUgcHJvcGVydHkga2V5cyBmb3IgdHlwZS1zYWZlIGFjY2VzcyB0byB0aGVtZSBjb25maWd1cmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZW51bSBUaGVtZVByb3BlcnR5S2V5IHtcclxuICBQb3NpdGl2ZU5vZGVDb2xvciA9ICdwb3NpdGl2ZU5vZGVDb2xvcicsXHJcbiAgTmVnYXRpdmVOb2RlQ29sb3IgPSAnbmVnYXRpdmVOb2RlQ29sb3InLFxyXG4gIE5ldXRyYWxOb2RlQ29sb3IgPSAnbmV1dHJhbE5vZGVDb2xvcicsXHJcbiAgRGVmYXVsdE5vZGVDb2xvciA9ICdkZWZhdWx0Tm9kZUNvbG9yJyxcclxuICBXYXJuaW5nTm9kZUNvbG9yID0gJ3dhcm5pbmdOb2RlQ29sb3InLFxyXG4gIFNoYWRvd0NvbG9yID0gJ3NoYWRvd0NvbG9yJyxcclxuICBCb2FyZExpbmVDb2xvciA9ICdib2FyZExpbmVDb2xvcicsXHJcbiAgQWN0aXZlQ29sb3IgPSAnYWN0aXZlQ29sb3InLFxyXG4gIEluYWN0aXZlQ29sb3IgPSAnaW5hY3RpdmVDb2xvcicsXHJcbiAgQm9hcmRCYWNrZ3JvdW5kQ29sb3IgPSAnYm9hcmRCYWNrZ3JvdW5kQ29sb3InLFxyXG4gIEZsYXRCbGFja0NvbG9yID0gJ2ZsYXRCbGFja0NvbG9yJyxcclxuICBGbGF0QmxhY2tDb2xvckFsdCA9ICdmbGF0QmxhY2tDb2xvckFsdCcsXHJcbiAgRmxhdFdoaXRlQ29sb3IgPSAnZmxhdFdoaXRlQ29sb3InLFxyXG4gIEZsYXRXaGl0ZUNvbG9yQWx0ID0gJ2ZsYXRXaGl0ZUNvbG9yQWx0JyxcclxuICBCb2FyZEVkZ2VMaW5lV2lkdGggPSAnYm9hcmRFZGdlTGluZVdpZHRoJyxcclxuICBCb2FyZExpbmVXaWR0aCA9ICdib2FyZExpbmVXaWR0aCcsXHJcbiAgQm9hcmRMaW5lRXh0ZW50ID0gJ2JvYXJkTGluZUV4dGVudCcsXHJcbiAgU3RhclNpemUgPSAnc3RhclNpemUnLFxyXG4gIE1hcmt1cExpbmVXaWR0aCA9ICdtYXJrdXBMaW5lV2lkdGgnLFxyXG4gIEhpZ2hsaWdodENvbG9yID0gJ2hpZ2hsaWdodENvbG9yJyxcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZW1lIGNvbnRleHQgZm9yIG1hcmt1cCByZW5kZXJpbmdcclxuICovXHJcbmV4cG9ydCB0eXBlIFRoZW1lQ29udGV4dCA9IHtcclxuICB0aGVtZTogVGhlbWU7XHJcbiAgdGhlbWVPcHRpb25zOiBUaGVtZU9wdGlvbnM7XHJcbn07XHJcblxyXG4vKipcclxuICogT3B0aW9ucyBmb3IgY29uZmlndXJpbmcgR2hvc3RCYW4uXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBHaG9zdEJhbk9wdGlvbnMgPSB7XHJcbiAgYm9hcmRTaXplOiBudW1iZXI7XHJcbiAgc2l6ZT86IG51bWJlcjtcclxuICBkeW5hbWljUGFkZGluZzogYm9vbGVhbjtcclxuICBwYWRkaW5nOiBudW1iZXI7XHJcbiAgem9vbT86IGJvb2xlYW47XHJcbiAgZXh0ZW50OiBudW1iZXI7XHJcbiAgdGhlbWU6IFRoZW1lO1xyXG4gIGFuYWx5c2lzUG9pbnRUaGVtZTogQW5hbHlzaXNQb2ludFRoZW1lO1xyXG4gIGNvb3JkaW5hdGU6IGJvb2xlYW47XHJcbiAgaW50ZXJhY3RpdmU6IGJvb2xlYW47XHJcbiAgYmFja2dyb3VuZDogYm9vbGVhbjtcclxuICBzaG93QW5hbHlzaXM6IGJvb2xlYW47XHJcbiAgc2hvd093bmVyc2hpcDogYm9vbGVhbjtcclxuICBhZGFwdGl2ZUJvYXJkTGluZTogYm9vbGVhbjtcclxuICB0aGVtZU9wdGlvbnM6IFRoZW1lT3B0aW9ucztcclxuICB0aGVtZVJlc291cmNlczogVGhlbWVSZXNvdXJjZXM7XHJcbiAgbW92ZVNvdW5kOiBib29sZWFuO1xyXG4gIGFkYXB0aXZlU3RhclNpemU6IGJvb2xlYW47XHJcbiAgbW9iaWxlSW5kaWNhdG9yT2Zmc2V0OiBudW1iZXI7XHJcbiAgZm9yY2VBbmFseXNpc0JvYXJkU2l6ZT86IG51bWJlcjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEdob3N0QmFuT3B0aW9uc1BhcmFtcyA9IHtcclxuICBib2FyZFNpemU/OiBudW1iZXI7XHJcbiAgc2l6ZT86IG51bWJlcjtcclxuICBkeW5hbWljUGFkZGluZz86IGJvb2xlYW47XHJcbiAgcGFkZGluZz86IG51bWJlcjtcclxuICB6b29tPzogYm9vbGVhbjtcclxuICBleHRlbnQ/OiBudW1iZXI7XHJcbiAgdGhlbWU/OiBUaGVtZTtcclxuICBhbmFseXNpc1BvaW50VGhlbWU/OiBBbmFseXNpc1BvaW50VGhlbWU7XHJcbiAgY29vcmRpbmF0ZT86IGJvb2xlYW47XHJcbiAgaW50ZXJhY3RpdmU/OiBib29sZWFuO1xyXG4gIGJhY2tncm91bmQ/OiBib29sZWFuO1xyXG4gIHNob3dBbmFseXNpcz86IGJvb2xlYW47XHJcbiAgc2hvd093bmVyc2hpcD86IGJvb2xlYW47XHJcbiAgYWRhcHRpdmVCb2FyZExpbmU/OiBib29sZWFuO1xyXG4gIHRoZW1lT3B0aW9ucz86IFBhcnRpYWw8VGhlbWVPcHRpb25zPjtcclxuICB0aGVtZVJlc291cmNlcz86IFRoZW1lUmVzb3VyY2VzO1xyXG4gIG1vdmVTb3VuZD86IGJvb2xlYW47XHJcbiAgYWRhcHRpdmVTdGFyU2l6ZT86IGJvb2xlYW47XHJcbiAgZm9yY2VBbmFseXNpc0JvYXJkU2l6ZT86IG51bWJlcjtcclxuICBtb2JpbGVJbmRpY2F0b3JPZmZzZXQ/OiBudW1iZXI7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBUaGVtZUNvbmZpZyA9IHtcclxuICBwb3NpdGl2ZU5vZGVDb2xvcjogc3RyaW5nO1xyXG4gIG5lZ2F0aXZlTm9kZUNvbG9yOiBzdHJpbmc7XHJcbiAgbmV1dHJhbE5vZGVDb2xvcjogc3RyaW5nO1xyXG4gIGRlZmF1bHROb2RlQ29sb3I6IHN0cmluZztcclxuICB3YXJuaW5nTm9kZUNvbG9yOiBzdHJpbmc7XHJcbiAgc2hhZG93Q29sb3I6IHN0cmluZztcclxuICBib2FyZExpbmVDb2xvcjogc3RyaW5nO1xyXG4gIGFjdGl2ZUNvbG9yOiBzdHJpbmc7XHJcbiAgaW5hY3RpdmVDb2xvcjogc3RyaW5nO1xyXG4gIGJvYXJkQmFja2dyb3VuZENvbG9yOiBzdHJpbmc7XHJcbiAgLy8gTWFya3VwIGNvbG9ycyBmb3IgZmxhdCB0aGVtZXNcclxuICBmbGF0QmxhY2tDb2xvcjogc3RyaW5nO1xyXG4gIGZsYXRCbGFja0NvbG9yQWx0OiBzdHJpbmc7XHJcbiAgZmxhdFdoaXRlQ29sb3I6IHN0cmluZztcclxuICBmbGF0V2hpdGVDb2xvckFsdDogc3RyaW5nO1xyXG4gIC8vIEJvYXJkIGRpc3BsYXkgcHJvcGVydGllc1xyXG4gIGJvYXJkRWRnZUxpbmVXaWR0aDogbnVtYmVyO1xyXG4gIGJvYXJkTGluZVdpZHRoOiBudW1iZXI7XHJcbiAgYm9hcmRMaW5lRXh0ZW50OiBudW1iZXI7XHJcbiAgc3RhclNpemU6IG51bWJlcjtcclxuICBtYXJrdXBMaW5lV2lkdGg6IG51bWJlcjtcclxuICBoaWdobGlnaHRDb2xvcjogc3RyaW5nO1xyXG4gIHN0b25lUmF0aW86IG51bWJlcjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFRoZW1lT3B0aW9ucyA9IHtcclxuICBba2V5IGluIFRoZW1lXT86IFBhcnRpYWw8VGhlbWVDb25maWc+O1xyXG59ICYge1xyXG4gIGRlZmF1bHQ6IFRoZW1lQ29uZmlnO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVGhlbWVSZXNvdXJjZXMgPSB7XHJcbiAgW2tleSBpbiBUaGVtZV06IHtib2FyZD86IHN0cmluZzsgYmxhY2tzOiBzdHJpbmdbXTsgd2hpdGVzOiBzdHJpbmdbXX07XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBDb25zdW1lZEFuYWx5c2lzID0ge1xyXG4gIHJlc3VsdHM6IEFuYWx5c2lzW107XHJcbiAgcGFyYW1zOiBBbmFseXNpc1BhcmFtcyB8IG51bGw7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbmFseXNlcyA9IHtcclxuICByZXN1bHRzOiBBbmFseXNpc1tdO1xyXG4gIHBhcmFtczogQW5hbHlzaXNQYXJhbXMgfCBudWxsO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW5hbHlzaXMgPSB7XHJcbiAgaWQ6IHN0cmluZztcclxuICBpc0R1cmluZ1NlYXJjaDogYm9vbGVhbjtcclxuICBtb3ZlSW5mb3M6IE1vdmVJbmZvW107XHJcbiAgcm9vdEluZm86IFJvb3RJbmZvO1xyXG4gIHBvbGljeTogbnVtYmVyW107XHJcbiAgaHVtYW5Qb2xpY3k/OiBudW1iZXJbXTtcclxuICBvd25lcnNoaXA6IG51bWJlcltdO1xyXG4gIHR1cm5OdW1iZXI6IG51bWJlcjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFuYWx5c2lzUGFyYW1zID0ge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgaW5pdGlhbFBsYXllcjogc3RyaW5nO1xyXG4gIG1vdmVzOiBhbnlbXTtcclxuICBydWxlczogc3RyaW5nO1xyXG4gIGtvbWk6IHN0cmluZztcclxuICBib2FyZFhTaXplOiBudW1iZXI7XHJcbiAgYm9hcmRZU2l6ZTogbnVtYmVyO1xyXG4gIGluY2x1ZGVQb2xpY3k6IGJvb2xlYW47XHJcbiAgcHJpb3JpdHk6IG51bWJlcjtcclxuICBtYXhWaXNpdHM6IG51bWJlcjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIE1vdmVJbmZvID0ge1xyXG4gIGlzU3ltbWV0cnlPZjogc3RyaW5nO1xyXG4gIGxjYjogbnVtYmVyO1xyXG4gIG1vdmU6IHN0cmluZztcclxuICBvcmRlcjogbnVtYmVyO1xyXG4gIHByaW9yOiBudW1iZXI7XHJcbiAgcHY6IHN0cmluZ1tdO1xyXG4gIHNjb3JlTGVhZDogbnVtYmVyO1xyXG4gIHNjb3JlTWVhbjogbnVtYmVyO1xyXG4gIHNjb3JlU2VsZlBsYXk6IG51bWJlcjtcclxuICBzY29yZVN0ZGV2OiBudW1iZXI7XHJcbiAgdXRpbGl0eTogbnVtYmVyO1xyXG4gIHV0aWxpdHlMY2I6IG51bWJlcjtcclxuICB2aXNpdHM6IG51bWJlcjtcclxuICB3aW5yYXRlOiBudW1iZXI7XHJcbiAgd2VpZ2h0OiBudW1iZXI7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBSb290SW5mbyA9IHtcclxuICAvLyBjdXJyZW50UGxheWVyIGlzIG5vdCBvZmZpY2lhbGx5IHBhcnQgb2YgdGhlIEdUUCByZXN1bHRzIGJ1dCBpdCBpcyBoZWxwZnVsIHRvIGhhdmUgaXQgaGVyZSB0byBhdm9pZCBwYXNzaW5nIGl0IHRocm91Z2ggdGhlIGFyZ3VtZW50c1xyXG4gIGN1cnJlbnRQbGF5ZXI6IHN0cmluZztcclxuICBzY29yZUxlYWQ6IG51bWJlcjtcclxuICBzY29yZVNlbGZwbGF5OiBudW1iZXI7XHJcbiAgc2NvcmVTdGRldjogbnVtYmVyO1xyXG4gIHV0aWxpdHk6IG51bWJlcjtcclxuICB2aXNpdHM6IG51bWJlcjtcclxuICB3aW5yYXRlOiBudW1iZXI7XHJcbiAgd2VpZ2h0PzogbnVtYmVyO1xyXG4gIHJhd1N0V3JFcnJvcj86IG51bWJlcjtcclxuICByYXdTdFNjb3JlRXJyb3I/OiBudW1iZXI7XHJcbiAgcmF3VmFyVGltZUxlZnQ/OiBudW1iZXI7XHJcbiAgLy8gR1RQIHJlc3VsdHMgZG9uJ3QgaW5jbHVkZSB0aGUgZm9sbG93aW5nIGZpZWxkc1xyXG4gIGxjYj86IG51bWJlcjtcclxuICBzeW1IYXNoPzogc3RyaW5nO1xyXG4gIHRoaXNIYXNoPzogc3RyaW5nO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW5hbHlzaXNQb2ludE9wdGlvbnMgPSB7XHJcbiAgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XHJcbiAgeDogbnVtYmVyO1xyXG4gIHk6IG51bWJlcjtcclxuICByOiBudW1iZXI7XHJcbiAgcm9vdEluZm86IFJvb3RJbmZvO1xyXG4gIG1vdmVJbmZvOiBNb3ZlSW5mbztcclxuICBwb2xpY3lWYWx1ZT86IG51bWJlcjtcclxuICB0aGVtZT86IEFuYWx5c2lzUG9pbnRUaGVtZTtcclxuICBvdXRsaW5lQ29sb3I/OiBzdHJpbmc7XHJcbiAgc2hvd09yZGVyPzogYm9vbGVhbjtcclxufTtcclxuXHJcbmV4cG9ydCBlbnVtIEtpIHtcclxuICBCbGFjayA9IDEsXHJcbiAgV2hpdGUgPSAtMSxcclxuICBFbXB0eSA9IDAsXHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIFRoZW1lIHtcclxuICBCbGFja0FuZFdoaXRlID0gJ2JsYWNrX2FuZF93aGl0ZScsXHJcbiAgRmxhdCA9ICdmbGF0JyxcclxuICBTdWJkdWVkID0gJ3N1YmR1ZWQnLFxyXG4gIFNoZWxsU3RvbmUgPSAnc2hlbGxfc3RvbmUnLFxyXG4gIFNsYXRlQW5kU2hlbGwgPSAnc2xhdGVfYW5kX3NoZWxsJyxcclxuICBXYWxudXQgPSAnd2FsbnV0JyxcclxuICBQaG90b3JlYWxpc3RpYyA9ICdwaG90b3JlYWxpc3RpYycsXHJcbiAgRGFyayA9ICdkYXJrJyxcclxuICBXYXJtID0gJ3dhcm0nLFxyXG4gIFl1bnppTW9ua2V5RGFyayA9ICd5dW56aV9tb25rZXlfZGFyaycsXHJcbiAgSGlnaENvbnRyYXN0ID0gJ2hpZ2hfY29udHJhc3QnLFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBBbmFseXNpc1BvaW50VGhlbWUge1xyXG4gIERlZmF1bHQgPSAnZGVmYXVsdCcsXHJcbiAgUHJvYmxlbSA9ICdwcm9ibGVtJyxcclxuICBTY2VuYXJpbyA9ICdzY2VuYXJpbycsXHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIENlbnRlciB7XHJcbiAgTGVmdCA9ICdsJyxcclxuICBSaWdodCA9ICdyJyxcclxuICBUb3AgPSAndCcsXHJcbiAgQm90dG9tID0gJ2InLFxyXG4gIFRvcFJpZ2h0ID0gJ3RyJyxcclxuICBUb3BMZWZ0ID0gJ3RsJyxcclxuICBCb3R0b21MZWZ0ID0gJ2JsJyxcclxuICBCb3R0b21SaWdodCA9ICdicicsXHJcbiAgQ2VudGVyID0gJ2MnLFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBFZmZlY3Qge1xyXG4gIE5vbmUgPSAnJyxcclxuICBCYW4gPSAnYmFuJyxcclxuICBEaW0gPSAnZGltJyxcclxuICBIaWdobGlnaHQgPSAnaGlnaGxpZ2h0JyxcclxufVxyXG5cclxuZXhwb3J0IGVudW0gTWFya3VwIHtcclxuICBDdXJyZW50ID0gJ2N1JyxcclxuICBDaXJjbGUgPSAnY2knLFxyXG4gIENpcmNsZVNvbGlkID0gJ2NpcycsXHJcbiAgU3F1YXJlID0gJ3NxJyxcclxuICBTcXVhcmVTb2xpZCA9ICdzcXMnLFxyXG4gIFRyaWFuZ2xlID0gJ3RyaScsXHJcbiAgQ3Jvc3MgPSAnY3InLFxyXG4gIE51bWJlciA9ICdudW0nLFxyXG4gIExldHRlciA9ICdsZScsXHJcbiAgUG9zaXRpdmVOb2RlID0gJ3BvcycsXHJcbiAgUG9zaXRpdmVBY3RpdmVOb2RlID0gJ3Bvc2EnLFxyXG4gIFBvc2l0aXZlRGFzaGVkTm9kZSA9ICdwb3NkYScsXHJcbiAgUG9zaXRpdmVEb3R0ZWROb2RlID0gJ3Bvc2R0JyxcclxuICBQb3NpdGl2ZURhc2hlZEFjdGl2ZU5vZGUgPSAncG9zZGFhJyxcclxuICBQb3NpdGl2ZURvdHRlZEFjdGl2ZU5vZGUgPSAncG9zZHRhJyxcclxuICBOZWdhdGl2ZU5vZGUgPSAnbmVnJyxcclxuICBOZWdhdGl2ZUFjdGl2ZU5vZGUgPSAnbmVnYScsXHJcbiAgTmVnYXRpdmVEYXNoZWROb2RlID0gJ25lZ2RhJyxcclxuICBOZWdhdGl2ZURvdHRlZE5vZGUgPSAnbmVnZHQnLFxyXG4gIE5lZ2F0aXZlRGFzaGVkQWN0aXZlTm9kZSA9ICduZWdkYWEnLFxyXG4gIE5lZ2F0aXZlRG90dGVkQWN0aXZlTm9kZSA9ICduZWdkdGEnLFxyXG4gIE5ldXRyYWxOb2RlID0gJ25ldScsXHJcbiAgTmV1dHJhbEFjdGl2ZU5vZGUgPSAnbmV1YScsXHJcbiAgTmV1dHJhbERhc2hlZE5vZGUgPSAnbmV1ZGEnLFxyXG4gIE5ldXRyYWxEb3R0ZWROb2RlID0gJ25ldWR0JyxcclxuICBOZXV0cmFsRGFzaGVkQWN0aXZlTm9kZSA9ICduZXVkdGEnLFxyXG4gIE5ldXRyYWxEb3R0ZWRBY3RpdmVOb2RlID0gJ25ldWRhYScsXHJcbiAgV2FybmluZ05vZGUgPSAnd2EnLFxyXG4gIFdhcm5pbmdBY3RpdmVOb2RlID0gJ3dhYScsXHJcbiAgV2FybmluZ0Rhc2hlZE5vZGUgPSAnd2FkYScsXHJcbiAgV2FybmluZ0RvdHRlZE5vZGUgPSAnd2FkdCcsXHJcbiAgV2FybmluZ0Rhc2hlZEFjdGl2ZU5vZGUgPSAnd2FkYWEnLFxyXG4gIFdhcm5pbmdEb3R0ZWRBY3RpdmVOb2RlID0gJ3dhZHRhJyxcclxuICBEZWZhdWx0Tm9kZSA9ICdkZScsXHJcbiAgRGVmYXVsdEFjdGl2ZU5vZGUgPSAnZGVhJyxcclxuICBEZWZhdWx0RGFzaGVkTm9kZSA9ICdkZWRhJyxcclxuICBEZWZhdWx0RG90dGVkTm9kZSA9ICdkZWR0JyxcclxuICBEZWZhdWx0RGFzaGVkQWN0aXZlTm9kZSA9ICdkZWRhYScsXHJcbiAgRGVmYXVsdERvdHRlZEFjdGl2ZU5vZGUgPSAnZGVkdGEnLFxyXG4gIE5vZGUgPSAnbm9kZScsXHJcbiAgRGFzaGVkTm9kZSA9ICdkYW5vZGUnLFxyXG4gIERvdHRlZE5vZGUgPSAnZHRub2RlJyxcclxuICBBY3RpdmVOb2RlID0gJ2Fub2RlJyxcclxuICBEYXNoZWRBY3RpdmVOb2RlID0gJ2Rhbm9kZScsXHJcbiAgSGlnaGxpZ2h0ID0gJ2hsJyxcclxuICBOb25lID0gJycsXHJcbn1cclxuXHJcbmV4cG9ydCBlbnVtIEN1cnNvciB7XHJcbiAgTm9uZSA9ICcnLFxyXG4gIEJsYWNrU3RvbmUgPSAnYicsXHJcbiAgV2hpdGVTdG9uZSA9ICd3JyxcclxuICBDaXJjbGUgPSAnYycsXHJcbiAgU3F1YXJlID0gJ3MnLFxyXG4gIFRyaWFuZ2xlID0gJ3RyaScsXHJcbiAgQ3Jvc3MgPSAnY3InLFxyXG4gIENsZWFyID0gJ2NsJyxcclxuICBUZXh0ID0gJ3QnLFxyXG59XHJcblxyXG5leHBvcnQgZW51bSBQcm9ibGVtQW5zd2VyVHlwZSB7XHJcbiAgUmlnaHQgPSAnMScsXHJcbiAgV3JvbmcgPSAnMicsXHJcbiAgVmFyaWFudCA9ICczJyxcclxufVxyXG5cclxuZXhwb3J0IGVudW0gUGF0aERldGVjdGlvblN0cmF0ZWd5IHtcclxuICBQb3N0ID0gJ3Bvc3QnLFxyXG4gIFByZSA9ICdwcmUnLFxyXG4gIEJvdGggPSAnYm90aCcsXHJcbn1cclxuIiwiaW1wb3J0IHtjaHVua30gZnJvbSAnbG9kYXNoJztcclxuaW1wb3J0IHtUaGVtZSwgVGhlbWVDb25maWd9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuY29uc3Qgc2V0dGluZ3MgPSB7Y2RuOiAnaHR0cHM6Ly9zLnNoYW93cS5jb20nfTtcclxuXHJcbmV4cG9ydCBjb25zdCBCQVNFX1RIRU1FX0NPTkZJRzogVGhlbWVDb25maWcgPSB7XHJcbiAgcG9zaXRpdmVOb2RlQ29sb3I6ICcjNGQ3YzBmJyxcclxuICBuZWdhdGl2ZU5vZGVDb2xvcjogJyNiOTFjMWMnLFxyXG4gIG5ldXRyYWxOb2RlQ29sb3I6ICcjYTE2MjA3JyxcclxuICBkZWZhdWx0Tm9kZUNvbG9yOiAnIzQwNDA0MCcsXHJcbiAgd2FybmluZ05vZGVDb2xvcjogJyNmZmRmMjAnLFxyXG4gIHNoYWRvd0NvbG9yOiAnIzU1NTU1NScsXHJcbiAgYm9hcmRMaW5lQ29sb3I6ICcjMDAwMDAwJyxcclxuICBhY3RpdmVDb2xvcjogJyMwMDAwMDAnLFxyXG4gIGluYWN0aXZlQ29sb3I6ICcjNjY2NjY2JyxcclxuICBib2FyZEJhY2tncm91bmRDb2xvcjogJyNGRkZGRkYnLFxyXG4gIGZsYXRCbGFja0NvbG9yOiAnIzAwMDAwMCcsXHJcbiAgZmxhdEJsYWNrQ29sb3JBbHQ6ICcjMDAwMDAwJywgLy8gQWx0ZXJuYXRpdmUsIHRlbXBvcmFyaWx5IHNhbWUgYXMgbWFpbiBjb2xvclxyXG4gIGZsYXRXaGl0ZUNvbG9yOiAnI0ZGRkZGRicsXHJcbiAgZmxhdFdoaXRlQ29sb3JBbHQ6ICcjRkZGRkZGJywgLy8gQWx0ZXJuYXRpdmUsIHRlbXBvcmFyaWx5IHNhbWUgYXMgbWFpbiBjb2xvclxyXG4gIGJvYXJkRWRnZUxpbmVXaWR0aDogMixcclxuICBib2FyZExpbmVXaWR0aDogMS4yLFxyXG4gIGJvYXJkTGluZUV4dGVudDogMC41LFxyXG4gIHN0YXJTaXplOiAzLFxyXG4gIG1hcmt1cExpbmVXaWR0aDogMixcclxuICBoaWdobGlnaHRDb2xvcjogJyNmZmViNjQnLFxyXG4gIHN0b25lUmF0aW86IDAuNDUsXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgTUFYX0JPQVJEX1NJWkUgPSAyOTtcclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQk9BUkRfU0laRSA9IDE5O1xyXG5leHBvcnQgY29uc3QgQTFfTEVUVEVSUyA9IFtcclxuICAnQScsXHJcbiAgJ0InLFxyXG4gICdDJyxcclxuICAnRCcsXHJcbiAgJ0UnLFxyXG4gICdGJyxcclxuICAnRycsXHJcbiAgJ0gnLFxyXG4gICdKJyxcclxuICAnSycsXHJcbiAgJ0wnLFxyXG4gICdNJyxcclxuICAnTicsXHJcbiAgJ08nLFxyXG4gICdQJyxcclxuICAnUScsXHJcbiAgJ1InLFxyXG4gICdTJyxcclxuICAnVCcsXHJcbl07XHJcbmV4cG9ydCBjb25zdCBBMV9MRVRURVJTX1dJVEhfSSA9IFtcclxuICAnQScsXHJcbiAgJ0InLFxyXG4gICdDJyxcclxuICAnRCcsXHJcbiAgJ0UnLFxyXG4gICdGJyxcclxuICAnRycsXHJcbiAgJ0gnLFxyXG4gICdJJyxcclxuICAnSicsXHJcbiAgJ0snLFxyXG4gICdMJyxcclxuICAnTScsXHJcbiAgJ04nLFxyXG4gICdPJyxcclxuICAnUCcsXHJcbiAgJ1EnLFxyXG4gICdSJyxcclxuICAnUycsXHJcbl07XHJcbmV4cG9ydCBjb25zdCBBMV9OVU1CRVJTID0gW1xyXG4gIDE5LCAxOCwgMTcsIDE2LCAxNSwgMTQsIDEzLCAxMiwgMTEsIDEwLCA5LCA4LCA3LCA2LCA1LCA0LCAzLCAyLCAxLFxyXG5dO1xyXG5leHBvcnQgY29uc3QgU0dGX0xFVFRFUlMgPSBbXHJcbiAgJ2EnLFxyXG4gICdiJyxcclxuICAnYycsXHJcbiAgJ2QnLFxyXG4gICdlJyxcclxuICAnZicsXHJcbiAgJ2cnLFxyXG4gICdoJyxcclxuICAnaScsXHJcbiAgJ2onLFxyXG4gICdrJyxcclxuICAnbCcsXHJcbiAgJ20nLFxyXG4gICduJyxcclxuICAnbycsXHJcbiAgJ3AnLFxyXG4gICdxJyxcclxuICAncicsXHJcbiAgJ3MnLFxyXG5dO1xyXG4vLyBleHBvcnQgY29uc3QgQkxBTktfQVJSQVkgPSBjaHVuayhuZXcgQXJyYXkoMzYxKS5maWxsKDApLCAxOSk7XHJcbmV4cG9ydCBjb25zdCBET1RfU0laRSA9IDM7XHJcbmV4cG9ydCBjb25zdCBFWFBBTkRfSCA9IDU7XHJcbmV4cG9ydCBjb25zdCBFWFBBTkRfViA9IDU7XHJcbmV4cG9ydCBjb25zdCBSRVNQT05TRV9USU1FID0gMTAwO1xyXG5cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfT1BUSU9OUyA9IHtcclxuICBib2FyZFNpemU6IDE5LFxyXG4gIHBhZGRpbmc6IDE1LFxyXG4gIGV4dGVudDogMixcclxuICBpbnRlcmFjdGl2ZTogZmFsc2UsXHJcbiAgY29vcmRpbmF0ZTogdHJ1ZSxcclxuICB0aGVtZTogVGhlbWUuRmxhdCxcclxuICBiYWNrZ3JvdW5kOiBmYWxzZSxcclxuICB6b29tOiBmYWxzZSxcclxuICBzaG93QW5hbHlzaXM6IGZhbHNlLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IFRIRU1FX1JFU09VUkNFUzoge1xyXG4gIFtrZXkgaW4gVGhlbWVdOiB7XHJcbiAgICBib2FyZD86IHN0cmluZztcclxuICAgIGJsYWNrczogc3RyaW5nW107XHJcbiAgICB3aGl0ZXM6IHN0cmluZ1tdO1xyXG4gICAgbG93UmVzPzoge1xyXG4gICAgICBib2FyZD86IHN0cmluZztcclxuICAgICAgYmxhY2tzOiBzdHJpbmdbXTtcclxuICAgICAgd2hpdGVzOiBzdHJpbmdbXTtcclxuICAgIH07XHJcbiAgICBtaWNyb1Jlcz86IHtcclxuICAgICAgYm9hcmQ/OiBzdHJpbmc7XHJcbiAgICAgIGJsYWNrczogc3RyaW5nW107XHJcbiAgICAgIHdoaXRlczogc3RyaW5nW107XHJcbiAgICB9O1xyXG4gIH07XHJcbn0gPSB7XHJcbiAgW1RoZW1lLkJsYWNrQW5kV2hpdGVdOiB7XHJcbiAgICBibGFja3M6IFtdLFxyXG4gICAgd2hpdGVzOiBbXSxcclxuICB9LFxyXG4gIFtUaGVtZS5TdWJkdWVkXToge1xyXG4gICAgYm9hcmQ6IGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3N1YmR1ZWQvYm9hcmQucG5nYCxcclxuICAgIGJsYWNrczogW2Ake3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3N1YmR1ZWQvYmxhY2sucG5nYF0sXHJcbiAgICB3aGl0ZXM6IFtgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zdWJkdWVkL3doaXRlLnBuZ2BdLFxyXG4gIH0sXHJcbiAgW1RoZW1lLlNoZWxsU3RvbmVdOiB7XHJcbiAgICBib2FyZDogYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvc2hlbGwtc3RvbmUvYm9hcmQucG5nYCxcclxuICAgIGJsYWNrczogW2Ake3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NoZWxsLXN0b25lL2JsYWNrLnBuZ2BdLFxyXG4gICAgd2hpdGVzOiBbXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NoZWxsLXN0b25lL3doaXRlMC5wbmdgLFxyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zaGVsbC1zdG9uZS93aGl0ZTEucG5nYCxcclxuICAgICAgYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvc2hlbGwtc3RvbmUvd2hpdGUyLnBuZ2AsXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NoZWxsLXN0b25lL3doaXRlMy5wbmdgLFxyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zaGVsbC1zdG9uZS93aGl0ZTQucG5nYCxcclxuICAgIF0sXHJcbiAgfSxcclxuICBbVGhlbWUuU2xhdGVBbmRTaGVsbF06IHtcclxuICAgIGJvYXJkOiBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zbGF0ZS1hbmQtc2hlbGwvYm9hcmQucG5nYCxcclxuICAgIGJsYWNrczogW1xyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zbGF0ZS1hbmQtc2hlbGwvc2xhdGUxLnBuZ2AsXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NsYXRlLWFuZC1zaGVsbC9zbGF0ZTIucG5nYCxcclxuICAgICAgYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvc2xhdGUtYW5kLXNoZWxsL3NsYXRlMy5wbmdgLFxyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zbGF0ZS1hbmQtc2hlbGwvc2xhdGU0LnBuZ2AsXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NsYXRlLWFuZC1zaGVsbC9zbGF0ZTUucG5nYCxcclxuICAgIF0sXHJcbiAgICB3aGl0ZXM6IFtcclxuICAgICAgYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvc2xhdGUtYW5kLXNoZWxsL3NoZWxsMS5wbmdgLFxyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zbGF0ZS1hbmQtc2hlbGwvc2hlbGwyLnBuZ2AsXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3NsYXRlLWFuZC1zaGVsbC9zaGVsbDMucG5nYCxcclxuICAgICAgYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvc2xhdGUtYW5kLXNoZWxsL3NoZWxsNC5wbmdgLFxyXG4gICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9zbGF0ZS1hbmQtc2hlbGwvc2hlbGw1LnBuZ2AsXHJcbiAgICBdLFxyXG4gIH0sXHJcbiAgW1RoZW1lLldhbG51dF06IHtcclxuICAgIGJvYXJkOiBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS93YWxudXQvYm9hcmQuanBnYCxcclxuICAgIGJsYWNrczogW2Ake3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3dhbG51dC9ibGFjay5wbmdgXSxcclxuICAgIHdoaXRlczogW2Ake3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3dhbG51dC93aGl0ZS5wbmdgXSxcclxuICB9LFxyXG4gIFtUaGVtZS5QaG90b3JlYWxpc3RpY106IHtcclxuICAgIGJvYXJkOiBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9waG90b3JlYWxpc3RpYy9ib2FyZC5wbmdgLFxyXG4gICAgYmxhY2tzOiBbYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUvcGhvdG9yZWFsaXN0aWMvYmxhY2sucG5nYF0sXHJcbiAgICB3aGl0ZXM6IFtgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS9waG90b3JlYWxpc3RpYy93aGl0ZS5wbmdgXSxcclxuICB9LFxyXG4gIFtUaGVtZS5GbGF0XToge1xyXG4gICAgYmxhY2tzOiBbXSxcclxuICAgIHdoaXRlczogW10sXHJcbiAgfSxcclxuICBbVGhlbWUuV2FybV06IHtcclxuICAgIGJsYWNrczogW10sXHJcbiAgICB3aGl0ZXM6IFtdLFxyXG4gIH0sXHJcbiAgW1RoZW1lLkRhcmtdOiB7XHJcbiAgICBibGFja3M6IFtdLFxyXG4gICAgd2hpdGVzOiBbXSxcclxuICB9LFxyXG4gIFtUaGVtZS5ZdW56aU1vbmtleURhcmtdOiB7XHJcbiAgICBib2FyZDogYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUveW1kL3l1bnppLW1vbmtleS1kYXJrL1lNRC1Cby1WMTBfbGVzc2JvcmRlcjE5MjBweC5wbmdgLFxyXG4gICAgYmxhY2tzOiBbXHJcbiAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3ltZC95dW56aS1tb25rZXktZGFyay9ZTUQtQi12MTQtMzM4cHgucG5nYCxcclxuICAgIF0sXHJcbiAgICB3aGl0ZXM6IFtcclxuICAgICAgYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUveW1kL3l1bnppLW1vbmtleS1kYXJrL1lNRC1XLXYxNC0zMzhweC5wbmdgLFxyXG4gICAgXSxcclxuICAgIGxvd1Jlczoge1xyXG4gICAgICBib2FyZDogYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUveW1kL3l1bnppLW1vbmtleS1kYXJrL1lNRC1Cby1WMTBfbGVzc2JvcmRlci05NjBweC5wbmdgLFxyXG4gICAgICBibGFja3M6IFtcclxuICAgICAgICBgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS95bWQveXVuemktbW9ua2V5LWRhcmsvWU1ELUItdjE0LTEzNXB4LnBuZ2AsXHJcbiAgICAgIF0sXHJcbiAgICAgIHdoaXRlczogW1xyXG4gICAgICAgIGAke3NldHRpbmdzLmNkbn0vYXNzZXRzL3RoZW1lL3ltZC95dW56aS1tb25rZXktZGFyay9ZTUQtVy12MTQtMTM1cHgucG5nYCxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICBtaWNyb1Jlczoge1xyXG4gICAgICBib2FyZDogYCR7c2V0dGluZ3MuY2RufS9hc3NldHMvdGhlbWUveW1kL1lNRC1Cby1WMTBfbGVzc2JvcmRlci05NjBweC5wbmdgLFxyXG4gICAgICBibGFja3M6IFtgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS95bWQvWU1ELUJfMTk3dG81OXB4LnBuZ2BdLFxyXG4gICAgICB3aGl0ZXM6IFtgJHtzZXR0aW5ncy5jZG59L2Fzc2V0cy90aGVtZS95bWQvWU1ELVdfMTk3dG81OXB4LnBuZ2BdLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIFtUaGVtZS5IaWdoQ29udHJhc3RdOiB7XHJcbiAgICBibGFja3M6IFtdLFxyXG4gICAgd2hpdGVzOiBbXSxcclxuICB9LFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IExJR0hUX0dSRUVOX1JHQiA9ICdyZ2JhKDEzNiwgMTcwLCA2MCwgMSknO1xyXG5leHBvcnQgY29uc3QgTElHSFRfWUVMTE9XX1JHQiA9ICdyZ2JhKDIwNiwgMjEwLCA4MywgMSknO1xyXG5leHBvcnQgY29uc3QgWUVMTE9XX1JHQiA9ICdyZ2JhKDI0MiwgMjE3LCA2MCwgMSknO1xyXG5leHBvcnQgY29uc3QgTElHSFRfUkVEX1JHQiA9ICdyZ2JhKDIzNiwgMTQ2LCA3MywgMSknO1xyXG4iLCJleHBvcnQgY29uc3QgTU9WRV9QUk9QX0xJU1QgPSBbXHJcbiAgJ0InLFxyXG4gIC8vIEtPIGlzIHN0YW5kYXJkIGluIG1vdmUgbGlzdCBidXQgdXN1YWxseSBiZSB1c2VkIGZvciBrb21pIGluIGdhbWVpbmZvIHByb3BzXHJcbiAgLy8gJ0tPJyxcclxuICAnTU4nLFxyXG4gICdXJyxcclxuXTtcclxuZXhwb3J0IGNvbnN0IFNFVFVQX1BST1BfTElTVCA9IFtcclxuICAnQUInLFxyXG4gICdBRScsXHJcbiAgJ0FXJyxcclxuICAvL1RPRE86IFBMIGlzIGEgdmFsdWUgb2YgY29sb3IgdHlwZVxyXG4gIC8vICdQTCdcclxuXTtcclxuZXhwb3J0IGNvbnN0IE5PREVfQU5OT1RBVElPTl9QUk9QX0xJU1QgPSBbXHJcbiAgJ0EnLFxyXG4gICdDJyxcclxuICAnRE0nLFxyXG4gICdHQicsXHJcbiAgJ0dXJyxcclxuICAnSE8nLFxyXG4gICdOJyxcclxuICAnVUMnLFxyXG4gICdWJyxcclxuXTtcclxuZXhwb3J0IGNvbnN0IE1PVkVfQU5OT1RBVElPTl9QUk9QX0xJU1QgPSBbXHJcbiAgJ0JNJyxcclxuICAnRE8nLFxyXG4gICdJVCcsXHJcbiAgLy8gVEUgaXMgc3RhbmRhcmQgaW4gbW92ZSBhbm5vdGF0aW9uIGZvciB0ZXN1amlcclxuICAvLyAnVEUnLFxyXG5dO1xyXG5leHBvcnQgY29uc3QgTUFSS1VQX1BST1BfTElTVCA9IFtcclxuICAnQVInLFxyXG4gICdDUicsXHJcbiAgJ0xCJyxcclxuICAnTE4nLFxyXG4gICdNQScsXHJcbiAgJ1NMJyxcclxuICAnU1EnLFxyXG4gICdUUicsXHJcbl07XHJcblxyXG5leHBvcnQgY29uc3QgUk9PVF9QUk9QX0xJU1QgPSBbJ0FQJywgJ0NBJywgJ0ZGJywgJ0dNJywgJ1NUJywgJ1NaJ107XHJcbmV4cG9ydCBjb25zdCBHQU1FX0lORk9fUFJPUF9MSVNUID0gW1xyXG4gIC8vVEUgTm9uLXN0YW5kYXJkXHJcbiAgJ1RFJyxcclxuICAvL0tPIE5vbi1zdGFuZGFyZFxyXG4gICdLTycsXHJcbiAgJ0FOJyxcclxuICAnQlInLFxyXG4gICdCVCcsXHJcbiAgJ0NQJyxcclxuICAnRFQnLFxyXG4gICdFVicsXHJcbiAgJ0dOJyxcclxuICAnR0MnLFxyXG4gICdPTicsXHJcbiAgJ09UJyxcclxuICAnUEInLFxyXG4gICdQQycsXHJcbiAgJ1BXJyxcclxuICAnUkUnLFxyXG4gICdSTycsXHJcbiAgJ1JVJyxcclxuICAnU08nLFxyXG4gICdUTScsXHJcbiAgJ1VTJyxcclxuICAnV1InLFxyXG4gICdXVCcsXHJcbl07XHJcbmV4cG9ydCBjb25zdCBUSU1JTkdfUFJPUF9MSVNUID0gWydCTCcsICdPQicsICdPVycsICdXTCddO1xyXG5leHBvcnQgY29uc3QgTUlTQ0VMTEFORU9VU19QUk9QX0xJU1QgPSBbJ0ZHJywgJ1BNJywgJ1ZXJ107XHJcblxyXG5leHBvcnQgY29uc3QgQ1VTVE9NX1BST1BfTElTVCA9IFsnUEknLCAnUEFJJywgJ05JRCcsICdQQVQnXTtcclxuXHJcbmV4cG9ydCBjb25zdCBMSVNUX09GX1BPSU5UU19QUk9QID0gWydBQicsICdBRScsICdBVycsICdNQScsICdTTCcsICdTUScsICdUUiddO1xyXG5cclxuY29uc3QgVE9LRU5fUkVHRVggPSBuZXcgUmVnRXhwKC8oW0EtWl0qKVxcWyhbXFxzXFxTXSo/KVxcXS8pO1xyXG4vLyBVcGRhdGVkIHJlZ2V4IHRvIGhhbmRsZSBlc2NhcGVkIGJyYWNrZXRzIHByb3Blcmx5IGZvciBUZXh0IHR5cGUgcHJvcGVydGllc1xyXG4vLyAoPzpbXlxcXVxcXFxdfFxcXFwuKSogbWF0Y2hlcyBhbnkgY2hhciBleGNlcHQgXSBhbmQgXFwsIE9SIGFueSBlc2NhcGVkIGNoYXJcclxuY29uc3QgVE9LRU5fUkVHRVhfV0lUSF9FU0NBUEVTID0gbmV3IFJlZ0V4cCgvKFtBLVpdKilcXFsoKD86W15cXF1cXFxcXXxcXFxcLikqKVxcXS8pO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNnZlByb3BCYXNlIHtcclxuICBwdWJsaWMgdG9rZW46IHN0cmluZztcclxuICBwdWJsaWMgdHlwZTogc3RyaW5nID0gJy0nO1xyXG4gIHByb3RlY3RlZCBfdmFsdWU6IHN0cmluZyA9ICcnO1xyXG4gIHByb3RlY3RlZCBfdmFsdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgc3RyaW5nW10pIHtcclxuICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcclxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nKSB7XHJcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZSBhcyBzdHJpbmc7XHJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgIHRoaXMudmFsdWVzID0gdmFsdWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZShuZXdWYWx1ZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlO1xyXG4gICAgaWYgKExJU1RfT0ZfUE9JTlRTX1BST1AuaW5jbHVkZXModGhpcy50b2tlbikpIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWUuc3BsaXQoJywnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IFtuZXdWYWx1ZV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWVzKCk6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWVzKG5ld1ZhbHVlczogc3RyaW5nW10pIHtcclxuICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlcztcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWVzLmpvaW4oJywnKTtcclxuICB9XHJcblxyXG4gIHRvU3RyaW5nKCkge1xyXG4gICAgcmV0dXJuIGAke3RoaXMudG9rZW59JHt0aGlzLl92YWx1ZXMubWFwKHYgPT4gYFske3Z9XWApLmpvaW4oJycpfWA7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW92ZVByb3AgZXh0ZW5kcyBTZ2ZQcm9wQmFzZSB7XHJcbiAgY29uc3RydWN0b3IodG9rZW46IHN0cmluZywgdmFsdWU6IHN0cmluZykge1xyXG4gICAgc3VwZXIodG9rZW4sIHZhbHVlKTtcclxuICAgIHRoaXMudHlwZSA9ICdtb3ZlJztcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaCgvKFtBLVpdKilcXFsoW1xcc1xcU10qPylcXF0vKTtcclxuICAgIGlmIChtYXRjaCkge1xyXG4gICAgICBjb25zdCB0b2tlbiA9IG1hdGNoWzFdO1xyXG4gICAgICBjb25zdCB2YWwgPSBtYXRjaFsyXTtcclxuICAgICAgcmV0dXJuIG5ldyBNb3ZlUHJvcCh0b2tlbiwgdmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTW92ZVByb3AoJycsICcnKTtcclxuICB9XHJcblxyXG4gIC8vIER1cGxpY2F0ZWQgY29kZTogaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzhcclxuICBnZXQgdmFsdWUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZShuZXdWYWx1ZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlO1xyXG4gICAgaWYgKExJU1RfT0ZfUE9JTlRTX1BST1AuaW5jbHVkZXModGhpcy50b2tlbikpIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWUuc3BsaXQoJywnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IFtuZXdWYWx1ZV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWVzKCk6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWVzKG5ld1ZhbHVlczogc3RyaW5nW10pIHtcclxuICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlcztcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWVzLmpvaW4oJywnKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTZXR1cFByb3AgZXh0ZW5kcyBTZ2ZQcm9wQmFzZSB7XHJcbiAgY29uc3RydWN0b3IodG9rZW46IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IHN0cmluZ1tdKSB7XHJcbiAgICBzdXBlcih0b2tlbiwgdmFsdWUpO1xyXG4gICAgdGhpcy50eXBlID0gJ3NldHVwJztcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCB0b2tlbk1hdGNoID0gc3RyLm1hdGNoKFRPS0VOX1JFR0VYKTtcclxuICAgIGNvbnN0IHZhbE1hdGNoZXMgPSBzdHIubWF0Y2hBbGwoL1xcWyhbXFxzXFxTXSo/KVxcXS9nKTtcclxuXHJcbiAgICBsZXQgdG9rZW4gPSAnJztcclxuICAgIGNvbnN0IHZhbHMgPSBbLi4udmFsTWF0Y2hlc10ubWFwKG0gPT4gbVsxXSk7XHJcbiAgICBpZiAodG9rZW5NYXRjaCkgdG9rZW4gPSB0b2tlbk1hdGNoWzFdO1xyXG4gICAgcmV0dXJuIG5ldyBTZXR1cFByb3AodG9rZW4sIHZhbHMpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHVwbGljYXRlZCBjb2RlOiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzOFxyXG4gIGdldCB2YWx1ZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlKG5ld1ZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWU7XHJcbiAgICBpZiAoTElTVF9PRl9QT0lOVFNfUFJPUC5pbmNsdWRlcyh0aGlzLnRva2VuKSkge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZS5zcGxpdCgnLCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gW25ld1ZhbHVlXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldCB2YWx1ZXMoKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlcztcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZXMobmV3VmFsdWVzOiBzdHJpbmdbXSkge1xyXG4gICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWVzO1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZXMuam9pbignLCcpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE5vZGVBbm5vdGF0aW9uUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHtcclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICBzdXBlcih0b2tlbiwgdmFsdWUpO1xyXG4gICAgdGhpcy50eXBlID0gJ25vZGUtYW5ub3RhdGlvbic7XHJcbiAgfVxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChUT0tFTl9SRUdFWF9XSVRIX0VTQ0FQRVMpO1xyXG4gICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IHRva2VuID0gbWF0Y2hbMV07XHJcbiAgICAgIGNvbnN0IHZhbCA9IG1hdGNoWzJdO1xyXG4gICAgICByZXR1cm4gbmV3IE5vZGVBbm5vdGF0aW9uUHJvcCh0b2tlbiwgdmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTm9kZUFubm90YXRpb25Qcm9wKCcnLCAnJyk7XHJcbiAgfVxyXG5cclxuICAvLyBEdXBsaWNhdGVkIGNvZGU6IGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzM4XHJcbiAgZ2V0IHZhbHVlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWUobmV3VmFsdWU6IHN0cmluZykge1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZTtcclxuICAgIGlmIChMSVNUX09GX1BPSU5UU19QUk9QLmluY2x1ZGVzKHRoaXMudG9rZW4pKSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlLnNwbGl0KCcsJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBbbmV3VmFsdWVdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IHZhbHVlcygpOiBzdHJpbmdbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlcyhuZXdWYWx1ZXM6IHN0cmluZ1tdKSB7XHJcbiAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZXM7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlcy5qb2luKCcsJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFc2NhcGVzIHVuZXNjYXBlZCByaWdodCBicmFja2V0cyBpbiBTR0YgcHJvcGVydHkgdmFsdWVzXHJcbiAgICogT25seSBlc2NhcGVzIGJyYWNrZXRzIHRoYXQgYXJlIG5vdCBhbHJlYWR5IGVzY2FwZWRcclxuICAgKi9cclxuICBwcml2YXRlIGVzY2FwZVZhbHVlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgLy8gUmVwbGFjZSBdIHdpdGggXFxdIG9ubHkgaWYgaXQncyBub3QgYWxyZWFkeSBlc2NhcGVkXHJcbiAgICAvLyBUaGlzIHJlZ2V4IGxvb2tzIGZvciBdIHRoYXQgaXMgTk9UIHByZWNlZGVkIGJ5IFxcXHJcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvKD88IVxcXFwpXFxdL2csICdcXFxcXScpO1xyXG4gIH1cclxuXHJcbiAgdG9TdHJpbmcoKSB7XHJcbiAgICByZXR1cm4gYCR7dGhpcy50b2tlbn0ke3RoaXMuX3ZhbHVlc1xyXG4gICAgICAubWFwKHYgPT4gYFske3RoaXMuZXNjYXBlVmFsdWUodil9XWApXHJcbiAgICAgIC5qb2luKCcnKX1gO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vdmVBbm5vdGF0aW9uUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHtcclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICBzdXBlcih0b2tlbiwgdmFsdWUpO1xyXG4gICAgdGhpcy50eXBlID0gJ21vdmUtYW5ub3RhdGlvbic7XHJcbiAgfVxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChUT0tFTl9SRUdFWF9XSVRIX0VTQ0FQRVMpO1xyXG4gICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IHRva2VuID0gbWF0Y2hbMV07XHJcbiAgICAgIGNvbnN0IHZhbCA9IG1hdGNoWzJdO1xyXG4gICAgICByZXR1cm4gbmV3IE1vdmVBbm5vdGF0aW9uUHJvcCh0b2tlbiwgdmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTW92ZUFubm90YXRpb25Qcm9wKCcnLCAnJyk7XHJcbiAgfVxyXG5cclxuICAvLyBEdXBsaWNhdGVkIGNvZGU6IGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzM4XHJcbiAgZ2V0IHZhbHVlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWUobmV3VmFsdWU6IHN0cmluZykge1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZTtcclxuICAgIGlmIChMSVNUX09GX1BPSU5UU19QUk9QLmluY2x1ZGVzKHRoaXMudG9rZW4pKSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlLnNwbGl0KCcsJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBbbmV3VmFsdWVdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IHZhbHVlcygpOiBzdHJpbmdbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlcyhuZXdWYWx1ZXM6IHN0cmluZ1tdKSB7XHJcbiAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZXM7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlcy5qb2luKCcsJyk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQW5ub3RhdGlvblByb3AgZXh0ZW5kcyBTZ2ZQcm9wQmFzZSB7fVxyXG5leHBvcnQgY2xhc3MgTWFya3VwUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHtcclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgc3RyaW5nW10pIHtcclxuICAgIHN1cGVyKHRva2VuLCB2YWx1ZSk7XHJcbiAgICB0aGlzLnR5cGUgPSAnbWFya3VwJztcclxuICB9XHJcbiAgc3RhdGljIGZyb20oc3RyOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHRva2VuTWF0Y2ggPSBzdHIubWF0Y2goVE9LRU5fUkVHRVgpO1xyXG4gICAgY29uc3QgdmFsTWF0Y2hlcyA9IHN0ci5tYXRjaEFsbCgvXFxbKFtcXHNcXFNdKj8pXFxdL2cpO1xyXG5cclxuICAgIGxldCB0b2tlbiA9ICcnO1xyXG4gICAgY29uc3QgdmFscyA9IFsuLi52YWxNYXRjaGVzXS5tYXAobSA9PiBtWzFdKTtcclxuICAgIGlmICh0b2tlbk1hdGNoKSB0b2tlbiA9IHRva2VuTWF0Y2hbMV07XHJcbiAgICByZXR1cm4gbmV3IE1hcmt1cFByb3AodG9rZW4sIHZhbHMpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHVwbGljYXRlZCBjb2RlOiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzOFxyXG4gIGdldCB2YWx1ZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlKG5ld1ZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWU7XHJcbiAgICBpZiAoTElTVF9PRl9QT0lOVFNfUFJPUC5pbmNsdWRlcyh0aGlzLnRva2VuKSkge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZS5zcGxpdCgnLCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gW25ld1ZhbHVlXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldCB2YWx1ZXMoKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlcztcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZXMobmV3VmFsdWVzOiBzdHJpbmdbXSkge1xyXG4gICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWVzO1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZXMuam9pbignLCcpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJvb3RQcm9wIGV4dGVuZHMgU2dmUHJvcEJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKHRva2VuOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHRva2VuLCB2YWx1ZSk7XHJcbiAgICB0aGlzLnR5cGUgPSAncm9vdCc7XHJcbiAgfVxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChUT0tFTl9SRUdFWF9XSVRIX0VTQ0FQRVMpO1xyXG4gICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IHRva2VuID0gbWF0Y2hbMV07XHJcbiAgICAgIGNvbnN0IHZhbCA9IG1hdGNoWzJdO1xyXG4gICAgICByZXR1cm4gbmV3IFJvb3RQcm9wKHRva2VuLCB2YWwpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBSb290UHJvcCgnJywgJycpO1xyXG4gIH1cclxuXHJcbiAgLy8gRHVwbGljYXRlZCBjb2RlOiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzOFxyXG4gIGdldCB2YWx1ZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlKG5ld1ZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWU7XHJcbiAgICBpZiAoTElTVF9PRl9QT0lOVFNfUFJPUC5pbmNsdWRlcyh0aGlzLnRva2VuKSkge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZS5zcGxpdCgnLCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gW25ld1ZhbHVlXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldCB2YWx1ZXMoKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlcztcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZXMobmV3VmFsdWVzOiBzdHJpbmdbXSkge1xyXG4gICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWVzO1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZXMuam9pbignLCcpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWVJbmZvUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHtcclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICBzdXBlcih0b2tlbiwgdmFsdWUpO1xyXG4gICAgdGhpcy50eXBlID0gJ2dhbWUtaW5mbyc7XHJcbiAgfVxyXG4gIHN0YXRpYyBmcm9tKHN0cjogc3RyaW5nKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChUT0tFTl9SRUdFWF9XSVRIX0VTQ0FQRVMpO1xyXG4gICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IHRva2VuID0gbWF0Y2hbMV07XHJcbiAgICAgIGNvbnN0IHZhbCA9IG1hdGNoWzJdO1xyXG4gICAgICByZXR1cm4gbmV3IEdhbWVJbmZvUHJvcCh0b2tlbiwgdmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgR2FtZUluZm9Qcm9wKCcnLCAnJyk7XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZShuZXdWYWx1ZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlO1xyXG4gICAgaWYgKExJU1RfT0ZfUE9JTlRTX1BST1AuaW5jbHVkZXModGhpcy50b2tlbikpIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWUuc3BsaXQoJywnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IFtuZXdWYWx1ZV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWVzKCk6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWVzKG5ld1ZhbHVlczogc3RyaW5nW10pIHtcclxuICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlcztcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWVzLmpvaW4oJywnKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDdXN0b21Qcm9wIGV4dGVuZHMgU2dmUHJvcEJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKHRva2VuOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHRva2VuLCB2YWx1ZSk7XHJcbiAgICB0aGlzLnR5cGUgPSAnY3VzdG9tJztcclxuICB9XHJcbiAgc3RhdGljIGZyb20oc3RyOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFRPS0VOX1JFR0VYX1dJVEhfRVNDQVBFUyk7XHJcbiAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgY29uc3QgdG9rZW4gPSBtYXRjaFsxXTtcclxuICAgICAgY29uc3QgdmFsID0gbWF0Y2hbMl07XHJcbiAgICAgIHJldHVybiBuZXcgQ3VzdG9tUHJvcCh0b2tlbiwgdmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgQ3VzdG9tUHJvcCgnJywgJycpO1xyXG4gIH1cclxuXHJcbiAgZ2V0IHZhbHVlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWUobmV3VmFsdWU6IHN0cmluZykge1xyXG4gICAgdGhpcy5fdmFsdWUgPSBuZXdWYWx1ZTtcclxuICAgIGlmIChMSVNUX09GX1BPSU5UU19QUk9QLmluY2x1ZGVzKHRoaXMudG9rZW4pKSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlLnNwbGl0KCcsJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl92YWx1ZXMgPSBbbmV3VmFsdWVdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IHZhbHVlcygpOiBzdHJpbmdbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xyXG4gIH1cclxuXHJcbiAgc2V0IHZhbHVlcyhuZXdWYWx1ZXM6IHN0cmluZ1tdKSB7XHJcbiAgICB0aGlzLl92YWx1ZXMgPSBuZXdWYWx1ZXM7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlcy5qb2luKCcsJyk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGltaW5nUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHtcclxuICBjb25zdHJ1Y3Rvcih0b2tlbjogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICBzdXBlcih0b2tlbiwgdmFsdWUpO1xyXG4gICAgdGhpcy50eXBlID0gJ1RpbWluZyc7XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxuICB9XHJcblxyXG4gIHNldCB2YWx1ZShuZXdWYWx1ZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlO1xyXG4gICAgaWYgKExJU1RfT0ZfUE9JTlRTX1BST1AuaW5jbHVkZXModGhpcy50b2tlbikpIHtcclxuICAgICAgdGhpcy5fdmFsdWVzID0gbmV3VmFsdWUuc3BsaXQoJywnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IFtuZXdWYWx1ZV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdmFsdWVzKCk6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XHJcbiAgfVxyXG5cclxuICBzZXQgdmFsdWVzKG5ld1ZhbHVlczogc3RyaW5nW10pIHtcclxuICAgIHRoaXMuX3ZhbHVlcyA9IG5ld1ZhbHVlcztcclxuICAgIHRoaXMuX3ZhbHVlID0gbmV3VmFsdWVzLmpvaW4oJywnKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNaXNjZWxsYW5lb3VzUHJvcCBleHRlbmRzIFNnZlByb3BCYXNlIHt9XHJcbiIsImltcG9ydCB7Y2xvbmVEZWVwfSBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQge1NHRl9MRVRURVJTfSBmcm9tICcuL2NvbnN0JztcclxuXHJcbi8vIFRPRE86IER1cGxpY2F0ZSB3aXRoIGhlbHBlcnMudHMgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jeVxyXG5leHBvcnQgY29uc3Qgc2dmVG9Qb3MgPSAoc3RyOiBzdHJpbmcpID0+IHtcclxuICBjb25zdCBraSA9IHN0clswXSA9PT0gJ0InID8gMSA6IC0xO1xyXG4gIGNvbnN0IHRlbXBTdHIgPSAvXFxbKC4qKVxcXS8uZXhlYyhzdHIpO1xyXG4gIGlmICh0ZW1wU3RyKSB7XHJcbiAgICBjb25zdCBwb3MgPSB0ZW1wU3RyWzFdO1xyXG4gICAgY29uc3QgeCA9IFNHRl9MRVRURVJTLmluZGV4T2YocG9zWzBdKTtcclxuICAgIGNvbnN0IHkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKHBvc1sxXSk7XHJcbiAgICByZXR1cm4ge3gsIHksIGtpfTtcclxuICB9XHJcbiAgcmV0dXJuIHt4OiAtMSwgeTogLTEsIGtpOiAwfTtcclxufTtcclxuXHJcbmxldCBsaWJlcnRpZXMgPSAwO1xyXG5sZXQgcmVjdXJzaW9uUGF0aDogc3RyaW5nW10gPSBbXTtcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBzaXplIG9mIGEgbWF0cml4LlxyXG4gKiBAcGFyYW0gbWF0IFRoZSBtYXRyaXggdG8gY2FsY3VsYXRlIHRoZSBzaXplIG9mLlxyXG4gKiBAcmV0dXJucyBBbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1iZXIgb2Ygcm93cyBhbmQgY29sdW1ucyBpbiB0aGUgbWF0cml4LlxyXG4gKi9cclxuY29uc3QgY2FsY1NpemUgPSAobWF0OiBudW1iZXJbXVtdKSA9PiB7XHJcbiAgY29uc3Qgcm93c1NpemUgPSBtYXQubGVuZ3RoO1xyXG4gIGNvbnN0IGNvbHVtbnNTaXplID0gbWF0Lmxlbmd0aCA+IDAgPyBtYXRbMF0ubGVuZ3RoIDogMDtcclxuICByZXR1cm4gW3Jvd3NTaXplLCBjb2x1bW5zU2l6ZV07XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgbGliZXJ0eSBvZiBhIHN0b25lIG9uIHRoZSBib2FyZC5cclxuICogQHBhcmFtIG1hdCAtIFRoZSBib2FyZCBtYXRyaXguXHJcbiAqIEBwYXJhbSB4IC0gVGhlIHgtY29vcmRpbmF0ZSBvZiB0aGUgc3RvbmUuXHJcbiAqIEBwYXJhbSB5IC0gVGhlIHktY29vcmRpbmF0ZSBvZiB0aGUgc3RvbmUuXHJcbiAqIEBwYXJhbSBraSAtIFRoZSB2YWx1ZSBvZiB0aGUgc3RvbmUuXHJcbiAqL1xyXG5jb25zdCBjYWxjTGliZXJ0eUNvcmUgPSAobWF0OiBudW1iZXJbXVtdLCB4OiBudW1iZXIsIHk6IG51bWJlciwga2k6IG51bWJlcikgPT4ge1xyXG4gIGNvbnN0IHNpemUgPSBjYWxjU2l6ZShtYXQpO1xyXG4gIGlmICh4ID49IDAgJiYgeCA8IHNpemVbMV0gJiYgeSA+PSAwICYmIHkgPCBzaXplWzBdKSB7XHJcbiAgICBpZiAobWF0W3hdW3ldID09PSBraSAmJiAhcmVjdXJzaW9uUGF0aC5pbmNsdWRlcyhgJHt4fSwke3l9YCkpIHtcclxuICAgICAgcmVjdXJzaW9uUGF0aC5wdXNoKGAke3h9LCR7eX1gKTtcclxuICAgICAgY2FsY0xpYmVydHlDb3JlKG1hdCwgeCAtIDEsIHksIGtpKTtcclxuICAgICAgY2FsY0xpYmVydHlDb3JlKG1hdCwgeCArIDEsIHksIGtpKTtcclxuICAgICAgY2FsY0xpYmVydHlDb3JlKG1hdCwgeCwgeSAtIDEsIGtpKTtcclxuICAgICAgY2FsY0xpYmVydHlDb3JlKG1hdCwgeCwgeSArIDEsIGtpKTtcclxuICAgIH0gZWxzZSBpZiAobWF0W3hdW3ldID09PSAwKSB7XHJcbiAgICAgIGxpYmVydGllcyArPSAxO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbmNvbnN0IGNhbGNMaWJlcnR5ID0gKG1hdDogbnVtYmVyW11bXSwgeDogbnVtYmVyLCB5OiBudW1iZXIsIGtpOiBudW1iZXIpID0+IHtcclxuICBjb25zdCBzaXplID0gY2FsY1NpemUobWF0KTtcclxuICBsaWJlcnRpZXMgPSAwO1xyXG4gIHJlY3Vyc2lvblBhdGggPSBbXTtcclxuXHJcbiAgaWYgKHggPCAwIHx8IHkgPCAwIHx8IHggPiBzaXplWzFdIC0gMSB8fCB5ID4gc2l6ZVswXSAtIDEpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGxpYmVydHk6IDQsXHJcbiAgICAgIHJlY3Vyc2lvblBhdGg6IFtdLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmIChtYXRbeF1beV0gPT09IDApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGxpYmVydHk6IDQsXHJcbiAgICAgIHJlY3Vyc2lvblBhdGg6IFtdLFxyXG4gICAgfTtcclxuICB9XHJcbiAgY2FsY0xpYmVydHlDb3JlKG1hdCwgeCwgeSwga2kpO1xyXG4gIHJldHVybiB7XHJcbiAgICBsaWJlcnR5OiBsaWJlcnRpZXMsXHJcbiAgICByZWN1cnNpb25QYXRoLFxyXG4gIH07XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZXhlY0NhcHR1cmUgPSAoXHJcbiAgbWF0OiBudW1iZXJbXVtdLFxyXG4gIGk6IG51bWJlcixcclxuICBqOiBudW1iZXIsXHJcbiAga2k6IG51bWJlclxyXG4pID0+IHtcclxuICBjb25zdCBuZXdBcnJheSA9IG1hdDtcclxuICBjb25zdCB7bGliZXJ0eTogbGliZXJ0eVVwLCByZWN1cnNpb25QYXRoOiByZWN1cnNpb25QYXRoVXB9ID0gY2FsY0xpYmVydHkoXHJcbiAgICBtYXQsXHJcbiAgICBpLFxyXG4gICAgaiAtIDEsXHJcbiAgICBraVxyXG4gICk7XHJcbiAgY29uc3Qge2xpYmVydHk6IGxpYmVydHlEb3duLCByZWN1cnNpb25QYXRoOiByZWN1cnNpb25QYXRoRG93bn0gPSBjYWxjTGliZXJ0eShcclxuICAgIG1hdCxcclxuICAgIGksXHJcbiAgICBqICsgMSxcclxuICAgIGtpXHJcbiAgKTtcclxuICBjb25zdCB7bGliZXJ0eTogbGliZXJ0eUxlZnQsIHJlY3Vyc2lvblBhdGg6IHJlY3Vyc2lvblBhdGhMZWZ0fSA9IGNhbGNMaWJlcnR5KFxyXG4gICAgbWF0LFxyXG4gICAgaSAtIDEsXHJcbiAgICBqLFxyXG4gICAga2lcclxuICApO1xyXG4gIGNvbnN0IHtsaWJlcnR5OiBsaWJlcnR5UmlnaHQsIHJlY3Vyc2lvblBhdGg6IHJlY3Vyc2lvblBhdGhSaWdodH0gPVxyXG4gICAgY2FsY0xpYmVydHkobWF0LCBpICsgMSwgaiwga2kpO1xyXG4gIGlmIChsaWJlcnR5VXAgPT09IDApIHtcclxuICAgIHJlY3Vyc2lvblBhdGhVcC5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICBjb25zdCBjb29yZCA9IGl0ZW0uc3BsaXQoJywnKTtcclxuICAgICAgbmV3QXJyYXlbcGFyc2VJbnQoY29vcmRbMF0pXVtwYXJzZUludChjb29yZFsxXSldID0gMDtcclxuICAgIH0pO1xyXG4gIH1cclxuICBpZiAobGliZXJ0eURvd24gPT09IDApIHtcclxuICAgIHJlY3Vyc2lvblBhdGhEb3duLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvb3JkID0gaXRlbS5zcGxpdCgnLCcpO1xyXG4gICAgICBuZXdBcnJheVtwYXJzZUludChjb29yZFswXSldW3BhcnNlSW50KGNvb3JkWzFdKV0gPSAwO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIGlmIChsaWJlcnR5TGVmdCA9PT0gMCkge1xyXG4gICAgcmVjdXJzaW9uUGF0aExlZnQuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgY29uc3QgY29vcmQgPSBpdGVtLnNwbGl0KCcsJyk7XHJcbiAgICAgIG5ld0FycmF5W3BhcnNlSW50KGNvb3JkWzBdKV1bcGFyc2VJbnQoY29vcmRbMV0pXSA9IDA7XHJcbiAgICB9KTtcclxuICB9XHJcbiAgaWYgKGxpYmVydHlSaWdodCA9PT0gMCkge1xyXG4gICAgcmVjdXJzaW9uUGF0aFJpZ2h0LmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvb3JkID0gaXRlbS5zcGxpdCgnLCcpO1xyXG4gICAgICBuZXdBcnJheVtwYXJzZUludChjb29yZFswXSldW3BhcnNlSW50KGNvb3JkWzFdKV0gPSAwO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHJldHVybiBuZXdBcnJheTtcclxufTtcclxuXHJcbmNvbnN0IGNhbkNhcHR1cmUgPSAobWF0OiBudW1iZXJbXVtdLCBpOiBudW1iZXIsIGo6IG51bWJlciwga2k6IG51bWJlcikgPT4ge1xyXG4gIGNvbnN0IHtsaWJlcnR5OiBsaWJlcnR5VXAsIHJlY3Vyc2lvblBhdGg6IHJlY3Vyc2lvblBhdGhVcH0gPSBjYWxjTGliZXJ0eShcclxuICAgIG1hdCxcclxuICAgIGksXHJcbiAgICBqIC0gMSxcclxuICAgIGtpXHJcbiAgKTtcclxuICBjb25zdCB7bGliZXJ0eTogbGliZXJ0eURvd24sIHJlY3Vyc2lvblBhdGg6IHJlY3Vyc2lvblBhdGhEb3dufSA9IGNhbGNMaWJlcnR5KFxyXG4gICAgbWF0LFxyXG4gICAgaSxcclxuICAgIGogKyAxLFxyXG4gICAga2lcclxuICApO1xyXG4gIGNvbnN0IHtsaWJlcnR5OiBsaWJlcnR5TGVmdCwgcmVjdXJzaW9uUGF0aDogcmVjdXJzaW9uUGF0aExlZnR9ID0gY2FsY0xpYmVydHkoXHJcbiAgICBtYXQsXHJcbiAgICBpIC0gMSxcclxuICAgIGosXHJcbiAgICBraVxyXG4gICk7XHJcbiAgY29uc3Qge2xpYmVydHk6IGxpYmVydHlSaWdodCwgcmVjdXJzaW9uUGF0aDogcmVjdXJzaW9uUGF0aFJpZ2h0fSA9XHJcbiAgICBjYWxjTGliZXJ0eShtYXQsIGkgKyAxLCBqLCBraSk7XHJcbiAgaWYgKGxpYmVydHlVcCA9PT0gMCAmJiByZWN1cnNpb25QYXRoVXAubGVuZ3RoID4gMCkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIGlmIChsaWJlcnR5RG93biA9PT0gMCAmJiByZWN1cnNpb25QYXRoRG93bi5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgaWYgKGxpYmVydHlMZWZ0ID09PSAwICYmIHJlY3Vyc2lvblBhdGhMZWZ0Lmxlbmd0aCA+IDApIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICBpZiAobGliZXJ0eVJpZ2h0ID09PSAwICYmIHJlY3Vyc2lvblBhdGhSaWdodC5sZW5ndGggPiAwKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbXBhcmUgaWYgdHdvIGJvYXJkIHN0YXRlcyBhcmUgY29tcGxldGVseSBpZGVudGljYWxcclxuICovXHJcbmV4cG9ydCBjb25zdCBib2FyZFN0YXRlc0VxdWFsID0gKFxyXG4gIGJvYXJkMTogbnVtYmVyW11bXSxcclxuICBib2FyZDI6IG51bWJlcltdW11cclxuKTogYm9vbGVhbiA9PiB7XHJcbiAgaWYgKGJvYXJkMS5sZW5ndGggIT09IGJvYXJkMi5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBib2FyZDEubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChib2FyZDFbaV0ubGVuZ3RoICE9PSBib2FyZDJbaV0ubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvYXJkMVtpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICBpZiAoYm9hcmQxW2ldW2pdICE9PSBib2FyZDJbaV1bal0pIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNpbXVsYXRlIHRoZSBib2FyZCBzdGF0ZSBhZnRlciBtYWtpbmcgYSBtb3ZlIGF0IHNwZWNpZmllZCBwb3NpdGlvbiAoaW5jbHVkaW5nIGNhcHR1cmVzKVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHNpbXVsYXRlTW92ZVdpdGhDYXB0dXJlID0gKFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICBpOiBudW1iZXIsXHJcbiAgajogbnVtYmVyLFxyXG4gIGtpOiBudW1iZXJcclxuKTogbnVtYmVyW11bXSA9PiB7XHJcbiAgY29uc3QgbmV3TWF0ID0gY2xvbmVEZWVwKG1hdCk7XHJcbiAgbmV3TWF0W2ldW2pdID0ga2k7XHJcblxyXG4gIC8vIEV4ZWN1dGUgY2FwdHVyZXNcclxuICByZXR1cm4gZXhlY0NhcHR1cmUobmV3TWF0LCBpLCBqLCAta2kpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbk1vdmUgPSAoXHJcbiAgbWF0OiBudW1iZXJbXVtdLFxyXG4gIGk6IG51bWJlcixcclxuICBqOiBudW1iZXIsXHJcbiAga2k6IG51bWJlcixcclxuICBwcmV2aW91c0JvYXJkU3RhdGU/OiBudW1iZXJbXVtdIHwgbnVsbFxyXG4pID0+IHtcclxuICBpZiAoaSA8IDAgfHwgaiA8IDAgfHwgaSA+PSBtYXQubGVuZ3RoIHx8IGogPj0gKG1hdFswXT8ubGVuZ3RoID8/IDApKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAobWF0W2ldW2pdICE9PSAwKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBTaW11bGF0ZSB0aGUgYm9hcmQgc3RhdGUgYWZ0ZXIgdGhlIG1vdmUgKGluY2x1ZGluZyBjYXB0dXJlcylcclxuICBjb25zdCBib2FyZFN0YXRlQWZ0ZXJNb3ZlID0gc2ltdWxhdGVNb3ZlV2l0aENhcHR1cmUobWF0LCBpLCBqLCBraSk7XHJcblxyXG4gIC8vIEtvIHJ1bGUgY2hlY2s6IGlmIHRoZSBib2FyZCBzdGF0ZSBhZnRlciBtb3ZlIGlzIGlkZW50aWNhbCB0byBwcmV2aW91cyBzdGF0ZSwgaXQgdmlvbGF0ZXMga28gcnVsZVxyXG4gIGlmIChcclxuICAgIHByZXZpb3VzQm9hcmRTdGF0ZSAmJlxyXG4gICAgYm9hcmRTdGF0ZXNFcXVhbChib2FyZFN0YXRlQWZ0ZXJNb3ZlLCBwcmV2aW91c0JvYXJkU3RhdGUpXHJcbiAgKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBzdWljaWRlIHJ1bGU6IGlmIGFmdGVyIHBsYWNpbmcgdGhlIHN0b25lIGl0IGhhcyBubyBsaWJlcnRpZXMgYW5kIGNhbm5vdCBjYXB0dXJlIG9wcG9uZW50IHN0b25lcywgaXQncyBpbGxlZ2FsXHJcbiAgY29uc3QgbmV3QXJyYXkgPSBjbG9uZURlZXAobWF0KTtcclxuICBuZXdBcnJheVtpXVtqXSA9IGtpO1xyXG4gIGNvbnN0IHtsaWJlcnR5fSA9IGNhbGNMaWJlcnR5KG5ld0FycmF5LCBpLCBqLCBraSk7XHJcblxyXG4gIGlmIChjYW5DYXB0dXJlKG5ld0FycmF5LCBpLCBqLCAta2kpKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTsgLy8gQ2FuIGNhcHR1cmUgb3Bwb25lbnQgc3RvbmVzLCBsZWdhbCBtb3ZlXHJcbiAgfVxyXG4gIGlmIChjYW5DYXB0dXJlKG5ld0FycmF5LCBpLCBqLCBraSkpIHtcclxuICAgIHJldHVybiBmYWxzZTsgLy8gT3duIHN0b25lcyB3b3VsZCBiZSBjYXB0dXJlZCwgaWxsZWdhbCBtb3ZlXHJcbiAgfVxyXG4gIGlmIChsaWJlcnR5ID09PSAwKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7IC8vIE5vIGxpYmVydGllcyBhbmQgY2Fubm90IGNhcHR1cmUsIGlsbGVnYWwgbW92ZVxyXG4gIH1cclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzaG93S2kgPSAoXHJcbiAgYXJyYXk6IG51bWJlcltdW10sXHJcbiAgc3RlcHM6IHN0cmluZ1tdLFxyXG4gIGlzQ2FwdHVyZWQgPSB0cnVlXHJcbikgPT4ge1xyXG4gIGxldCBuZXdNYXQgPSBjbG9uZURlZXAoYXJyYXkpO1xyXG4gIGxldCBoYXNNb3ZlZCA9IGZhbHNlO1xyXG4gIHN0ZXBzLmZvckVhY2goc3RyID0+IHtcclxuICAgIGNvbnN0IHtcclxuICAgICAgeCxcclxuICAgICAgeSxcclxuICAgICAga2ksXHJcbiAgICB9OiB7XHJcbiAgICAgIHg6IG51bWJlcjtcclxuICAgICAgeTogbnVtYmVyO1xyXG4gICAgICBraTogbnVtYmVyO1xyXG4gICAgfSA9IHNnZlRvUG9zKHN0cik7XHJcbiAgICBpZiAoaXNDYXB0dXJlZCkge1xyXG4gICAgICBpZiAoY2FuTW92ZShuZXdNYXQsIHgsIHksIGtpKSkge1xyXG4gICAgICAgIG5ld01hdFt4XVt5XSA9IGtpO1xyXG4gICAgICAgIG5ld01hdCA9IGV4ZWNDYXB0dXJlKG5ld01hdCwgeCwgeSwgLWtpKTtcclxuICAgICAgICBoYXNNb3ZlZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5ld01hdFt4XVt5XSA9IGtpO1xyXG4gICAgICBoYXNNb3ZlZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBhcnJhbmdlbWVudDogbmV3TWF0LFxyXG4gICAgaGFzTW92ZWQsXHJcbiAgfTtcclxufTtcclxuIiwiaW1wb3J0IHtjb21wYWN0LCByZXBsYWNlfSBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQge1xyXG4gIGJ1aWxkUHJvcGVydHlWYWx1ZVJhbmdlcyxcclxuICBpc0luQW55UmFuZ2UsXHJcbiAgY2FsY0hhc2gsXHJcbiAgZ2V0RGVkdXBsaWNhdGVkUHJvcHMsXHJcbiAgZ2V0Tm9kZU51bWJlcixcclxufSBmcm9tICcuL2hlbHBlcnMnO1xyXG5cclxuaW1wb3J0IHtUcmVlTW9kZWwsIFROb2RlfSBmcm9tICcuL3RyZWUnO1xyXG5pbXBvcnQge1xyXG4gIE1vdmVQcm9wLFxyXG4gIFNldHVwUHJvcCxcclxuICBSb290UHJvcCxcclxuICBHYW1lSW5mb1Byb3AsXHJcbiAgU2dmUHJvcEJhc2UsXHJcbiAgTm9kZUFubm90YXRpb25Qcm9wLFxyXG4gIE1vdmVBbm5vdGF0aW9uUHJvcCxcclxuICBNYXJrdXBQcm9wLFxyXG4gIEN1c3RvbVByb3AsXHJcbiAgUk9PVF9QUk9QX0xJU1QsXHJcbiAgTU9WRV9QUk9QX0xJU1QsXHJcbiAgU0VUVVBfUFJPUF9MSVNULFxyXG4gIE1BUktVUF9QUk9QX0xJU1QsXHJcbiAgTk9ERV9BTk5PVEFUSU9OX1BST1BfTElTVCxcclxuICBNT1ZFX0FOTk9UQVRJT05fUFJPUF9MSVNULFxyXG4gIEdBTUVfSU5GT19QUk9QX0xJU1QsXHJcbiAgQ1VTVE9NX1BST1BfTElTVCxcclxufSBmcm9tICcuL3Byb3BzJztcclxuXHJcbi8qKlxyXG4gKiBSZXByZXNlbnRzIGFuIFNHRiAoU21hcnQgR2FtZSBGb3JtYXQpIGZpbGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgU2dmIHtcclxuICBORVdfTk9ERSA9ICc7JztcclxuICBCUkFOQ0hJTkcgPSBbJygnLCAnKSddO1xyXG4gIFBST1BFUlRZID0gWydbJywgJ10nXTtcclxuICBMSVNUX0lERU5USVRJRVMgPSBbXHJcbiAgICAnQVcnLFxyXG4gICAgJ0FCJyxcclxuICAgICdBRScsXHJcbiAgICAnQVInLFxyXG4gICAgJ0NSJyxcclxuICAgICdERCcsXHJcbiAgICAnTEInLFxyXG4gICAgJ0xOJyxcclxuICAgICdNQScsXHJcbiAgICAnU0wnLFxyXG4gICAgJ1NRJyxcclxuICAgICdUUicsXHJcbiAgICAnVlcnLFxyXG4gICAgJ1RCJyxcclxuICAgICdUVycsXHJcbiAgXTtcclxuICBOT0RFX0RFTElNSVRFUlMgPSBbdGhpcy5ORVdfTk9ERV0uY29uY2F0KHRoaXMuQlJBTkNISU5HKTtcclxuXHJcbiAgdHJlZTogVHJlZU1vZGVsID0gbmV3IFRyZWVNb2RlbCgpO1xyXG4gIHJvb3Q6IFROb2RlIHwgbnVsbCA9IG51bGw7XHJcbiAgbm9kZTogVE5vZGUgfCBudWxsID0gbnVsbDtcclxuICBjdXJyZW50Tm9kZTogVE5vZGUgfCBudWxsID0gbnVsbDtcclxuICBwYXJlbnROb2RlOiBUTm9kZSB8IG51bGwgPSBudWxsO1xyXG4gIG5vZGVQcm9wczogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgU2dmIGNsYXNzLlxyXG4gICAqIEBwYXJhbSBjb250ZW50IFRoZSBjb250ZW50IG9mIHRoZSBTZ2YsIGVpdGhlciBhcyBhIHN0cmluZyBvciBhcyBhIFROb2RlKFJvb3Qgbm9kZSkuXHJcbiAgICogQHBhcmFtIHBhcnNlT3B0aW9ucyBUaGUgb3B0aW9ucyBmb3IgcGFyc2luZyB0aGUgU2dmIGNvbnRlbnQuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBwcml2YXRlIGNvbnRlbnQ/OiBzdHJpbmcgfCBUTm9kZSxcclxuICAgIHByaXZhdGUgcGFyc2VPcHRpb25zID0ge1xyXG4gICAgICBpZ25vcmVQcm9wTGlzdDogW10sXHJcbiAgICB9XHJcbiAgKSB7XHJcbiAgICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHRoaXMucGFyc2UoY29udGVudCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnb2JqZWN0Jykge1xyXG4gICAgICB0aGlzLnNldFJvb3QoY29udGVudCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXRzIHRoZSByb290IG5vZGUgb2YgdGhlIFNHRiB0cmVlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHJvb3QgVGhlIHJvb3Qgbm9kZSB0byBzZXQuXHJcbiAgICogQHJldHVybnMgVGhlIHVwZGF0ZWQgU0dGIGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIHNldFJvb3Qocm9vdDogVE5vZGUpIHtcclxuICAgIHRoaXMucm9vdCA9IHJvb3Q7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnRzIHRoZSBjdXJyZW50IFNHRiB0cmVlIHRvIGFuIFNHRiBzdHJpbmcgcmVwcmVzZW50YXRpb24uXHJcbiAgICogQHJldHVybnMgVGhlIFNHRiBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRyZWUuXHJcbiAgICovXHJcbiAgdG9TZ2YoKSB7XHJcbiAgICByZXR1cm4gYCgke3RoaXMubm9kZVRvU3RyaW5nKHRoaXMucm9vdCl9KWA7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb252ZXJ0cyB0aGUgZ2FtZSB0cmVlIHRvIFNHRiBmb3JtYXQgd2l0aG91dCBpbmNsdWRpbmcgYW5hbHlzaXMgZGF0YS5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zIFRoZSBTR0YgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdhbWUgdHJlZS5cclxuICAgKi9cclxuICB0b1NnZldpdGhvdXRBbmFseXNpcygpIHtcclxuICAgIGNvbnN0IHNnZiA9IGAoJHt0aGlzLm5vZGVUb1N0cmluZyh0aGlzLnJvb3QpfSlgO1xyXG4gICAgcmV0dXJuIHJlcGxhY2Uoc2dmLCAvXShBXFxbLio/XFxdKS9nLCAnXScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUGFyc2VzIHRoZSBnaXZlbiBTR0YgKFNtYXJ0IEdhbWUgRm9ybWF0KSBzdHJpbmcuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gc2dmIC0gVGhlIFNHRiBzdHJpbmcgdG8gcGFyc2UuXHJcbiAgICovXHJcbiAgcGFyc2Uoc2dmOiBzdHJpbmcpIHtcclxuICAgIGlmICghc2dmKSByZXR1cm47XHJcblxyXG4gICAgLy8gRmlyc3QsIGdldCBhbGwgcHJvcGVydHkgdmFsdWUgcmFuZ2VzIGZyb20gdGhlIG9yaWdpbmFsIHN0cmluZ1xyXG4gICAgLy8gVXNlIGFsbCBrbm93biBTR0YgcHJvcGVydHkga2V5cyBmcm9tIHRoZSBjb25zdGFudHNcclxuICAgIGNvbnN0IGFsbFByb3BlcnR5S2V5cyA9IFtcclxuICAgICAgLi4uUk9PVF9QUk9QX0xJU1QsXHJcbiAgICAgIC4uLk1PVkVfUFJPUF9MSVNULFxyXG4gICAgICAuLi5TRVRVUF9QUk9QX0xJU1QsXHJcbiAgICAgIC4uLk1BUktVUF9QUk9QX0xJU1QsXHJcbiAgICAgIC4uLk5PREVfQU5OT1RBVElPTl9QUk9QX0xJU1QsXHJcbiAgICAgIC4uLk1PVkVfQU5OT1RBVElPTl9QUk9QX0xJU1QsXHJcbiAgICAgIC4uLkdBTUVfSU5GT19QUk9QX0xJU1QsXHJcbiAgICAgIC4uLkNVU1RPTV9QUk9QX0xJU1QsXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IHByb3BlcnR5VmFsdWVSYW5nZXMgPSBidWlsZFByb3BlcnR5VmFsdWVSYW5nZXMoXHJcbiAgICAgIHNnZixcclxuICAgICAgYWxsUHJvcGVydHlLZXlzXHJcbiAgICApLnNvcnQoKGEsIGIpID0+IGFbMF0gLSBiWzBdKTtcclxuXHJcbiAgICAvLyBSZW1vdmUgc3BhY2VzIG9ubHkgb3V0c2lkZSBwcm9wZXJ0eSB2YWx1ZSByYW5nZXNcclxuICAgIGxldCBwcm9jZXNzZWRTZ2YgPSAnJztcclxuICAgIGxldCBsYXN0SW5kZXggPSAwO1xyXG5cclxuICAgIGZvciAoY29uc3QgW3N0YXJ0LCBlbmRdIG9mIHByb3BlcnR5VmFsdWVSYW5nZXMpIHtcclxuICAgICAgLy8gUHJvY2VzcyB0ZXh0IGJlZm9yZSB0aGlzIHByb3BlcnR5IHZhbHVlIChyZW1vdmUgc3BhY2VzKVxyXG4gICAgICBjb25zdCBiZWZvcmVQcm9wID0gc2dmLnNsaWNlKGxhc3RJbmRleCwgc3RhcnQpO1xyXG4gICAgICBwcm9jZXNzZWRTZ2YgKz0gYmVmb3JlUHJvcC5yZXBsYWNlKC9cXHMrL2dtLCAnJyk7XHJcblxyXG4gICAgICAvLyBLZWVwIHByb3BlcnR5IHZhbHVlIGFzLWlzIChwcmVzZXJ2ZSBzcGFjZXMpXHJcbiAgICAgIGNvbnN0IHByb3BWYWx1ZSA9IHNnZi5zbGljZShzdGFydCwgZW5kKTtcclxuICAgICAgcHJvY2Vzc2VkU2dmICs9IHByb3BWYWx1ZTtcclxuXHJcbiAgICAgIGxhc3RJbmRleCA9IGVuZDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm9jZXNzIHJlbWFpbmluZyB0ZXh0IGFmdGVyIGxhc3QgcHJvcGVydHkgdmFsdWUgKHJlbW92ZSBzcGFjZXMpXHJcbiAgICBjb25zdCByZW1haW5pbmcgPSBzZ2Yuc2xpY2UobGFzdEluZGV4KTtcclxuICAgIHByb2Nlc3NlZFNnZiArPSByZW1haW5pbmcucmVwbGFjZSgvXFxzKy9nbSwgJycpO1xyXG5cclxuICAgIC8vIE5vdyB1c2UgdGhlIHByb2Nlc3NlZCBTR0YgZm9yIHBhcnNpbmdcclxuICAgIHNnZiA9IHByb2Nlc3NlZFNnZjtcclxuICAgIGxldCBub2RlU3RhcnQgPSAwO1xyXG4gICAgbGV0IGNvdW50ZXIgPSAwO1xyXG4gICAgY29uc3Qgc3RhY2s6IFROb2RlW10gPSBbXTtcclxuXHJcbiAgICBjb25zdCBpbk5vZGVSYW5nZXMgPSBidWlsZFByb3BlcnR5VmFsdWVSYW5nZXMoc2dmKS5zb3J0KFxyXG4gICAgICAoYSwgYikgPT4gYVswXSAtIGJbMF1cclxuICAgICk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZ2YubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgYyA9IHNnZltpXTtcclxuICAgICAgY29uc3QgaW5zaWRlUHJvcCA9IGlzSW5BbnlSYW5nZShpLCBpbk5vZGVSYW5nZXMpO1xyXG5cclxuICAgICAgaWYgKHRoaXMuTk9ERV9ERUxJTUlURVJTLmluY2x1ZGVzKGMpICYmICFpbnNpZGVQcm9wKSB7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IHNnZi5zbGljZShub2RlU3RhcnQsIGkpO1xyXG4gICAgICAgIGlmIChjb250ZW50ICE9PSAnJykge1xyXG4gICAgICAgICAgY29uc3QgbW92ZVByb3BzOiBNb3ZlUHJvcFtdID0gW107XHJcbiAgICAgICAgICBjb25zdCBzZXR1cFByb3BzOiBTZXR1cFByb3BbXSA9IFtdO1xyXG4gICAgICAgICAgY29uc3Qgcm9vdFByb3BzOiBSb290UHJvcFtdID0gW107XHJcbiAgICAgICAgICBjb25zdCBtYXJrdXBQcm9wczogTWFya3VwUHJvcFtdID0gW107XHJcbiAgICAgICAgICBjb25zdCBnYW1lSW5mb1Byb3BzOiBHYW1lSW5mb1Byb3BbXSA9IFtdO1xyXG4gICAgICAgICAgY29uc3Qgbm9kZUFubm90YXRpb25Qcm9wczogTm9kZUFubm90YXRpb25Qcm9wW10gPSBbXTtcclxuICAgICAgICAgIGNvbnN0IG1vdmVBbm5vdGF0aW9uUHJvcHM6IE1vdmVBbm5vdGF0aW9uUHJvcFtdID0gW107XHJcbiAgICAgICAgICBjb25zdCBjdXN0b21Qcm9wczogQ3VzdG9tUHJvcFtdID0gW107XHJcblxyXG4gICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IFtcclxuICAgICAgICAgICAgLi4uY29udGVudC5tYXRjaEFsbChcclxuICAgICAgICAgICAgICAvLyBSZWdFeHAoLyhbQS1aXStcXFtbYS16XFxbXFxdXSpcXF0rKS8sICdnJylcclxuICAgICAgICAgICAgICAvLyBSZWdFeHAoLyhbQS1aXStcXFsuKj9cXF0rKS8sICdnJylcclxuICAgICAgICAgICAgICAvLyBSZWdFeHAoL1tBLVpdKyhcXFsuKj9cXF0pezEsfS8sICdnJylcclxuICAgICAgICAgICAgICAvLyBSZWdFeHAoL1tBLVpdKyhcXFtbXFxzXFxTXSo/XFxdKXsxLH0vLCAnZycpLFxyXG4gICAgICAgICAgICAgIC8vIFNpbXBsaWZpZWQgcmVnZXggdG8gaGFuZGxlIGVzY2FwZWQgYnJhY2tldHMgcHJvcGVybHlcclxuICAgICAgICAgICAgICAvLyBbXlxcXVxcXFxdfFxcXFwuICBtYXRjaGVzOiBhbnkgY2hhciBleGNlcHQgXSBhbmQgXFwsIE9SIGFueSBlc2NhcGVkIGNoYXIgKFxcLilcclxuICAgICAgICAgICAgICBSZWdFeHAoL1xcdysoPzpcXFsoPzpbXlxcXVxcXFxdfFxcXFwuKSpcXF0pKy9nKVxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICBtYXRjaGVzLmZvckVhY2gobSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRva2VuTWF0Y2ggPSBtWzBdLm1hdGNoKC8oW0EtWl0rKVxcWy8pO1xyXG4gICAgICAgICAgICBpZiAodG9rZW5NYXRjaCkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5NYXRjaFsxXTtcclxuICAgICAgICAgICAgICBpZiAoTU9WRV9QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICAgICAgICAgICAgICBtb3ZlUHJvcHMucHVzaChNb3ZlUHJvcC5mcm9tKG1bMF0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKFNFVFVQX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgIHNldHVwUHJvcHMucHVzaChTZXR1cFByb3AuZnJvbShtWzBdKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChST09UX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgIHJvb3RQcm9wcy5wdXNoKFJvb3RQcm9wLmZyb20obVswXSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoTUFSS1VQX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgIG1hcmt1cFByb3BzLnB1c2goTWFya3VwUHJvcC5mcm9tKG1bMF0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKEdBTUVfSU5GT19QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICAgICAgICAgICAgICBnYW1lSW5mb1Byb3BzLnB1c2goR2FtZUluZm9Qcm9wLmZyb20obVswXSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoTk9ERV9BTk5PVEFUSU9OX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgICAgICAgICAgICAgIG5vZGVBbm5vdGF0aW9uUHJvcHMucHVzaChOb2RlQW5ub3RhdGlvblByb3AuZnJvbShtWzBdKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChNT1ZFX0FOTk9UQVRJT05fUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgICAgICAgICAgICAgbW92ZUFubm90YXRpb25Qcm9wcy5wdXNoKE1vdmVBbm5vdGF0aW9uUHJvcC5mcm9tKG1bMF0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKENVU1RPTV9QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICAgICAgICAgICAgICBjdXN0b21Qcm9wcy5wdXNoKEN1c3RvbVByb3AuZnJvbShtWzBdKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGhhc2ggPSBjYWxjSGFzaCh0aGlzLmN1cnJlbnROb2RlLCBtb3ZlUHJvcHMpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy50cmVlLnBhcnNlKHtcclxuICAgICAgICAgICAgICBpZDogaGFzaCxcclxuICAgICAgICAgICAgICBuYW1lOiBoYXNoLFxyXG4gICAgICAgICAgICAgIGluZGV4OiBjb3VudGVyLFxyXG4gICAgICAgICAgICAgIG51bWJlcjogMCxcclxuICAgICAgICAgICAgICBtb3ZlUHJvcHMsXHJcbiAgICAgICAgICAgICAgc2V0dXBQcm9wcyxcclxuICAgICAgICAgICAgICByb290UHJvcHMsXHJcbiAgICAgICAgICAgICAgbWFya3VwUHJvcHMsXHJcbiAgICAgICAgICAgICAgZ2FtZUluZm9Qcm9wcyxcclxuICAgICAgICAgICAgICBub2RlQW5ub3RhdGlvblByb3BzLFxyXG4gICAgICAgICAgICAgIG1vdmVBbm5vdGF0aW9uUHJvcHMsXHJcbiAgICAgICAgICAgICAgY3VzdG9tUHJvcHMsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5vZGUpIHtcclxuICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgICBub2RlLm1vZGVsLm51bWJlciA9IGdldE5vZGVOdW1iZXIobm9kZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5yb290ID0gbm9kZTtcclxuICAgICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUgPSBub2RlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudE5vZGUgPSBub2RlO1xyXG4gICAgICAgICAgICBjb3VudGVyICs9IDE7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChjID09PSAnKCcgJiYgdGhpcy5jdXJyZW50Tm9kZSAmJiAhaW5zaWRlUHJvcCkge1xyXG4gICAgICAgIHN0YWNrLnB1c2godGhpcy5jdXJyZW50Tm9kZSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGMgPT09ICcpJyAmJiAhaW5zaWRlUHJvcCAmJiBzdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3Qgbm9kZSA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgICB0aGlzLmN1cnJlbnROb2RlID0gbm9kZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGlzLk5PREVfREVMSU1JVEVSUy5pbmNsdWRlcyhjKSAmJiAhaW5zaWRlUHJvcCkge1xyXG4gICAgICAgIG5vZGVTdGFydCA9IGk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnRzIGEgbm9kZSB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBub2RlIC0gVGhlIG5vZGUgdG8gY29udmVydC5cclxuICAgKiBAcmV0dXJucyBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBub2RlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgbm9kZVRvU3RyaW5nKG5vZGU6IGFueSkge1xyXG4gICAgbGV0IGNvbnRlbnQgPSAnJztcclxuICAgIG5vZGUud2FsaygobjogVE5vZGUpID0+IHtcclxuICAgICAgY29uc3Qge1xyXG4gICAgICAgIHJvb3RQcm9wcyxcclxuICAgICAgICBtb3ZlUHJvcHMsXHJcbiAgICAgICAgY3VzdG9tUHJvcHMsXHJcbiAgICAgICAgc2V0dXBQcm9wcyxcclxuICAgICAgICBtYXJrdXBQcm9wcyxcclxuICAgICAgICBub2RlQW5ub3RhdGlvblByb3BzLFxyXG4gICAgICAgIG1vdmVBbm5vdGF0aW9uUHJvcHMsXHJcbiAgICAgICAgZ2FtZUluZm9Qcm9wcyxcclxuICAgICAgfSA9IG4ubW9kZWw7XHJcbiAgICAgIGNvbnN0IG5vZGVzID0gY29tcGFjdChbXHJcbiAgICAgICAgLi4ucm9vdFByb3BzLFxyXG4gICAgICAgIC4uLmN1c3RvbVByb3BzLFxyXG4gICAgICAgIC4uLm1vdmVQcm9wcyxcclxuICAgICAgICAuLi5nZXREZWR1cGxpY2F0ZWRQcm9wcyhzZXR1cFByb3BzKSxcclxuICAgICAgICAuLi5nZXREZWR1cGxpY2F0ZWRQcm9wcyhtYXJrdXBQcm9wcyksXHJcbiAgICAgICAgLi4uZ2FtZUluZm9Qcm9wcyxcclxuICAgICAgICAuLi5ub2RlQW5ub3RhdGlvblByb3BzLFxyXG4gICAgICAgIC4uLm1vdmVBbm5vdGF0aW9uUHJvcHMsXHJcbiAgICAgIF0pO1xyXG4gICAgICBjb250ZW50ICs9ICc7JztcclxuICAgICAgbm9kZXMuZm9yRWFjaCgobjogU2dmUHJvcEJhc2UpID0+IHtcclxuICAgICAgICBjb250ZW50ICs9IG4udG9TdHJpbmcoKTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmIChuLmNoaWxkcmVuLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBuLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkOiBUTm9kZSkgPT4ge1xyXG4gICAgICAgICAgY29udGVudCArPSBgKCR7dGhpcy5ub2RlVG9TdHJpbmcoY2hpbGQpfSlgO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBuLmNoaWxkcmVuLmxlbmd0aCA8IDI7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBjb250ZW50O1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQge1RyZWVNb2RlbCwgVE5vZGV9IGZyb20gJy4vY29yZS90cmVlJztcclxuaW1wb3J0IHtjbG9uZURlZXAsIGZsYXR0ZW5EZXB0aCwgY2xvbmUsIHN1bSwgY29tcGFjdCwgc2FtcGxlfSBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQge1NnZk5vZGUsIFNnZk5vZGVPcHRpb25zfSBmcm9tICcuL2NvcmUvdHlwZXMnO1xyXG5pbXBvcnQge1xyXG4gIGlzTW92ZU5vZGUsXHJcbiAgaXNTZXR1cE5vZGUsXHJcbiAgY2FsY0hhc2gsXHJcbiAgZ2V0Tm9kZU51bWJlcixcclxuICBpc1Jvb3ROb2RlLFxyXG59IGZyb20gJy4vY29yZS9oZWxwZXJzJztcclxuZXhwb3J0IHtpc01vdmVOb2RlLCBpc1NldHVwTm9kZSwgY2FsY0hhc2gsIGdldE5vZGVOdW1iZXIsIGlzUm9vdE5vZGV9O1xyXG5pbXBvcnQge1xyXG4gIEExX0xFVFRFUlMsXHJcbiAgQTFfTlVNQkVSUyxcclxuICBTR0ZfTEVUVEVSUyxcclxuICBNQVhfQk9BUkRfU0laRSxcclxuICBMSUdIVF9HUkVFTl9SR0IsXHJcbiAgTElHSFRfWUVMTE9XX1JHQixcclxuICBMSUdIVF9SRURfUkdCLFxyXG4gIFlFTExPV19SR0IsXHJcbiAgREVGQVVMVF9CT0FSRF9TSVpFLFxyXG59IGZyb20gJy4vY29uc3QnO1xyXG5pbXBvcnQge1xyXG4gIFNldHVwUHJvcCxcclxuICBNb3ZlUHJvcCxcclxuICBDdXN0b21Qcm9wLFxyXG4gIFNnZlByb3BCYXNlLFxyXG4gIE5vZGVBbm5vdGF0aW9uUHJvcCxcclxuICBHYW1lSW5mb1Byb3AsXHJcbiAgTW92ZUFubm90YXRpb25Qcm9wLFxyXG4gIFJvb3RQcm9wLFxyXG4gIE1hcmt1cFByb3AsXHJcbiAgTU9WRV9QUk9QX0xJU1QsXHJcbiAgU0VUVVBfUFJPUF9MSVNULFxyXG4gIE5PREVfQU5OT1RBVElPTl9QUk9QX0xJU1QsXHJcbiAgTU9WRV9BTk5PVEFUSU9OX1BST1BfTElTVCxcclxuICBNQVJLVVBfUFJPUF9MSVNULFxyXG4gIFJPT1RfUFJPUF9MSVNULFxyXG4gIEdBTUVfSU5GT19QUk9QX0xJU1QsXHJcbiAgVElNSU5HX1BST1BfTElTVCxcclxuICBNSVNDRUxMQU5FT1VTX1BST1BfTElTVCxcclxuICBDVVNUT01fUFJPUF9MSVNULFxyXG59IGZyb20gJy4vY29yZS9wcm9wcyc7XHJcbmltcG9ydCB7XHJcbiAgQW5hbHlzaXMsXHJcbiAgR2hvc3RCYW5PcHRpb25zLFxyXG4gIEtpLFxyXG4gIE1vdmVJbmZvLFxyXG4gIFByb2JsZW1BbnN3ZXJUeXBlIGFzIFBBVCxcclxuICBSb290SW5mbyxcclxuICBNYXJrdXAsXHJcbiAgUGF0aERldGVjdGlvblN0cmF0ZWd5LFxyXG59IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuaW1wb3J0IHtDZW50ZXJ9IGZyb20gJy4vdHlwZXMnO1xyXG5pbXBvcnQge2Nhbk1vdmUsIGV4ZWNDYXB0dXJlfSBmcm9tICcuL2JvYXJkY29yZSc7XHJcbmV4cG9ydCB7Y2FuTW92ZSwgZXhlY0NhcHR1cmV9O1xyXG5cclxuaW1wb3J0IHtTZ2Z9IGZyb20gJy4vY29yZS9zZ2YnO1xyXG5pbXBvcnQgU3BhcmtNRDUgZnJvbSAnc3BhcmstbWQ1JztcclxuXHJcbnR5cGUgU3RyYXRlZ3kgPSAncG9zdCcgfCAncHJlJyB8ICdib3RoJztcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjRG91YnRmdWxNb3Zlc1RocmVzaG9sZFJhbmdlID0gKHRocmVzaG9sZDogbnVtYmVyKSA9PiB7XHJcbiAgLy8gOEQtOURcclxuICBpZiAodGhyZXNob2xkID49IDI1KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBldmlsOiB7d2lucmF0ZVJhbmdlOiBbLTEsIC0wLjE1XSwgc2NvcmVSYW5nZTogWy0xMDAsIC0zXX0sXHJcbiAgICAgIGJhZDoge3dpbnJhdGVSYW5nZTogWy0wLjE1LCAtMC4xXSwgc2NvcmVSYW5nZTogWy0zLCAtMl19LFxyXG4gICAgICBwb29yOiB7d2lucmF0ZVJhbmdlOiBbLTAuMSwgLTAuMDVdLCBzY29yZVJhbmdlOiBbLTIsIC0xXX0sXHJcbiAgICAgIG9rOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDUsIC0wLjAyXSwgc2NvcmVSYW5nZTogWy0xLCAtMC41XX0sXHJcbiAgICAgIGdvb2Q6IHt3aW5yYXRlUmFuZ2U6IFstMC4wMiwgMF0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgICAgZ3JlYXQ6IHt3aW5yYXRlUmFuZ2U6IFswLCAxXSwgc2NvcmVSYW5nZTogWzAsIDEwMF19LFxyXG4gICAgfTtcclxuICB9XHJcbiAgLy8gNUQtN0RcclxuICBpZiAodGhyZXNob2xkID49IDIzICYmIHRocmVzaG9sZCA8IDI1KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBldmlsOiB7d2lucmF0ZVJhbmdlOiBbLTEsIC0wLjJdLCBzY29yZVJhbmdlOiBbLTEwMCwgLThdfSxcclxuICAgICAgYmFkOiB7d2lucmF0ZVJhbmdlOiBbLTAuMiwgLTAuMTVdLCBzY29yZVJhbmdlOiBbLTgsIC00XX0sXHJcbiAgICAgIHBvb3I6IHt3aW5yYXRlUmFuZ2U6IFstMC4xNSwgLTAuMDVdLCBzY29yZVJhbmdlOiBbLTQsIC0yXX0sXHJcbiAgICAgIG9rOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDUsIC0wLjAyXSwgc2NvcmVSYW5nZTogWy0yLCAtMV19LFxyXG4gICAgICBnb29kOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDIsIDBdLCBzY29yZVJhbmdlOiBbMCwgMTAwXX0sXHJcbiAgICAgIGdyZWF0OiB7d2lucmF0ZVJhbmdlOiBbMCwgMV0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyAzRC01RFxyXG4gIGlmICh0aHJlc2hvbGQgPj0gMjAgJiYgdGhyZXNob2xkIDwgMjMpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGV2aWw6IHt3aW5yYXRlUmFuZ2U6IFstMSwgLTAuMjVdLCBzY29yZVJhbmdlOiBbLTEwMCwgLTEyXX0sXHJcbiAgICAgIGJhZDoge3dpbnJhdGVSYW5nZTogWy0wLjI1LCAtMC4xXSwgc2NvcmVSYW5nZTogWy0xMiwgLTVdfSxcclxuICAgICAgcG9vcjoge3dpbnJhdGVSYW5nZTogWy0wLjEsIC0wLjA1XSwgc2NvcmVSYW5nZTogWy01LCAtMl19LFxyXG4gICAgICBvazoge3dpbnJhdGVSYW5nZTogWy0wLjA1LCAtMC4wMl0sIHNjb3JlUmFuZ2U6IFstMiwgLTFdfSxcclxuICAgICAgZ29vZDoge3dpbnJhdGVSYW5nZTogWy0wLjAyLCAwXSwgc2NvcmVSYW5nZTogWzAsIDEwMF19LFxyXG4gICAgICBncmVhdDoge3dpbnJhdGVSYW5nZTogWzAsIDFdLCBzY29yZVJhbmdlOiBbMCwgMTAwXX0sXHJcbiAgICB9O1xyXG4gIH1cclxuICAvLyAxRC0zRFxyXG4gIGlmICh0aHJlc2hvbGQgPj0gMTggJiYgdGhyZXNob2xkIDwgMjApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGV2aWw6IHt3aW5yYXRlUmFuZ2U6IFstMSwgLTAuM10sIHNjb3JlUmFuZ2U6IFstMTAwLCAtMTVdfSxcclxuICAgICAgYmFkOiB7d2lucmF0ZVJhbmdlOiBbLTAuMywgLTAuMV0sIHNjb3JlUmFuZ2U6IFstMTUsIC03XX0sXHJcbiAgICAgIHBvb3I6IHt3aW5yYXRlUmFuZ2U6IFstMC4xLCAtMC4wNV0sIHNjb3JlUmFuZ2U6IFstNywgLTVdfSxcclxuICAgICAgb2s6IHt3aW5yYXRlUmFuZ2U6IFstMC4wNSwgLTAuMDJdLCBzY29yZVJhbmdlOiBbLTUsIC0xXX0sXHJcbiAgICAgIGdvb2Q6IHt3aW5yYXRlUmFuZ2U6IFstMC4wMiwgMF0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgICAgZ3JlYXQ6IHt3aW5yYXRlUmFuZ2U6IFswLCAxXSwgc2NvcmVSYW5nZTogWzAsIDEwMF19LFxyXG4gICAgfTtcclxuICB9XHJcbiAgLy8gNUstMUtcclxuICBpZiAodGhyZXNob2xkID49IDEzICYmIHRocmVzaG9sZCA8IDE4KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBldmlsOiB7d2lucmF0ZVJhbmdlOiBbLTEsIC0wLjM1XSwgc2NvcmVSYW5nZTogWy0xMDAsIC0yMF19LFxyXG4gICAgICBiYWQ6IHt3aW5yYXRlUmFuZ2U6IFstMC4zNSwgLTAuMTJdLCBzY29yZVJhbmdlOiBbLTIwLCAtMTBdfSxcclxuICAgICAgcG9vcjoge3dpbnJhdGVSYW5nZTogWy0wLjEyLCAtMC4wOF0sIHNjb3JlUmFuZ2U6IFstMTAsIC01XX0sXHJcbiAgICAgIG9rOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDgsIC0wLjAyXSwgc2NvcmVSYW5nZTogWy01LCAtMV19LFxyXG4gICAgICBnb29kOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDIsIDBdLCBzY29yZVJhbmdlOiBbMCwgMTAwXX0sXHJcbiAgICAgIGdyZWF0OiB7d2lucmF0ZVJhbmdlOiBbMCwgMV0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgIH07XHJcbiAgfVxyXG4gIC8vIDVLLTEwS1xyXG4gIGlmICh0aHJlc2hvbGQgPj0gOCAmJiB0aHJlc2hvbGQgPCAxMykge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZXZpbDoge3dpbnJhdGVSYW5nZTogWy0xLCAtMC40XSwgc2NvcmVSYW5nZTogWy0xMDAsIC0yNV19LFxyXG4gICAgICBiYWQ6IHt3aW5yYXRlUmFuZ2U6IFstMC40LCAtMC4xNV0sIHNjb3JlUmFuZ2U6IFstMjUsIC0xMF19LFxyXG4gICAgICBwb29yOiB7d2lucmF0ZVJhbmdlOiBbLTAuMTUsIC0wLjFdLCBzY29yZVJhbmdlOiBbLTEwLCAtNV19LFxyXG4gICAgICBvazoge3dpbnJhdGVSYW5nZTogWy0wLjEsIC0wLjAyXSwgc2NvcmVSYW5nZTogWy01LCAtMV19LFxyXG4gICAgICBnb29kOiB7d2lucmF0ZVJhbmdlOiBbLTAuMDIsIDBdLCBzY29yZVJhbmdlOiBbMCwgMTAwXX0sXHJcbiAgICAgIGdyZWF0OiB7d2lucmF0ZVJhbmdlOiBbMCwgMV0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgIH07XHJcbiAgfVxyXG4gIC8vIDE4Sy0xMEtcclxuICBpZiAodGhyZXNob2xkID49IDAgJiYgdGhyZXNob2xkIDwgOCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZXZpbDoge3dpbnJhdGVSYW5nZTogWy0xLCAtMC40NV0sIHNjb3JlUmFuZ2U6IFstMTAwLCAtMzVdfSxcclxuICAgICAgYmFkOiB7d2lucmF0ZVJhbmdlOiBbLTAuNDUsIC0wLjJdLCBzY29yZVJhbmdlOiBbLTM1LCAtMjBdfSxcclxuICAgICAgcG9vcjoge3dpbnJhdGVSYW5nZTogWy0wLjIsIC0wLjFdLCBzY29yZVJhbmdlOiBbLTIwLCAtMTBdfSxcclxuICAgICAgb2s6IHt3aW5yYXRlUmFuZ2U6IFstMC4xLCAtMC4wMl0sIHNjb3JlUmFuZ2U6IFstMTAsIC0xXX0sXHJcbiAgICAgIGdvb2Q6IHt3aW5yYXRlUmFuZ2U6IFstMC4wMiwgMF0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgICAgZ3JlYXQ6IHt3aW5yYXRlUmFuZ2U6IFswLCAxXSwgc2NvcmVSYW5nZTogWzAsIDEwMF19LFxyXG4gICAgfTtcclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGV2aWw6IHt3aW5yYXRlUmFuZ2U6IFstMSwgLTAuM10sIHNjb3JlUmFuZ2U6IFstMTAwLCAtMzBdfSxcclxuICAgIGJhZDoge3dpbnJhdGVSYW5nZTogWy0wLjMsIC0wLjJdLCBzY29yZVJhbmdlOiBbLTMwLCAtMjBdfSxcclxuICAgIHBvb3I6IHt3aW5yYXRlUmFuZ2U6IFstMC4yLCAtMC4xXSwgc2NvcmVSYW5nZTogWy0yMCwgLTEwXX0sXHJcbiAgICBvazoge3dpbnJhdGVSYW5nZTogWy0wLjEsIC0wLjAyXSwgc2NvcmVSYW5nZTogWy0xMCwgLTFdfSxcclxuICAgIGdvb2Q6IHt3aW5yYXRlUmFuZ2U6IFstMC4wMiwgMF0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICAgIGdyZWF0OiB7d2lucmF0ZVJhbmdlOiBbMCwgMV0sIHNjb3JlUmFuZ2U6IFswLCAxMDBdfSxcclxuICB9O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHJvdW5kMiA9ICh2OiBudW1iZXIsIHNjYWxlID0gMSwgZml4ZWQgPSAyKSA9PiB7XHJcbiAgcmV0dXJuICgoTWF0aC5yb3VuZCh2ICogMTAwKSAvIDEwMCkgKiBzY2FsZSkudG9GaXhlZChmaXhlZCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgcm91bmQzID0gKHY6IG51bWJlciwgc2NhbGUgPSAxLCBmaXhlZCA9IDMpID0+IHtcclxuICByZXR1cm4gKChNYXRoLnJvdW5kKHYgKiAxMDAwKSAvIDEwMDApICogc2NhbGUpLnRvRml4ZWQoZml4ZWQpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzQW5zd2VyTm9kZSA9IChuOiBUTm9kZSwga2luZDogUEFUKSA9PiB7XHJcbiAgY29uc3QgcGF0ID0gbi5tb2RlbC5jdXN0b21Qcm9wcz8uZmluZCgocDogQ3VzdG9tUHJvcCkgPT4gcC50b2tlbiA9PT0gJ1BBVCcpO1xyXG4gIHJldHVybiBwYXQ/LnZhbHVlID09PSBraW5kO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzQ2hvaWNlTm9kZSA9IChuOiBUTm9kZSkgPT4ge1xyXG4gIGNvbnN0IGMgPSBuLm1vZGVsLm5vZGVBbm5vdGF0aW9uUHJvcHM/LmZpbmQoXHJcbiAgICAocDogTm9kZUFubm90YXRpb25Qcm9wKSA9PiBwLnRva2VuID09PSAnQydcclxuICApO1xyXG4gIHJldHVybiAhIWM/LnZhbHVlLmluY2x1ZGVzKCdDSE9JQ0UnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1RhcmdldE5vZGUgPSBpc0Nob2ljZU5vZGU7XHJcblxyXG5leHBvcnQgY29uc3QgaXNGb3JjZU5vZGUgPSAobjogVE5vZGUpID0+IHtcclxuICBjb25zdCBjID0gbi5tb2RlbC5ub2RlQW5ub3RhdGlvblByb3BzPy5maW5kKFxyXG4gICAgKHA6IE5vZGVBbm5vdGF0aW9uUHJvcCkgPT4gcC50b2tlbiA9PT0gJ0MnXHJcbiAgKTtcclxuICByZXR1cm4gYz8udmFsdWUuaW5jbHVkZXMoJ0ZPUkNFJyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaXNQcmV2ZW50TW92ZU5vZGUgPSAobjogVE5vZGUpID0+IHtcclxuICBjb25zdCBjID0gbi5tb2RlbC5ub2RlQW5ub3RhdGlvblByb3BzPy5maW5kKFxyXG4gICAgKHA6IE5vZGVBbm5vdGF0aW9uUHJvcCkgPT4gcC50b2tlbiA9PT0gJ0MnXHJcbiAgKTtcclxuICByZXR1cm4gYz8udmFsdWUuaW5jbHVkZXMoJ05PVFRISVMnKTtcclxufTtcclxuXHJcbi8vIGV4cG9ydCBjb25zdCBpc1JpZ2h0TGVhZiA9IChuOiBUTm9kZSkgPT4ge1xyXG4vLyAgIHJldHVybiBpc1JpZ2h0Tm9kZShuKSAmJiAhbi5oYXNDaGlsZHJlbigpO1xyXG4vLyB9O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzUmlnaHROb2RlID0gKG46IFROb2RlKSA9PiB7XHJcbiAgY29uc3QgYyA9IG4ubW9kZWwubm9kZUFubm90YXRpb25Qcm9wcz8uZmluZChcclxuICAgIChwOiBOb2RlQW5ub3RhdGlvblByb3ApID0+IHAudG9rZW4gPT09ICdDJ1xyXG4gICk7XHJcbiAgcmV0dXJuICEhYz8udmFsdWUuaW5jbHVkZXMoJ1JJR0hUJyk7XHJcbn07XHJcblxyXG4vLyBleHBvcnQgY29uc3QgaXNGaXJzdFJpZ2h0TGVhZiA9IChuOiBUTm9kZSkgPT4ge1xyXG4vLyAgIGNvbnN0IHJvb3QgPSBuLmdldFBhdGgoKVswXTtcclxuLy8gICBjb25zdCBmaXJzdFJpZ2h0TGVhdmUgPSByb290LmZpcnN0KChuOiBUTm9kZSkgPT5cclxuLy8gICAgIGlzUmlnaHRMZWFmKG4pXHJcbi8vICAgKTtcclxuLy8gICByZXR1cm4gZmlyc3RSaWdodExlYXZlPy5tb2RlbC5pZCA9PT0gbi5tb2RlbC5pZDtcclxuLy8gfTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc0ZpcnN0UmlnaHROb2RlID0gKG46IFROb2RlKSA9PiB7XHJcbiAgY29uc3Qgcm9vdCA9IG4uZ2V0UGF0aCgpWzBdO1xyXG4gIGNvbnN0IGZpcnN0UmlnaHROb2RlID0gcm9vdC5maXJzdChuID0+IGlzUmlnaHROb2RlKG4pKTtcclxuICByZXR1cm4gZmlyc3RSaWdodE5vZGU/Lm1vZGVsLmlkID09PSBuLm1vZGVsLmlkO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzVmFyaWFudE5vZGUgPSAobjogVE5vZGUpID0+IHtcclxuICBjb25zdCBjID0gbi5tb2RlbC5ub2RlQW5ub3RhdGlvblByb3BzPy5maW5kKFxyXG4gICAgKHA6IE5vZGVBbm5vdGF0aW9uUHJvcCkgPT4gcC50b2tlbiA9PT0gJ0MnXHJcbiAgKTtcclxuICByZXR1cm4gISFjPy52YWx1ZS5pbmNsdWRlcygnVkFSSUFOVCcpO1xyXG59O1xyXG5cclxuLy8gZXhwb3J0IGNvbnN0IGlzVmFyaWFudExlYWYgPSAobjogVE5vZGUpID0+IHtcclxuLy8gICByZXR1cm4gaXNWYXJpYW50Tm9kZShuKSAmJiAhbi5oYXNDaGlsZHJlbigpO1xyXG4vLyB9O1xyXG5cclxuZXhwb3J0IGNvbnN0IGlzV3JvbmdOb2RlID0gKG46IFROb2RlKSA9PiB7XHJcbiAgY29uc3QgYyA9IG4ubW9kZWwubm9kZUFubm90YXRpb25Qcm9wcz8uZmluZChcclxuICAgIChwOiBOb2RlQW5ub3RhdGlvblByb3ApID0+IHAudG9rZW4gPT09ICdDJ1xyXG4gICk7XHJcbiAgcmV0dXJuICghYz8udmFsdWUuaW5jbHVkZXMoJ1ZBUklBTlQnKSAmJiAhYz8udmFsdWUuaW5jbHVkZXMoJ1JJR0hUJykpIHx8ICFjO1xyXG59O1xyXG5cclxuLy8gZXhwb3J0IGNvbnN0IGlzV3JvbmdMZWFmID0gKG46IFROb2RlKSA9PiB7XHJcbi8vICAgcmV0dXJuIGlzV3JvbmdOb2RlKG4pICYmICFuLmhhc0NoaWxkcmVuKCk7XHJcbi8vIH07XHJcblxyXG5leHBvcnQgY29uc3QgaW5QYXRoID0gKFxyXG4gIG5vZGU6IFROb2RlLFxyXG4gIGRldGVjdGlvbk1ldGhvZDogKG46IFROb2RlKSA9PiBib29sZWFuLFxyXG4gIHN0cmF0ZWd5OiBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kgPSBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kuUG9zdCxcclxuICBwcmVOb2Rlcz86IFROb2RlW10sXHJcbiAgcG9zdE5vZGVzPzogVE5vZGVbXVxyXG4pID0+IHtcclxuICBjb25zdCBwYXRoID0gcHJlTm9kZXMgPz8gbm9kZS5nZXRQYXRoKCk7XHJcbiAgY29uc3QgcG9zdFJpZ2h0Tm9kZXMgPVxyXG4gICAgcG9zdE5vZGVzPy5maWx0ZXIoKG46IFROb2RlKSA9PiBkZXRlY3Rpb25NZXRob2QobikpID8/XHJcbiAgICBub2RlLmFsbCgobjogVE5vZGUpID0+IGRldGVjdGlvbk1ldGhvZChuKSk7XHJcbiAgY29uc3QgcHJlUmlnaHROb2RlcyA9IHBhdGguZmlsdGVyKChuOiBUTm9kZSkgPT4gZGV0ZWN0aW9uTWV0aG9kKG4pKTtcclxuXHJcbiAgc3dpdGNoIChzdHJhdGVneSkge1xyXG4gICAgY2FzZSBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kuUG9zdDpcclxuICAgICAgcmV0dXJuIHBvc3RSaWdodE5vZGVzLmxlbmd0aCA+IDA7XHJcbiAgICBjYXNlIFBhdGhEZXRlY3Rpb25TdHJhdGVneS5QcmU6XHJcbiAgICAgIHJldHVybiBwcmVSaWdodE5vZGVzLmxlbmd0aCA+IDA7XHJcbiAgICBjYXNlIFBhdGhEZXRlY3Rpb25TdHJhdGVneS5Cb3RoOlxyXG4gICAgICByZXR1cm4gcHJlUmlnaHROb2Rlcy5sZW5ndGggPiAwIHx8IHBvc3RSaWdodE5vZGVzLmxlbmd0aCA+IDA7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGluUmlnaHRQYXRoID0gKFxyXG4gIG5vZGU6IFROb2RlLFxyXG4gIHN0cmF0ZWd5OiBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kgPSBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kuUG9zdCxcclxuICBwcmVOb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWQsXHJcbiAgcG9zdE5vZGVzPzogVE5vZGVbXSB8IHVuZGVmaW5lZFxyXG4pID0+IHtcclxuICByZXR1cm4gaW5QYXRoKG5vZGUsIGlzUmlnaHROb2RlLCBzdHJhdGVneSwgcHJlTm9kZXMsIHBvc3ROb2Rlcyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaW5GaXJzdFJpZ2h0UGF0aCA9IChcclxuICBub2RlOiBUTm9kZSxcclxuICBzdHJhdGVneTogUGF0aERldGVjdGlvblN0cmF0ZWd5ID0gUGF0aERldGVjdGlvblN0cmF0ZWd5LlBvc3QsXHJcbiAgcHJlTm9kZXM/OiBUTm9kZVtdIHwgdW5kZWZpbmVkLFxyXG4gIHBvc3ROb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWRcclxuKTogYm9vbGVhbiA9PiB7XHJcbiAgcmV0dXJuIGluUGF0aChub2RlLCBpc0ZpcnN0UmlnaHROb2RlLCBzdHJhdGVneSwgcHJlTm9kZXMsIHBvc3ROb2Rlcyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaW5GaXJzdEJyYW5jaFJpZ2h0UGF0aCA9IChcclxuICBub2RlOiBUTm9kZSxcclxuICBzdHJhdGVneTogUGF0aERldGVjdGlvblN0cmF0ZWd5ID0gUGF0aERldGVjdGlvblN0cmF0ZWd5LlByZSxcclxuICBwcmVOb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWQsXHJcbiAgcG9zdE5vZGVzPzogVE5vZGVbXSB8IHVuZGVmaW5lZFxyXG4pOiBib29sZWFuID0+IHtcclxuICBpZiAoIWluUmlnaHRQYXRoKG5vZGUpKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gIGNvbnN0IHBhdGggPSBwcmVOb2RlcyA/PyBub2RlLmdldFBhdGgoKTtcclxuICBjb25zdCBwb3N0UmlnaHROb2RlcyA9IHBvc3ROb2RlcyA/PyBub2RlLmFsbCgoKSA9PiB0cnVlKTtcclxuXHJcbiAgbGV0IHJlc3VsdCA9IFtdO1xyXG4gIHN3aXRjaCAoc3RyYXRlZ3kpIHtcclxuICAgIGNhc2UgUGF0aERldGVjdGlvblN0cmF0ZWd5LlBvc3Q6XHJcbiAgICAgIHJlc3VsdCA9IHBvc3RSaWdodE5vZGVzLmZpbHRlcihuID0+IG4uZ2V0SW5kZXgoKSA+IDApO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgUGF0aERldGVjdGlvblN0cmF0ZWd5LlByZTpcclxuICAgICAgcmVzdWx0ID0gcGF0aC5maWx0ZXIobiA9PiBuLmdldEluZGV4KCkgPiAwKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFBhdGhEZXRlY3Rpb25TdHJhdGVneS5Cb3RoOlxyXG4gICAgICByZXN1bHQgPSBwYXRoLmNvbmNhdChwb3N0UmlnaHROb2RlcykuZmlsdGVyKG4gPT4gbi5nZXRJbmRleCgpID4gMCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdC5sZW5ndGggPT09IDA7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaW5DaG9pY2VQYXRoID0gKFxyXG4gIG5vZGU6IFROb2RlLFxyXG4gIHN0cmF0ZWd5OiBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kgPSBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kuUG9zdCxcclxuICBwcmVOb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWQsXHJcbiAgcG9zdE5vZGVzPzogVE5vZGVbXSB8IHVuZGVmaW5lZFxyXG4pOiBib29sZWFuID0+IHtcclxuICByZXR1cm4gaW5QYXRoKG5vZGUsIGlzQ2hvaWNlTm9kZSwgc3RyYXRlZ3ksIHByZU5vZGVzLCBwb3N0Tm9kZXMpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGluVGFyZ2V0UGF0aCA9IGluQ2hvaWNlUGF0aDtcclxuXHJcbmV4cG9ydCBjb25zdCBpblZhcmlhbnRQYXRoID0gKFxyXG4gIG5vZGU6IFROb2RlLFxyXG4gIHN0cmF0ZWd5OiBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kgPSBQYXRoRGV0ZWN0aW9uU3RyYXRlZ3kuUG9zdCxcclxuICBwcmVOb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWQsXHJcbiAgcG9zdE5vZGVzPzogVE5vZGVbXSB8IHVuZGVmaW5lZFxyXG4pOiBib29sZWFuID0+IHtcclxuICByZXR1cm4gaW5QYXRoKG5vZGUsIGlzVmFyaWFudE5vZGUsIHN0cmF0ZWd5LCBwcmVOb2RlcywgcG9zdE5vZGVzKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpbldyb25nUGF0aCA9IChcclxuICBub2RlOiBUTm9kZSxcclxuICBzdHJhdGVneTogUGF0aERldGVjdGlvblN0cmF0ZWd5ID0gUGF0aERldGVjdGlvblN0cmF0ZWd5LlBvc3QsXHJcbiAgcHJlTm9kZXM/OiBUTm9kZVtdIHwgdW5kZWZpbmVkLFxyXG4gIHBvc3ROb2Rlcz86IFROb2RlW10gfCB1bmRlZmluZWRcclxuKTogYm9vbGVhbiA9PiB7XHJcbiAgcmV0dXJuIGluUGF0aChub2RlLCBpc1dyb25nTm9kZSwgc3RyYXRlZ3ksIHByZU5vZGVzLCBwb3N0Tm9kZXMpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG5Gb3JtYXR0ZXIgPSAobnVtOiBudW1iZXIsIGZpeGVkID0gMSkgPT4ge1xyXG4gIGNvbnN0IGxvb2t1cCA9IFtcclxuICAgIHt2YWx1ZTogMSwgc3ltYm9sOiAnJ30sXHJcbiAgICB7dmFsdWU6IDFlMywgc3ltYm9sOiAnayd9LFxyXG4gICAge3ZhbHVlOiAxZTYsIHN5bWJvbDogJ00nfSxcclxuICAgIHt2YWx1ZTogMWU5LCBzeW1ib2w6ICdHJ30sXHJcbiAgICB7dmFsdWU6IDFlMTIsIHN5bWJvbDogJ1QnfSxcclxuICAgIHt2YWx1ZTogMWUxNSwgc3ltYm9sOiAnUCd9LFxyXG4gICAge3ZhbHVlOiAxZTE4LCBzeW1ib2w6ICdFJ30sXHJcbiAgXTtcclxuICBjb25zdCByeCA9IC9cXC4wKyR8KFxcLlswLTldKlsxLTldKTArJC87XHJcbiAgY29uc3QgaXRlbSA9IGxvb2t1cFxyXG4gICAgLnNsaWNlKClcclxuICAgIC5yZXZlcnNlKClcclxuICAgIC5maW5kKGl0ZW0gPT4ge1xyXG4gICAgICByZXR1cm4gbnVtID49IGl0ZW0udmFsdWU7XHJcbiAgICB9KTtcclxuICByZXR1cm4gaXRlbVxyXG4gICAgPyAobnVtIC8gaXRlbS52YWx1ZSkudG9GaXhlZChmaXhlZCkucmVwbGFjZShyeCwgJyQxJykgKyBpdGVtLnN5bWJvbFxyXG4gICAgOiAnMCc7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGF0aFRvSW5kZXhlcyA9IChwYXRoOiBUTm9kZVtdKTogc3RyaW5nW10gPT4ge1xyXG4gIHJldHVybiBwYXRoLm1hcChuID0+IG4ubW9kZWwuaWQpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHBhdGhUb0luaXRpYWxTdG9uZXMgPSAoXHJcbiAgcGF0aDogVE5vZGVbXSxcclxuICB4T2Zmc2V0ID0gMCxcclxuICB5T2Zmc2V0ID0gMFxyXG4pOiBzdHJpbmdbXSA9PiB7XHJcbiAgY29uc3QgaW5pdHMgPSBwYXRoXHJcbiAgICAuZmlsdGVyKG4gPT4gbi5tb2RlbC5zZXR1cFByb3BzLmxlbmd0aCA+IDApXHJcbiAgICAubWFwKG4gPT4ge1xyXG4gICAgICByZXR1cm4gbi5tb2RlbC5zZXR1cFByb3BzLm1hcCgoc2V0dXA6IFNldHVwUHJvcCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBzZXR1cC52YWx1ZXMubWFwKCh2OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGEgPSBBMV9MRVRURVJTW1NHRl9MRVRURVJTLmluZGV4T2YodlswXSkgKyB4T2Zmc2V0XTtcclxuICAgICAgICAgIGNvbnN0IGIgPSBBMV9OVU1CRVJTW1NHRl9MRVRURVJTLmluZGV4T2YodlsxXSkgKyB5T2Zmc2V0XTtcclxuICAgICAgICAgIGNvbnN0IHRva2VuID0gc2V0dXAudG9rZW4gPT09ICdBQicgPyAnQicgOiAnVyc7XHJcbiAgICAgICAgICByZXR1cm4gW3Rva2VuLCBhICsgYl07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgcmV0dXJuIGZsYXR0ZW5EZXB0aChpbml0c1swXSwgMSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGF0aFRvQWlNb3ZlcyA9IChwYXRoOiBUTm9kZVtdLCB4T2Zmc2V0ID0gMCwgeU9mZnNldCA9IDApID0+IHtcclxuICBjb25zdCBtb3ZlcyA9IHBhdGhcclxuICAgIC5maWx0ZXIobiA9PiBuLm1vZGVsLm1vdmVQcm9wcy5sZW5ndGggPiAwKVxyXG4gICAgLm1hcChuID0+IHtcclxuICAgICAgY29uc3QgcHJvcCA9IG4ubW9kZWwubW92ZVByb3BzWzBdO1xyXG4gICAgICBjb25zdCBhID0gQTFfTEVUVEVSU1tTR0ZfTEVUVEVSUy5pbmRleE9mKHByb3AudmFsdWVbMF0pICsgeE9mZnNldF07XHJcbiAgICAgIGNvbnN0IGIgPSBBMV9OVU1CRVJTW1NHRl9MRVRURVJTLmluZGV4T2YocHJvcC52YWx1ZVsxXSkgKyB5T2Zmc2V0XTtcclxuICAgICAgcmV0dXJuIFtwcm9wLnRva2VuLCBhICsgYl07XHJcbiAgICB9KTtcclxuICByZXR1cm4gbW92ZXM7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0SW5kZXhGcm9tQW5hbHlzaXMgPSAoYTogQW5hbHlzaXMpID0+IHtcclxuICBpZiAoL2luZGV4ZXMvLnRlc3QoYS5pZCkpIHtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKGEuaWQpLmluZGV4ZXNbMF07XHJcbiAgfVxyXG4gIHJldHVybiAnJztcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc01haW5QYXRoID0gKG5vZGU6IFROb2RlKSA9PiB7XHJcbiAgcmV0dXJuIHN1bShub2RlLmdldFBhdGgoKS5tYXAobiA9PiBuLmdldEluZGV4KCkpKSA9PT0gMDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzZ2ZUb1BvcyA9IChzdHI6IHN0cmluZykgPT4ge1xyXG4gIGNvbnN0IGtpID0gc3RyWzBdID09PSAnQicgPyAxIDogLTE7XHJcbiAgY29uc3QgdGVtcFN0ciA9IC9cXFsoLiopXFxdLy5leGVjKHN0cik7XHJcbiAgaWYgKHRlbXBTdHIpIHtcclxuICAgIGNvbnN0IHBvcyA9IHRlbXBTdHJbMV07XHJcbiAgICBjb25zdCB4ID0gU0dGX0xFVFRFUlMuaW5kZXhPZihwb3NbMF0pO1xyXG4gICAgY29uc3QgeSA9IFNHRl9MRVRURVJTLmluZGV4T2YocG9zWzFdKTtcclxuICAgIHJldHVybiB7eCwgeSwga2l9O1xyXG4gIH1cclxuICByZXR1cm4ge3g6IC0xLCB5OiAtMSwga2k6IDB9O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNnZlRvQTEgPSAoc3RyOiBzdHJpbmcpID0+IHtcclxuICBjb25zdCB7eCwgeX0gPSBzZ2ZUb1BvcyhzdHIpO1xyXG4gIHJldHVybiBBMV9MRVRURVJTW3hdICsgQTFfTlVNQkVSU1t5XTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBhMVRvUG9zID0gKG1vdmU6IHN0cmluZykgPT4ge1xyXG4gIGNvbnN0IHggPSBBMV9MRVRURVJTLmluZGV4T2YobW92ZVswXSk7XHJcbiAgY29uc3QgeSA9IEExX05VTUJFUlMuaW5kZXhPZihwYXJzZUludChtb3ZlLnN1YnN0cigxKSwgMCkpO1xyXG4gIHJldHVybiB7eCwgeX07XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgYTFUb0luZGV4ID0gKG1vdmU6IHN0cmluZywgYm9hcmRTaXplID0gMTkpID0+IHtcclxuICBjb25zdCB4ID0gQTFfTEVUVEVSUy5pbmRleE9mKG1vdmVbMF0pO1xyXG4gIGNvbnN0IHkgPSBBMV9OVU1CRVJTLmluZGV4T2YocGFyc2VJbnQobW92ZS5zdWJzdHIoMSksIDApKTtcclxuICByZXR1cm4geCAqIGJvYXJkU2l6ZSArIHk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2dmT2Zmc2V0ID0gKHNnZjogYW55LCBvZmZzZXQgPSAwKSA9PiB7XHJcbiAgaWYgKG9mZnNldCA9PT0gMCkgcmV0dXJuIHNnZjtcclxuICBjb25zdCByZXMgPSBjbG9uZShzZ2YpO1xyXG4gIGNvbnN0IGNoYXJJbmRleCA9IFNHRl9MRVRURVJTLmluZGV4T2Yoc2dmWzJdKSAtIG9mZnNldDtcclxuICByZXR1cm4gcmVzLnN1YnN0cigwLCAyKSArIFNHRl9MRVRURVJTW2NoYXJJbmRleF0gKyByZXMuc3Vic3RyKDIgKyAxKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBhMVRvU0dGID0gKHN0cjogYW55LCB0eXBlID0gJ0InLCBvZmZzZXRYID0gMCwgb2Zmc2V0WSA9IDApID0+IHtcclxuICBpZiAoc3RyID09PSAncGFzcycpIHJldHVybiBgJHt0eXBlfVtdYDtcclxuICBjb25zdCBpbnggPSBBMV9MRVRURVJTLmluZGV4T2Yoc3RyWzBdKSArIG9mZnNldFg7XHJcbiAgY29uc3QgaW55ID0gQTFfTlVNQkVSUy5pbmRleE9mKHBhcnNlSW50KHN0ci5zdWJzdHIoMSksIDApKSArIG9mZnNldFk7XHJcbiAgY29uc3Qgc2dmID0gYCR7dHlwZX1bJHtTR0ZfTEVUVEVSU1tpbnhdfSR7U0dGX0xFVFRFUlNbaW55XX1dYDtcclxuICByZXR1cm4gc2dmO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHBvc1RvU2dmID0gKHg6IG51bWJlciwgeTogbnVtYmVyLCBraTogbnVtYmVyKSA9PiB7XHJcbiAgY29uc3QgYXggPSBTR0ZfTEVUVEVSU1t4XTtcclxuICBjb25zdCBheSA9IFNHRl9MRVRURVJTW3ldO1xyXG4gIGlmIChraSA9PT0gS2kuRW1wdHkpIHJldHVybiAnJztcclxuICBpZiAoa2kgPT09IEtpLldoaXRlKSByZXR1cm4gYEJbJHtheH0ke2F5fV1gO1xyXG4gIGlmIChraSA9PT0gS2kuQmxhY2spIHJldHVybiBgV1ske2F4fSR7YXl9XWA7XHJcbiAgcmV0dXJuICcnO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1hdFRvUG9zaXRpb24gPSAoXHJcbiAgbWF0OiBudW1iZXJbXVtdLFxyXG4gIHhPZmZzZXQ/OiBudW1iZXIsXHJcbiAgeU9mZnNldD86IG51bWJlclxyXG4pID0+IHtcclxuICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgeE9mZnNldCA9IHhPZmZzZXQgPz8gMDtcclxuICB5T2Zmc2V0ID0geU9mZnNldCA/PyBERUZBVUxUX0JPQVJEX1NJWkUgLSBtYXQubGVuZ3RoO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbWF0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG1hdFtpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICBjb25zdCB2YWx1ZSA9IG1hdFtpXVtqXTtcclxuICAgICAgaWYgKHZhbHVlICE9PSAwKSB7XHJcbiAgICAgICAgY29uc3QgeCA9IEExX0xFVFRFUlNbaSArIHhPZmZzZXRdO1xyXG4gICAgICAgIGNvbnN0IHkgPSBBMV9OVU1CRVJTW2ogKyB5T2Zmc2V0XTtcclxuICAgICAgICBjb25zdCBjb2xvciA9IHZhbHVlID09PSAxID8gJ2InIDogJ3cnO1xyXG4gICAgICAgIHJlc3VsdCArPSBgJHtjb2xvcn0gJHt4fSR7eX0gYDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1hdFRvTGlzdE9mVHVwbGVzID0gKFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICB4T2Zmc2V0ID0gMCxcclxuICB5T2Zmc2V0ID0gMFxyXG4pID0+IHtcclxuICBjb25zdCByZXN1bHRzID0gW107XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXQubGVuZ3RoOyBpKyspIHtcclxuICAgIGZvciAobGV0IGogPSAwOyBqIDwgbWF0W2ldLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIGNvbnN0IHZhbHVlID0gbWF0W2ldW2pdO1xyXG4gICAgICBpZiAodmFsdWUgIT09IDApIHtcclxuICAgICAgICBjb25zdCB4ID0gQTFfTEVUVEVSU1tpICsgeE9mZnNldF07XHJcbiAgICAgICAgY29uc3QgeSA9IEExX05VTUJFUlNbaiArIHlPZmZzZXRdO1xyXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdmFsdWUgPT09IDEgPyAnQicgOiAnVyc7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKFtjb2xvciwgeCArIHldKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0cztcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb252ZXJ0U3RvbmVUeXBlVG9TdHJpbmcgPSAodHlwZTogYW55KSA9PiAodHlwZSA9PT0gMSA/ICdCJyA6ICdXJyk7XHJcblxyXG5leHBvcnQgY29uc3QgY29udmVydFN0ZXBzRm9yQUkgPSAoc3RlcHM6IGFueSwgb2Zmc2V0ID0gMCkgPT4ge1xyXG4gIGxldCByZXMgPSBjbG9uZShzdGVwcyk7XHJcbiAgcmVzID0gcmVzLm1hcCgoczogYW55KSA9PiBzZ2ZPZmZzZXQocywgb2Zmc2V0KSk7XHJcbiAgY29uc3QgaGVhZGVyID0gYCg7RkZbNF1HTVsxXVNaWyR7XHJcbiAgICAxOSAtIG9mZnNldFxyXG4gIH1dR05bMjI2XVBCW0JsYWNrXUhBWzBdUFdbV2hpdGVdS01bNy41XURUWzIwMTctMDgtMDFdVE1bMTgwMF1SVVtDaGluZXNlXUNQW0NvcHlyaWdodCBnaG9zdC1nby5jb21dQVBbZ2hvc3QtZ28uY29tXVBMW0JsYWNrXTtgO1xyXG4gIGxldCBjb3VudCA9IDA7XHJcbiAgbGV0IHByZXYgPSAnJztcclxuICBzdGVwcy5mb3JFYWNoKChzdGVwOiBhbnksIGluZGV4OiBhbnkpID0+IHtcclxuICAgIGlmIChzdGVwWzBdID09PSBwcmV2WzBdKSB7XHJcbiAgICAgIGlmIChzdGVwWzBdID09PSAnQicpIHtcclxuICAgICAgICByZXMuc3BsaWNlKGluZGV4ICsgY291bnQsIDAsICdXW3R0XScpO1xyXG4gICAgICAgIGNvdW50ICs9IDE7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzLnNwbGljZShpbmRleCArIGNvdW50LCAwLCAnQlt0dF0nKTtcclxuICAgICAgICBjb3VudCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBwcmV2ID0gc3RlcDtcclxuICB9KTtcclxuICByZXR1cm4gYCR7aGVhZGVyfSR7cmVzLmpvaW4oJzsnKX0pYDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvZmZzZXRBMU1vdmUgPSAobW92ZTogc3RyaW5nLCBveCA9IDAsIG95ID0gMCkgPT4ge1xyXG4gIGlmIChtb3ZlID09PSAncGFzcycpIHJldHVybiBtb3ZlO1xyXG4gIC8vIGNvbnNvbGUubG9nKCdveHknLCBveCwgb3kpO1xyXG4gIGNvbnN0IGlueCA9IEExX0xFVFRFUlMuaW5kZXhPZihtb3ZlWzBdKSArIG94O1xyXG4gIGNvbnN0IGlueSA9IEExX05VTUJFUlMuaW5kZXhPZihwYXJzZUludChtb3ZlLnN1YnN0cigxKSwgMCkpICsgb3k7XHJcbiAgLy8gY29uc29sZS5sb2coJ2lueHknLCBpbngsIGlueSwgYCR7QTFfTEVUVEVSU1tpbnhdfSR7QTFfTlVNQkVSU1tpbnldfWApO1xyXG4gIHJldHVybiBgJHtBMV9MRVRURVJTW2lueF19JHtBMV9OVU1CRVJTW2lueV19YDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZXZlcnNlT2Zmc2V0QTFNb3ZlID0gKFxyXG4gIG1vdmU6IHN0cmluZyxcclxuICBtYXQ6IG51bWJlcltdW10sXHJcbiAgYW5hbHlzaXM6IEFuYWx5c2lzLFxyXG4gIGJvYXJkU2l6ZSA9IDE5XHJcbikgPT4ge1xyXG4gIGlmIChtb3ZlID09PSAncGFzcycpIHJldHVybiBtb3ZlO1xyXG4gIGNvbnN0IGlkT2JqID0gSlNPTi5wYXJzZShhbmFseXNpcy5pZCk7XHJcbiAgY29uc3Qge3gsIHl9ID0gcmV2ZXJzZU9mZnNldChtYXQsIGlkT2JqLmJ4LCBpZE9iai5ieSwgYm9hcmRTaXplKTtcclxuICBjb25zdCBpbnggPSBBMV9MRVRURVJTLmluZGV4T2YobW92ZVswXSkgKyB4O1xyXG4gIGNvbnN0IGlueSA9IEExX05VTUJFUlMuaW5kZXhPZihwYXJzZUludChtb3ZlLnN1YnN0cigxKSwgMCkpICsgeTtcclxuICByZXR1cm4gYCR7QTFfTEVUVEVSU1tpbnhdfSR7QTFfTlVNQkVSU1tpbnldfWA7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY1Njb3JlRGlmZlRleHQgPSAoXHJcbiAgcm9vdEluZm8/OiBSb290SW5mbyB8IG51bGwsXHJcbiAgY3VyckluZm8/OiBNb3ZlSW5mbyB8IFJvb3RJbmZvIHwgbnVsbCxcclxuICBmaXhlZCA9IDEsXHJcbiAgcmV2ZXJzZSA9IGZhbHNlXHJcbikgPT4ge1xyXG4gIGlmICghcm9vdEluZm8gfHwgIWN1cnJJbmZvKSByZXR1cm4gJyc7XHJcbiAgbGV0IHNjb3JlID0gY2FsY1Njb3JlRGlmZihyb290SW5mbywgY3VyckluZm8pO1xyXG4gIGlmIChyZXZlcnNlKSBzY29yZSA9IC1zY29yZTtcclxuICBjb25zdCBmaXhlZFNjb3JlID0gc2NvcmUudG9GaXhlZChmaXhlZCk7XHJcblxyXG4gIHJldHVybiBzY29yZSA+IDAgPyBgKyR7Zml4ZWRTY29yZX1gIDogYCR7Zml4ZWRTY29yZX1gO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGNXaW5yYXRlRGlmZlRleHQgPSAoXHJcbiAgcm9vdEluZm8/OiBSb290SW5mbyB8IG51bGwsXHJcbiAgY3VyckluZm8/OiBNb3ZlSW5mbyB8IFJvb3RJbmZvIHwgbnVsbCxcclxuICBmaXhlZCA9IDEsXHJcbiAgcmV2ZXJzZSA9IGZhbHNlXHJcbikgPT4ge1xyXG4gIGlmICghcm9vdEluZm8gfHwgIWN1cnJJbmZvKSByZXR1cm4gJyc7XHJcbiAgbGV0IHdpbnJhdGUgPSBjYWxjV2lucmF0ZURpZmYocm9vdEluZm8sIGN1cnJJbmZvKTtcclxuICBpZiAocmV2ZXJzZSkgd2lucmF0ZSA9IC13aW5yYXRlO1xyXG4gIGNvbnN0IGZpeGVkV2lucmF0ZSA9IHdpbnJhdGUudG9GaXhlZChmaXhlZCk7XHJcblxyXG4gIHJldHVybiB3aW5yYXRlID49IDAgPyBgKyR7Zml4ZWRXaW5yYXRlfSVgIDogYCR7Zml4ZWRXaW5yYXRlfSVgO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGNTY29yZURpZmYgPSAoXHJcbiAgcm9vdEluZm86IFJvb3RJbmZvLFxyXG4gIGN1cnJJbmZvOiBNb3ZlSW5mbyB8IFJvb3RJbmZvXHJcbikgPT4ge1xyXG4gIGNvbnN0IHNpZ24gPSByb290SW5mby5jdXJyZW50UGxheWVyID09PSAnQicgPyAxIDogLTE7XHJcbiAgY29uc3Qgc2NvcmUgPVxyXG4gICAgTWF0aC5yb3VuZCgoY3VyckluZm8uc2NvcmVMZWFkIC0gcm9vdEluZm8uc2NvcmVMZWFkKSAqIHNpZ24gKiAxMDAwKSAvIDEwMDA7XHJcblxyXG4gIHJldHVybiBzY29yZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjV2lucmF0ZURpZmYgPSAoXHJcbiAgcm9vdEluZm86IFJvb3RJbmZvLFxyXG4gIGN1cnJJbmZvOiBNb3ZlSW5mbyB8IFJvb3RJbmZvXHJcbikgPT4ge1xyXG4gIGNvbnN0IHNpZ24gPSByb290SW5mby5jdXJyZW50UGxheWVyID09PSAnQicgPyAxIDogLTE7XHJcbiAgY29uc3Qgc2NvcmUgPVxyXG4gICAgTWF0aC5yb3VuZCgoY3VyckluZm8ud2lucmF0ZSAtIHJvb3RJbmZvLndpbnJhdGUpICogc2lnbiAqIDEwMDAgKiAxMDApIC9cclxuICAgIDEwMDA7XHJcblxyXG4gIHJldHVybiBzY29yZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjQW5hbHlzaXNQb2ludENvbG9yID0gKFxyXG4gIHJvb3RJbmZvOiBSb290SW5mbyxcclxuICBtb3ZlSW5mbzogTW92ZUluZm9cclxuKSA9PiB7XHJcbiAgY29uc3Qge3ByaW9yLCBvcmRlcn0gPSBtb3ZlSW5mbztcclxuICBjb25zdCBzY29yZSA9IGNhbGNTY29yZURpZmYocm9vdEluZm8sIG1vdmVJbmZvKTtcclxuICBsZXQgcG9pbnRDb2xvciA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSknO1xyXG4gIGlmIChcclxuICAgIHByaW9yID49IDAuNSB8fFxyXG4gICAgKHByaW9yID49IDAuMSAmJiBvcmRlciA8IDMgJiYgc2NvcmUgPiAtMC4zKSB8fFxyXG4gICAgb3JkZXIgPT09IDAgfHxcclxuICAgIHNjb3JlID49IDBcclxuICApIHtcclxuICAgIHBvaW50Q29sb3IgPSBMSUdIVF9HUkVFTl9SR0I7XHJcbiAgfSBlbHNlIGlmICgocHJpb3IgPiAwLjA1ICYmIHNjb3JlID4gLTAuNSkgfHwgKHByaW9yID4gMC4wMSAmJiBzY29yZSA+IC0wLjEpKSB7XHJcbiAgICBwb2ludENvbG9yID0gTElHSFRfWUVMTE9XX1JHQjtcclxuICB9IGVsc2UgaWYgKHByaW9yID4gMC4wMSAmJiBzY29yZSA+IC0xKSB7XHJcbiAgICBwb2ludENvbG9yID0gWUVMTE9XX1JHQjtcclxuICB9IGVsc2Uge1xyXG4gICAgcG9pbnRDb2xvciA9IExJR0hUX1JFRF9SR0I7XHJcbiAgfVxyXG4gIHJldHVybiBwb2ludENvbG9yO1xyXG59O1xyXG5cclxuLy8gZXhwb3J0IGNvbnN0IEdvQmFuRGV0ZWN0aW9uID0gKHBpeGVsRGF0YSwgY2FudmFzKSA9PiB7XHJcbi8vIGNvbnN0IGNvbHVtbnMgPSBjYW52YXMud2lkdGg7XHJcbi8vIGNvbnN0IHJvd3MgPSBjYW52YXMuaGVpZ2h0O1xyXG4vLyBjb25zdCBkYXRhVHlwZSA9IEpzRmVhdC5VOEMxX3Q7XHJcbi8vIGNvbnN0IGRpc3RNYXRyaXhUID0gbmV3IEpzRmVhdC5tYXRyaXhfdChjb2x1bW5zLCByb3dzLCBkYXRhVHlwZSk7XHJcbi8vIEpzRmVhdC5pbWdwcm9jLmdyYXlzY2FsZShwaXhlbERhdGEsIGNvbHVtbnMsIHJvd3MsIGRpc3RNYXRyaXhUKTtcclxuLy8gSnNGZWF0LmltZ3Byb2MuZ2F1c3NpYW5fYmx1cihkaXN0TWF0cml4VCwgZGlzdE1hdHJpeFQsIDIsIDApO1xyXG4vLyBKc0ZlYXQuaW1ncHJvYy5jYW5ueShkaXN0TWF0cml4VCwgZGlzdE1hdHJpeFQsIDUwLCA1MCk7XHJcblxyXG4vLyBjb25zdCBuZXdQaXhlbERhdGEgPSBuZXcgVWludDMyQXJyYXkocGl4ZWxEYXRhLmJ1ZmZlcik7XHJcbi8vIGNvbnN0IGFscGhhID0gKDB4ZmYgPDwgMjQpO1xyXG4vLyBsZXQgaSA9IGRpc3RNYXRyaXhULmNvbHMgKiBkaXN0TWF0cml4VC5yb3dzO1xyXG4vLyBsZXQgcGl4ID0gMDtcclxuLy8gd2hpbGUgKGkgPj0gMCkge1xyXG4vLyAgIHBpeCA9IGRpc3RNYXRyaXhULmRhdGFbaV07XHJcbi8vICAgbmV3UGl4ZWxEYXRhW2ldID0gYWxwaGEgfCAocGl4IDw8IDE2KSB8IChwaXggPDwgOCkgfCBwaXg7XHJcbi8vICAgaSAtPSAxO1xyXG4vLyB9XHJcbi8vIH07XHJcblxyXG5leHBvcnQgY29uc3QgZXh0cmFjdFBBSSA9IChuOiBUTm9kZSkgPT4ge1xyXG4gIGNvbnN0IHBhaSA9IG4ubW9kZWwuY3VzdG9tUHJvcHMuZmluZCgocDogQ3VzdG9tUHJvcCkgPT4gcC50b2tlbiA9PT0gJ1BBSScpO1xyXG4gIGlmICghcGFpKSByZXR1cm47XHJcbiAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocGFpLnZhbHVlKTtcclxuXHJcbiAgcmV0dXJuIGRhdGE7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZXh0cmFjdEFuc3dlclR5cGUgPSAobjogVE5vZGUpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xyXG4gIGNvbnN0IHBhdCA9IG4ubW9kZWwuY3VzdG9tUHJvcHMuZmluZCgocDogQ3VzdG9tUHJvcCkgPT4gcC50b2tlbiA9PT0gJ1BBVCcpO1xyXG4gIHJldHVybiBwYXQ/LnZhbHVlO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGV4dHJhY3RQSSA9IChuOiBUTm9kZSkgPT4ge1xyXG4gIGNvbnN0IHBpID0gbi5tb2RlbC5jdXN0b21Qcm9wcy5maW5kKChwOiBDdXN0b21Qcm9wKSA9PiBwLnRva2VuID09PSAnUEknKTtcclxuICBpZiAoIXBpKSByZXR1cm47XHJcbiAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocGkudmFsdWUpO1xyXG5cclxuICByZXR1cm4gZGF0YTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpbml0Tm9kZURhdGEgPSAoc2hhOiBzdHJpbmcsIG51bWJlcj86IG51bWJlcik6IFNnZk5vZGUgPT4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogc2hhLFxyXG4gICAgbmFtZTogc2hhLFxyXG4gICAgbnVtYmVyOiBudW1iZXIgfHwgMCxcclxuICAgIHJvb3RQcm9wczogW10sXHJcbiAgICBtb3ZlUHJvcHM6IFtdLFxyXG4gICAgc2V0dXBQcm9wczogW10sXHJcbiAgICBtYXJrdXBQcm9wczogW10sXHJcbiAgICBnYW1lSW5mb1Byb3BzOiBbXSxcclxuICAgIG5vZGVBbm5vdGF0aW9uUHJvcHM6IFtdLFxyXG4gICAgbW92ZUFubm90YXRpb25Qcm9wczogW10sXHJcbiAgICBjdXN0b21Qcm9wczogW10sXHJcbiAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIHRoZSBpbml0aWFsIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZS5cclxuICpcclxuICogQHBhcmFtIHJvb3RQcm9wcyAtIFRoZSByb290IHByb3BlcnRpZXMuXHJcbiAqIEByZXR1cm5zIFRoZSBpbml0aWFsIHJvb3Qgbm9kZS5cclxuICovXHJcbmV4cG9ydCBjb25zdCBpbml0aWFsUm9vdE5vZGUgPSAoXHJcbiAgcm9vdFByb3BzID0gW1xyXG4gICAgJ0ZGWzRdJyxcclxuICAgICdHTVsxXScsXHJcbiAgICAnQ0FbVVRGLThdJyxcclxuICAgICdBUFtnaG9zdGdvOjAuMS4wXScsXHJcbiAgICAnU1pbMTldJyxcclxuICAgICdTVFswXScsXHJcbiAgXVxyXG4pID0+IHtcclxuICBjb25zdCB0cmVlID0gbmV3IFRyZWVNb2RlbCgpO1xyXG4gIGNvbnN0IHJvb3QgPSB0cmVlLnBhcnNlKHtcclxuICAgIC8vICcxYjE2YjEnIGlzIHRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgJ24nXHJcbiAgICBpZDogJycsXHJcbiAgICBuYW1lOiAnJyxcclxuICAgIGluZGV4OiAwLFxyXG4gICAgbnVtYmVyOiAwLFxyXG4gICAgcm9vdFByb3BzOiByb290UHJvcHMubWFwKHAgPT4gUm9vdFByb3AuZnJvbShwKSksXHJcbiAgICBtb3ZlUHJvcHM6IFtdLFxyXG4gICAgc2V0dXBQcm9wczogW10sXHJcbiAgICBtYXJrdXBQcm9wczogW10sXHJcbiAgICBnYW1lSW5mb1Byb3BzOiBbXSxcclxuICAgIG5vZGVBbm5vdGF0aW9uUHJvcHM6IFtdLFxyXG4gICAgbW92ZUFubm90YXRpb25Qcm9wczogW10sXHJcbiAgICBjdXN0b21Qcm9wczogW10sXHJcbiAgfSk7XHJcbiAgY29uc3QgaGFzaCA9IGNhbGNIYXNoKHJvb3QpO1xyXG4gIHJvb3QubW9kZWwuaWQgPSBoYXNoO1xyXG5cclxuICByZXR1cm4gcm9vdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBuZXcgdHJlZSBub2RlIHdpdGggdGhlIGdpdmVuIG1vdmUsIHBhcmVudCBub2RlLCBhbmQgYWRkaXRpb25hbCBwcm9wZXJ0aWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0gbW92ZSAtIFRoZSBtb3ZlIHRvIGJlIGFkZGVkIHRvIHRoZSBub2RlLlxyXG4gKiBAcGFyYW0gcGFyZW50Tm9kZSAtIFRoZSBwYXJlbnQgbm9kZSBvZiB0aGUgbmV3IG5vZGUuIE9wdGlvbmFsLlxyXG4gKiBAcGFyYW0gcHJvcHMgLSBBZGRpdGlvbmFsIHByb3BlcnRpZXMgdG8gYmUgYWRkZWQgdG8gdGhlIG5ldyBub2RlLiBPcHRpb25hbC5cclxuICogQHJldHVybnMgVGhlIG5ld2x5IGNyZWF0ZWQgdHJlZSBub2RlLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGJ1aWxkTW92ZU5vZGUgPSAoXHJcbiAgbW92ZTogc3RyaW5nLFxyXG4gIHBhcmVudE5vZGU/OiBUTm9kZSxcclxuICBwcm9wcz86IFNnZk5vZGVPcHRpb25zXHJcbikgPT4ge1xyXG4gIGNvbnN0IHRyZWUgPSBuZXcgVHJlZU1vZGVsKCk7XHJcbiAgY29uc3QgbW92ZVByb3AgPSBNb3ZlUHJvcC5mcm9tKG1vdmUpO1xyXG4gIGNvbnN0IGhhc2ggPSBjYWxjSGFzaChwYXJlbnROb2RlLCBbbW92ZVByb3BdKTtcclxuICBsZXQgbnVtYmVyID0gMTtcclxuICBpZiAocGFyZW50Tm9kZSkgbnVtYmVyID0gZ2V0Tm9kZU51bWJlcihwYXJlbnROb2RlKSArIDE7XHJcbiAgY29uc3Qgbm9kZURhdGEgPSBpbml0Tm9kZURhdGEoaGFzaCwgbnVtYmVyKTtcclxuICBub2RlRGF0YS5tb3ZlUHJvcHMgPSBbbW92ZVByb3BdO1xyXG5cclxuICBjb25zdCBub2RlID0gdHJlZS5wYXJzZSh7XHJcbiAgICAuLi5ub2RlRGF0YSxcclxuICAgIC4uLnByb3BzLFxyXG4gIH0pO1xyXG4gIHJldHVybiBub2RlO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldExhc3RJbmRleCA9IChyb290OiBUTm9kZSkgPT4ge1xyXG4gIGxldCBsYXN0Tm9kZSA9IHJvb3Q7XHJcbiAgcm9vdC53YWxrKG5vZGUgPT4ge1xyXG4gICAgLy8gSGFsdCB0aGUgdHJhdmVyc2FsIGJ5IHJldHVybmluZyBmYWxzZVxyXG4gICAgbGFzdE5vZGUgPSBub2RlO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGxhc3ROb2RlLm1vZGVsLmluZGV4O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGN1dE1vdmVOb2RlcyA9IChyb290OiBUTm9kZSwgcmV0dXJuUm9vdD86IGJvb2xlYW4pID0+IHtcclxuICBsZXQgbm9kZSA9IGNsb25lRGVlcChyb290KTtcclxuICB3aGlsZSAobm9kZSAmJiBub2RlLmhhc0NoaWxkcmVuKCkgJiYgbm9kZS5tb2RlbC5tb3ZlUHJvcHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICBub2RlID0gbm9kZS5jaGlsZHJlblswXTtcclxuICAgIG5vZGUuY2hpbGRyZW4gPSBbXTtcclxuICB9XHJcblxyXG4gIGlmIChyZXR1cm5Sb290KSB7XHJcbiAgICB3aGlsZSAobm9kZSAmJiBub2RlLnBhcmVudCAmJiAhbm9kZS5pc1Jvb3QoKSkge1xyXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbm9kZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRSb290ID0gKG5vZGU6IFROb2RlKSA9PiB7XHJcbiAgbGV0IHJvb3QgPSBub2RlO1xyXG4gIHdoaWxlIChyb290ICYmIHJvb3QucGFyZW50ICYmICFyb290LmlzUm9vdCgpKSB7XHJcbiAgICByb290ID0gcm9vdC5wYXJlbnQ7XHJcbiAgfVxyXG4gIHJldHVybiByb290O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHplcm9zID0gKHNpemU6IFtudW1iZXIsIG51bWJlcl0pOiBudW1iZXJbXVtdID0+XHJcbiAgbmV3IEFycmF5KHNpemVbMF0pLmZpbGwoMCkubWFwKCgpID0+IG5ldyBBcnJheShzaXplWzFdKS5maWxsKDApKTtcclxuXHJcbmV4cG9ydCBjb25zdCBlbXB0eSA9IChzaXplOiBbbnVtYmVyLCBudW1iZXJdKTogc3RyaW5nW11bXSA9PlxyXG4gIG5ldyBBcnJheShzaXplWzBdKS5maWxsKCcnKS5tYXAoKCkgPT4gbmV3IEFycmF5KHNpemVbMV0pLmZpbGwoJycpKTtcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjTW9zdCA9IChtYXQ6IG51bWJlcltdW10sIGJvYXJkU2l6ZSA9IDE5KSA9PiB7XHJcbiAgbGV0IGxlZnRNb3N0OiBudW1iZXIgPSBib2FyZFNpemUgLSAxO1xyXG4gIGxldCByaWdodE1vc3QgPSAwO1xyXG4gIGxldCB0b3BNb3N0OiBudW1iZXIgPSBib2FyZFNpemUgLSAxO1xyXG4gIGxldCBib3R0b21Nb3N0ID0gMDtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdC5sZW5ndGg7IGkrKykge1xyXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBtYXRbaV0ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgY29uc3QgdmFsdWUgPSBtYXRbaV1bal07XHJcbiAgICAgIGlmICh2YWx1ZSAhPT0gMCkge1xyXG4gICAgICAgIGlmIChsZWZ0TW9zdCA+IGkpIGxlZnRNb3N0ID0gaTtcclxuICAgICAgICBpZiAocmlnaHRNb3N0IDwgaSkgcmlnaHRNb3N0ID0gaTtcclxuICAgICAgICBpZiAodG9wTW9zdCA+IGopIHRvcE1vc3QgPSBqO1xyXG4gICAgICAgIGlmIChib3R0b21Nb3N0IDwgaikgYm90dG9tTW9zdCA9IGo7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHtsZWZ0TW9zdCwgcmlnaHRNb3N0LCB0b3BNb3N0LCBib3R0b21Nb3N0fTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjYWxjQ2VudGVyID0gKG1hdDogbnVtYmVyW11bXSwgYm9hcmRTaXplID0gMTkpID0+IHtcclxuICBjb25zdCB7bGVmdE1vc3QsIHJpZ2h0TW9zdCwgdG9wTW9zdCwgYm90dG9tTW9zdH0gPSBjYWxjTW9zdChtYXQsIGJvYXJkU2l6ZSk7XHJcbiAgY29uc3QgdG9wID0gdG9wTW9zdCA8IGJvYXJkU2l6ZSAtIDEgLSBib3R0b21Nb3N0O1xyXG4gIGNvbnN0IGxlZnQgPSBsZWZ0TW9zdCA8IGJvYXJkU2l6ZSAtIDEgLSByaWdodE1vc3Q7XHJcbiAgaWYgKHRvcCAmJiBsZWZ0KSByZXR1cm4gQ2VudGVyLlRvcExlZnQ7XHJcbiAgaWYgKCF0b3AgJiYgbGVmdCkgcmV0dXJuIENlbnRlci5Cb3R0b21MZWZ0O1xyXG4gIGlmICh0b3AgJiYgIWxlZnQpIHJldHVybiBDZW50ZXIuVG9wUmlnaHQ7XHJcbiAgaWYgKCF0b3AgJiYgIWxlZnQpIHJldHVybiBDZW50ZXIuQm90dG9tUmlnaHQ7XHJcbiAgcmV0dXJuIENlbnRlci5DZW50ZXI7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY0JvYXJkU2l6ZSA9IChcclxuICBtYXQ6IG51bWJlcltdW10sXHJcbiAgYm9hcmRTaXplID0gMTksXHJcbiAgZXh0ZW50ID0gMlxyXG4pOiBudW1iZXJbXSA9PiB7XHJcbiAgY29uc3QgcmVzdWx0ID0gWzE5LCAxOV07XHJcbiAgY29uc3QgY2VudGVyID0gY2FsY0NlbnRlcihtYXQpO1xyXG4gIGNvbnN0IHtsZWZ0TW9zdCwgcmlnaHRNb3N0LCB0b3BNb3N0LCBib3R0b21Nb3N0fSA9IGNhbGNNb3N0KG1hdCwgYm9hcmRTaXplKTtcclxuICBpZiAoY2VudGVyID09PSBDZW50ZXIuVG9wTGVmdCkge1xyXG4gICAgcmVzdWx0WzBdID0gcmlnaHRNb3N0ICsgZXh0ZW50ICsgMTtcclxuICAgIHJlc3VsdFsxXSA9IGJvdHRvbU1vc3QgKyBleHRlbnQgKyAxO1xyXG4gIH1cclxuICBpZiAoY2VudGVyID09PSBDZW50ZXIuVG9wUmlnaHQpIHtcclxuICAgIHJlc3VsdFswXSA9IGJvYXJkU2l6ZSAtIGxlZnRNb3N0ICsgZXh0ZW50O1xyXG4gICAgcmVzdWx0WzFdID0gYm90dG9tTW9zdCArIGV4dGVudCArIDE7XHJcbiAgfVxyXG4gIGlmIChjZW50ZXIgPT09IENlbnRlci5Cb3R0b21MZWZ0KSB7XHJcbiAgICByZXN1bHRbMF0gPSByaWdodE1vc3QgKyBleHRlbnQgKyAxO1xyXG4gICAgcmVzdWx0WzFdID0gYm9hcmRTaXplIC0gdG9wTW9zdCArIGV4dGVudDtcclxuICB9XHJcbiAgaWYgKGNlbnRlciA9PT0gQ2VudGVyLkJvdHRvbVJpZ2h0KSB7XHJcbiAgICByZXN1bHRbMF0gPSBib2FyZFNpemUgLSBsZWZ0TW9zdCArIGV4dGVudDtcclxuICAgIHJlc3VsdFsxXSA9IGJvYXJkU2l6ZSAtIHRvcE1vc3QgKyBleHRlbnQ7XHJcbiAgfVxyXG4gIHJlc3VsdFswXSA9IE1hdGgubWluKHJlc3VsdFswXSwgYm9hcmRTaXplKTtcclxuICByZXN1bHRbMV0gPSBNYXRoLm1pbihyZXN1bHRbMV0sIGJvYXJkU2l6ZSk7XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY1BhcnRpYWxBcmVhID0gKFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICBleHRlbnQgPSAyLFxyXG4gIGJvYXJkU2l6ZSA9IDE5XHJcbik6IFtbbnVtYmVyLCBudW1iZXJdLCBbbnVtYmVyLCBudW1iZXJdXSA9PiB7XHJcbiAgY29uc3Qge2xlZnRNb3N0LCByaWdodE1vc3QsIHRvcE1vc3QsIGJvdHRvbU1vc3R9ID0gY2FsY01vc3QobWF0KTtcclxuXHJcbiAgY29uc3Qgc2l6ZSA9IGJvYXJkU2l6ZSAtIDE7XHJcbiAgY29uc3QgeDEgPSBsZWZ0TW9zdCAtIGV4dGVudCA8IDAgPyAwIDogbGVmdE1vc3QgLSBleHRlbnQ7XHJcbiAgY29uc3QgeTEgPSB0b3BNb3N0IC0gZXh0ZW50IDwgMCA/IDAgOiB0b3BNb3N0IC0gZXh0ZW50O1xyXG4gIGNvbnN0IHgyID0gcmlnaHRNb3N0ICsgZXh0ZW50ID4gc2l6ZSA/IHNpemUgOiByaWdodE1vc3QgKyBleHRlbnQ7XHJcbiAgY29uc3QgeTIgPSBib3R0b21Nb3N0ICsgZXh0ZW50ID4gc2l6ZSA/IHNpemUgOiBib3R0b21Nb3N0ICsgZXh0ZW50O1xyXG5cclxuICByZXR1cm4gW1xyXG4gICAgW3gxLCB5MV0sXHJcbiAgICBbeDIsIHkyXSxcclxuICBdO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGNBdm9pZE1vdmVzRm9yUGFydGlhbEFuYWx5c2lzID0gKFxyXG4gIHBhcnRpYWxBcmVhOiBbW251bWJlciwgbnVtYmVyXSwgW251bWJlciwgbnVtYmVyXV0sXHJcbiAgYm9hcmRTaXplID0gMTlcclxuKSA9PiB7XHJcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBjb25zdCBbW3gxLCB5MV0sIFt4MiwgeTJdXSA9IHBhcnRpYWxBcmVhO1xyXG5cclxuICBmb3IgKGNvbnN0IGNvbCBvZiBBMV9MRVRURVJTLnNsaWNlKDAsIGJvYXJkU2l6ZSkpIHtcclxuICAgIGZvciAoY29uc3Qgcm93IG9mIEExX05VTUJFUlMuc2xpY2UoLWJvYXJkU2l6ZSkpIHtcclxuICAgICAgY29uc3QgeCA9IEExX0xFVFRFUlMuaW5kZXhPZihjb2wpO1xyXG4gICAgICBjb25zdCB5ID0gQTFfTlVNQkVSUy5pbmRleE9mKHJvdyk7XHJcblxyXG4gICAgICBpZiAoeCA8IHgxIHx8IHggPiB4MiB8fCB5IDwgeTEgfHwgeSA+IHkyKSB7XHJcbiAgICAgICAgcmVzdWx0LnB1c2goYCR7Y29sfSR7cm93fWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNhbGNUc3VtZWdvRnJhbWUgPSAoXHJcbiAgbWF0OiBudW1iZXJbXVtdLFxyXG4gIGV4dGVudDogbnVtYmVyLFxyXG4gIGJvYXJkU2l6ZSA9IDE5LFxyXG4gIGtvbWkgPSA3LjUsXHJcbiAgdHVybjogS2kgPSBLaS5CbGFjayxcclxuICBrbyA9IGZhbHNlXHJcbik6IG51bWJlcltdW10gPT4ge1xyXG4gIGNvbnN0IHJlc3VsdCA9IGNsb25lRGVlcChtYXQpO1xyXG4gIGNvbnN0IHBhcnRpYWxBcmVhID0gY2FsY1BhcnRpYWxBcmVhKG1hdCwgZXh0ZW50LCBib2FyZFNpemUpO1xyXG4gIGNvbnN0IGNlbnRlciA9IGNhbGNDZW50ZXIobWF0KTtcclxuICBjb25zdCBwdXRCb3JkZXIgPSAobWF0OiBudW1iZXJbXVtdKSA9PiB7XHJcbiAgICBjb25zdCBbeDEsIHkxXSA9IHBhcnRpYWxBcmVhWzBdO1xyXG4gICAgY29uc3QgW3gyLCB5Ml0gPSBwYXJ0aWFsQXJlYVsxXTtcclxuICAgIGZvciAobGV0IGkgPSB4MTsgaSA8PSB4MjsgaSsrKSB7XHJcbiAgICAgIGZvciAobGV0IGogPSB5MTsgaiA8PSB5MjsgaisrKSB7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgY2VudGVyID09PSBDZW50ZXIuVG9wTGVmdCAmJlxyXG4gICAgICAgICAgKChpID09PSB4MiAmJiBpIDwgYm9hcmRTaXplIC0gMSkgfHxcclxuICAgICAgICAgICAgKGogPT09IHkyICYmIGogPCBib2FyZFNpemUgLSAxKSB8fFxyXG4gICAgICAgICAgICAoaSA9PT0geDEgJiYgaSA+IDApIHx8XHJcbiAgICAgICAgICAgIChqID09PSB5MSAmJiBqID4gMCkpXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBtYXRbaV1bal0gPSB0dXJuO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Ub3BSaWdodCAmJlxyXG4gICAgICAgICAgKChpID09PSB4MSAmJiBpID4gMCkgfHxcclxuICAgICAgICAgICAgKGogPT09IHkyICYmIGogPCBib2FyZFNpemUgLSAxKSB8fFxyXG4gICAgICAgICAgICAoaSA9PT0geDIgJiYgaSA8IGJvYXJkU2l6ZSAtIDEpIHx8XHJcbiAgICAgICAgICAgIChqID09PSB5MSAmJiBqID4gMCkpXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBtYXRbaV1bal0gPSB0dXJuO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Cb3R0b21MZWZ0ICYmXHJcbiAgICAgICAgICAoKGkgPT09IHgyICYmIGkgPCBib2FyZFNpemUgLSAxKSB8fFxyXG4gICAgICAgICAgICAoaiA9PT0geTEgJiYgaiA+IDApIHx8XHJcbiAgICAgICAgICAgIChpID09PSB4MSAmJiBpID4gMCkgfHxcclxuICAgICAgICAgICAgKGogPT09IHkyICYmIGogPCBib2FyZFNpemUgLSAxKSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgIG1hdFtpXVtqXSA9IHR1cm47XHJcbiAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLkJvdHRvbVJpZ2h0ICYmXHJcbiAgICAgICAgICAoKGkgPT09IHgxICYmIGkgPiAwKSB8fFxyXG4gICAgICAgICAgICAoaiA9PT0geTEgJiYgaiA+IDApIHx8XHJcbiAgICAgICAgICAgIChpID09PSB4MiAmJiBpIDwgYm9hcmRTaXplIC0gMSkgfHxcclxuICAgICAgICAgICAgKGogPT09IHkyICYmIGogPCBib2FyZFNpemUgLSAxKSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgIG1hdFtpXVtqXSA9IHR1cm47XHJcbiAgICAgICAgfSBlbHNlIGlmIChjZW50ZXIgPT09IENlbnRlci5DZW50ZXIpIHtcclxuICAgICAgICAgIG1hdFtpXVtqXSA9IHR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuICBjb25zdCBwdXRPdXRzaWRlID0gKG1hdDogbnVtYmVyW11bXSkgPT4ge1xyXG4gICAgY29uc3Qgb2ZmZW5jZVRvV2luID0gMTA7XHJcbiAgICBjb25zdCBvZmZlbnNlS29taSA9IHR1cm4gKiBrb21pO1xyXG4gICAgY29uc3QgW3gxLCB5MV0gPSBwYXJ0aWFsQXJlYVswXTtcclxuICAgIGNvbnN0IFt4MiwgeTJdID0gcGFydGlhbEFyZWFbMV07XHJcbiAgICAvLyBUT0RPOiBIYXJkIGNvZGUgZm9yIG5vd1xyXG4gICAgLy8gY29uc3QgYmxhY2tUb0F0dGFjayA9IHR1cm4gPT09IEtpLkJsYWNrO1xyXG4gICAgY29uc3QgYmxhY2tUb0F0dGFjayA9IHR1cm4gPT09IEtpLkJsYWNrO1xyXG4gICAgY29uc3QgaXNpemUgPSB4MiAtIHgxO1xyXG4gICAgY29uc3QganNpemUgPSB5MiAtIHkxO1xyXG4gICAgLy8gVE9ETzogMzYxIGlzIGhhcmRjb2RlZFxyXG4gICAgLy8gY29uc3QgZGVmZW5zZUFyZWEgPSBNYXRoLmZsb29yKFxyXG4gICAgLy8gICAoMzYxIC0gaXNpemUgKiBqc2l6ZSAtIG9mZmVuc2VLb21pIC0gb2ZmZW5jZVRvV2luKSAvIDJcclxuICAgIC8vICk7XHJcbiAgICBjb25zdCBkZWZlbnNlQXJlYSA9XHJcbiAgICAgIE1hdGguZmxvb3IoKDM2MSAtIGlzaXplICoganNpemUpIC8gMikgLSBvZmZlbnNlS29taSAtIG9mZmVuY2VUb1dpbjtcclxuXHJcbiAgICAvLyBjb25zdCBkZWZlbnNlQXJlYSA9IDMwO1xyXG5cclxuICAgIC8vIG91dHNpZGUgdGhlIGZyYW1lXHJcbiAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBib2FyZFNpemU7IGkrKykge1xyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvYXJkU2l6ZTsgaisrKSB7XHJcbiAgICAgICAgaWYgKGkgPCB4MSB8fCBpID4geDIgfHwgaiA8IHkxIHx8IGogPiB5Mikge1xyXG4gICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgIGxldCBraSA9IEtpLkVtcHR5O1xyXG4gICAgICAgICAgaWYgKGNlbnRlciA9PT0gQ2VudGVyLlRvcExlZnQgfHwgY2VudGVyID09PSBDZW50ZXIuQm90dG9tTGVmdCkge1xyXG4gICAgICAgICAgICBraSA9IGJsYWNrVG9BdHRhY2sgIT09IGNvdW50IDw9IGRlZmVuc2VBcmVhID8gS2kuV2hpdGUgOiBLaS5CbGFjaztcclxuICAgICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLlRvcFJpZ2h0IHx8XHJcbiAgICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLkJvdHRvbVJpZ2h0XHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAga2kgPSBibGFja1RvQXR0YWNrICE9PSBjb3VudCA8PSBkZWZlbnNlQXJlYSA/IEtpLkJsYWNrIDogS2kuV2hpdGU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoKGkgKyBqKSAlIDIgPT09IDAgJiYgTWF0aC5hYnMoY291bnQgLSBkZWZlbnNlQXJlYSkgPiBib2FyZFNpemUpIHtcclxuICAgICAgICAgICAga2kgPSBLaS5FbXB0eTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBtYXRbaV1bal0gPSBraTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG4gIC8vIFRPRE86XHJcbiAgY29uc3QgcHV0S29UaHJlYXQgPSAobWF0OiBudW1iZXJbXVtdLCBrbzogYm9vbGVhbikgPT4ge307XHJcblxyXG4gIHB1dEJvcmRlcihyZXN1bHQpO1xyXG4gIHB1dE91dHNpZGUocmVzdWx0KTtcclxuXHJcbiAgLy8gY29uc3QgZmxpcFNwZWMgPVxyXG4gIC8vICAgaW1pbiA8IGptaW5cclxuICAvLyAgICAgPyBbZmFsc2UsIGZhbHNlLCB0cnVlXVxyXG4gIC8vICAgICA6IFtuZWVkRmxpcChpbWluLCBpbWF4LCBpc2l6ZSksIG5lZWRGbGlwKGptaW4sIGptYXgsIGpzaXplKSwgZmFsc2VdO1xyXG5cclxuICAvLyBpZiAoZmxpcFNwZWMuaW5jbHVkZXModHJ1ZSkpIHtcclxuICAvLyAgIGNvbnN0IGZsaXBwZWQgPSBmbGlwU3RvbmVzKHN0b25lcywgZmxpcFNwZWMpO1xyXG4gIC8vICAgY29uc3QgZmlsbGVkID0gdHN1bWVnb0ZyYW1lU3RvbmVzKGZsaXBwZWQsIGtvbWksIGJsYWNrVG9QbGF5LCBrbywgbWFyZ2luKTtcclxuICAvLyAgIHJldHVybiBmbGlwU3RvbmVzKGZpbGxlZCwgZmxpcFNwZWMpO1xyXG4gIC8vIH1cclxuXHJcbiAgLy8gY29uc3QgaTAgPSBpbWluIC0gbWFyZ2luO1xyXG4gIC8vIGNvbnN0IGkxID0gaW1heCArIG1hcmdpbjtcclxuICAvLyBjb25zdCBqMCA9IGptaW4gLSBtYXJnaW47XHJcbiAgLy8gY29uc3QgajEgPSBqbWF4ICsgbWFyZ2luO1xyXG4gIC8vIGNvbnN0IGZyYW1lUmFuZ2U6IFJlZ2lvbiA9IFtpMCwgaTEsIGowLCBqMV07XHJcbiAgLy8gY29uc3QgYmxhY2tUb0F0dGFjayA9IGd1ZXNzQmxhY2tUb0F0dGFjayhcclxuICAvLyAgIFt0b3AsIGJvdHRvbSwgbGVmdCwgcmlnaHRdLFxyXG4gIC8vICAgW2lzaXplLCBqc2l6ZV1cclxuICAvLyApO1xyXG5cclxuICAvLyBwdXRCb3JkZXIobWF0LCBbaXNpemUsIGpzaXplXSwgZnJhbWVSYW5nZSwgYmxhY2tUb0F0dGFjayk7XHJcbiAgLy8gcHV0T3V0c2lkZShcclxuICAvLyAgIHN0b25lcyxcclxuICAvLyAgIFtpc2l6ZSwganNpemVdLFxyXG4gIC8vICAgZnJhbWVSYW5nZSxcclxuICAvLyAgIGJsYWNrVG9BdHRhY2ssXHJcbiAgLy8gICBibGFja1RvUGxheSxcclxuICAvLyAgIGtvbWlcclxuICAvLyApO1xyXG4gIC8vIHB1dEtvVGhyZWF0KFxyXG4gIC8vICAgc3RvbmVzLFxyXG4gIC8vICAgW2lzaXplLCBqc2l6ZV0sXHJcbiAgLy8gICBmcmFtZVJhbmdlLFxyXG4gIC8vICAgYmxhY2tUb0F0dGFjayxcclxuICAvLyAgIGJsYWNrVG9QbGF5LFxyXG4gIC8vICAga29cclxuICAvLyApO1xyXG4gIC8vIHJldHVybiBzdG9uZXM7XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY09mZnNldCA9IChtYXQ6IG51bWJlcltdW10pID0+IHtcclxuICBjb25zdCBib2FyZFNpemUgPSBjYWxjQm9hcmRTaXplKG1hdCk7XHJcbiAgY29uc3Qgb3ggPSAxOSAtIGJvYXJkU2l6ZVswXTtcclxuICBjb25zdCBveSA9IDE5IC0gYm9hcmRTaXplWzFdO1xyXG4gIGNvbnN0IGNlbnRlciA9IGNhbGNDZW50ZXIobWF0KTtcclxuXHJcbiAgbGV0IG9veCA9IG94O1xyXG4gIGxldCBvb3kgPSBveTtcclxuICBzd2l0Y2ggKGNlbnRlcikge1xyXG4gICAgY2FzZSBDZW50ZXIuVG9wTGVmdDoge1xyXG4gICAgICBvb3ggPSAwO1xyXG4gICAgICBvb3kgPSBveTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlIENlbnRlci5Ub3BSaWdodDoge1xyXG4gICAgICBvb3ggPSAtb3g7XHJcbiAgICAgIG9veSA9IG95O1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICAgIGNhc2UgQ2VudGVyLkJvdHRvbUxlZnQ6IHtcclxuICAgICAgb294ID0gMDtcclxuICAgICAgb295ID0gMDtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlIENlbnRlci5Cb3R0b21SaWdodDoge1xyXG4gICAgICBvb3ggPSAtb3g7XHJcbiAgICAgIG9veSA9IDA7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4ge3g6IG9veCwgeTogb295fTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZXZlcnNlT2Zmc2V0ID0gKFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICBieCA9IDE5LFxyXG4gIGJ5ID0gMTksXHJcbiAgYm9hcmRTaXplID0gMTlcclxuKSA9PiB7XHJcbiAgY29uc3Qgb3ggPSBib2FyZFNpemUgLSBieDtcclxuICBjb25zdCBveSA9IGJvYXJkU2l6ZSAtIGJ5O1xyXG4gIGNvbnN0IGNlbnRlciA9IGNhbGNDZW50ZXIobWF0KTtcclxuXHJcbiAgbGV0IG9veCA9IG94O1xyXG4gIGxldCBvb3kgPSBveTtcclxuICBzd2l0Y2ggKGNlbnRlcikge1xyXG4gICAgY2FzZSBDZW50ZXIuVG9wTGVmdDoge1xyXG4gICAgICBvb3ggPSAwO1xyXG4gICAgICBvb3kgPSAtb3k7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgY2FzZSBDZW50ZXIuVG9wUmlnaHQ6IHtcclxuICAgICAgb294ID0gb3g7XHJcbiAgICAgIG9veSA9IC1veTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBjYXNlIENlbnRlci5Cb3R0b21MZWZ0OiB7XHJcbiAgICAgIG9veCA9IDA7XHJcbiAgICAgIG9veSA9IDA7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgY2FzZSBDZW50ZXIuQm90dG9tUmlnaHQ6IHtcclxuICAgICAgb294ID0gb3g7XHJcbiAgICAgIG9veSA9IDA7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4ge3g6IG9veCwgeTogb295fTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjVmlzaWJsZUFyZWEoXHJcbiAgbWF0OiBudW1iZXJbXVtdID0gemVyb3MoWzE5LCAxOV0pLFxyXG4gIGV4dGVudDogbnVtYmVyLFxyXG4gIGFsbG93UmVjdGFuZ2xlID0gZmFsc2VcclxuKTogbnVtYmVyW11bXSB7XHJcbiAgbGV0IG1pblJvdyA9IG1hdC5sZW5ndGg7XHJcbiAgbGV0IG1heFJvdyA9IDA7XHJcbiAgbGV0IG1pbkNvbCA9IG1hdFswXS5sZW5ndGg7XHJcbiAgbGV0IG1heENvbCA9IDA7XHJcblxyXG4gIGxldCBlbXB0eSA9IHRydWU7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbWF0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG1hdFswXS5sZW5ndGg7IGorKykge1xyXG4gICAgICBpZiAobWF0W2ldW2pdICE9PSAwKSB7XHJcbiAgICAgICAgZW1wdHkgPSBmYWxzZTtcclxuICAgICAgICBtaW5Sb3cgPSBNYXRoLm1pbihtaW5Sb3csIGkpO1xyXG4gICAgICAgIG1heFJvdyA9IE1hdGgubWF4KG1heFJvdywgaSk7XHJcbiAgICAgICAgbWluQ29sID0gTWF0aC5taW4obWluQ29sLCBqKTtcclxuICAgICAgICBtYXhDb2wgPSBNYXRoLm1heChtYXhDb2wsIGopO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZW1wdHkpIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIFswLCBtYXQubGVuZ3RoIC0gMV0sXHJcbiAgICAgIFswLCBtYXRbMF0ubGVuZ3RoIC0gMV0sXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFhbGxvd1JlY3RhbmdsZSkge1xyXG4gICAgY29uc3QgbWluUm93V2l0aEV4dGVudCA9IE1hdGgubWF4KG1pblJvdyAtIGV4dGVudCwgMCk7XHJcbiAgICBjb25zdCBtYXhSb3dXaXRoRXh0ZW50ID0gTWF0aC5taW4obWF4Um93ICsgZXh0ZW50LCBtYXQubGVuZ3RoIC0gMSk7XHJcbiAgICBjb25zdCBtaW5Db2xXaXRoRXh0ZW50ID0gTWF0aC5tYXgobWluQ29sIC0gZXh0ZW50LCAwKTtcclxuICAgIGNvbnN0IG1heENvbFdpdGhFeHRlbnQgPSBNYXRoLm1pbihtYXhDb2wgKyBleHRlbnQsIG1hdFswXS5sZW5ndGggLSAxKTtcclxuXHJcbiAgICBjb25zdCBtYXhSYW5nZSA9IE1hdGgubWF4KFxyXG4gICAgICBtYXhSb3dXaXRoRXh0ZW50IC0gbWluUm93V2l0aEV4dGVudCxcclxuICAgICAgbWF4Q29sV2l0aEV4dGVudCAtIG1pbkNvbFdpdGhFeHRlbnRcclxuICAgICk7XHJcblxyXG4gICAgbWluUm93ID0gbWluUm93V2l0aEV4dGVudDtcclxuICAgIG1heFJvdyA9IG1pblJvdyArIG1heFJhbmdlO1xyXG5cclxuICAgIGlmIChtYXhSb3cgPj0gbWF0Lmxlbmd0aCkge1xyXG4gICAgICBtYXhSb3cgPSBtYXQubGVuZ3RoIC0gMTtcclxuICAgICAgbWluUm93ID0gbWF4Um93IC0gbWF4UmFuZ2U7XHJcbiAgICB9XHJcblxyXG4gICAgbWluQ29sID0gbWluQ29sV2l0aEV4dGVudDtcclxuICAgIG1heENvbCA9IG1pbkNvbCArIG1heFJhbmdlO1xyXG4gICAgaWYgKG1heENvbCA+PSBtYXRbMF0ubGVuZ3RoKSB7XHJcbiAgICAgIG1heENvbCA9IG1hdFswXS5sZW5ndGggLSAxO1xyXG4gICAgICBtaW5Db2wgPSBtYXhDb2wgLSBtYXhSYW5nZTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgbWluUm93ID0gTWF0aC5tYXgoMCwgbWluUm93IC0gZXh0ZW50KTtcclxuICAgIG1heFJvdyA9IE1hdGgubWluKG1hdC5sZW5ndGggLSAxLCBtYXhSb3cgKyBleHRlbnQpO1xyXG4gICAgbWluQ29sID0gTWF0aC5tYXgoMCwgbWluQ29sIC0gZXh0ZW50KTtcclxuICAgIG1heENvbCA9IE1hdGgubWluKG1hdFswXS5sZW5ndGggLSAxLCBtYXhDb2wgKyBleHRlbnQpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIFtcclxuICAgIFttaW5Sb3csIG1heFJvd10sXHJcbiAgICBbbWluQ29sLCBtYXhDb2xdLFxyXG4gIF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKG1hdDogbnVtYmVyW11bXSwgaTogbnVtYmVyLCBqOiBudW1iZXIsIGtpOiBudW1iZXIpIHtcclxuICBpZiAoaSA8IDAgfHwgaiA8IDApIHJldHVybiBtYXQ7XHJcbiAgY29uc3QgbmV3TWF0ID0gY2xvbmVEZWVwKG1hdCk7XHJcbiAgbmV3TWF0W2ldW2pdID0ga2k7XHJcbiAgcmV0dXJuIGV4ZWNDYXB0dXJlKG5ld01hdCwgaSwgaiwgLWtpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNob3dLaShtYXQ6IG51bWJlcltdW10sIHN0ZXBzOiBzdHJpbmdbXSwgaXNDYXB0dXJlZCA9IHRydWUpIHtcclxuICBsZXQgbmV3TWF0ID0gY2xvbmVEZWVwKG1hdCk7XHJcbiAgbGV0IGhhc01vdmVkID0gZmFsc2U7XHJcbiAgc3RlcHMuZm9yRWFjaChzdHIgPT4ge1xyXG4gICAgY29uc3Qge1xyXG4gICAgICB4LFxyXG4gICAgICB5LFxyXG4gICAgICBraSxcclxuICAgIH06IHtcclxuICAgICAgeDogbnVtYmVyO1xyXG4gICAgICB5OiBudW1iZXI7XHJcbiAgICAgIGtpOiBudW1iZXI7XHJcbiAgICB9ID0gc2dmVG9Qb3Moc3RyKTtcclxuICAgIGlmIChpc0NhcHR1cmVkKSB7XHJcbiAgICAgIGlmIChjYW5Nb3ZlKG5ld01hdCwgeCwgeSwga2kpKSB7XHJcbiAgICAgICAgbmV3TWF0W3hdW3ldID0ga2k7XHJcbiAgICAgICAgbmV3TWF0ID0gZXhlY0NhcHR1cmUobmV3TWF0LCB4LCB5LCAta2kpO1xyXG4gICAgICAgIGhhc01vdmVkID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV3TWF0W3hdW3ldID0ga2k7XHJcbiAgICAgIGhhc01vdmVkID0gdHJ1ZTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGFycmFuZ2VtZW50OiBuZXdNYXQsXHJcbiAgICBoYXNNb3ZlZCxcclxuICB9O1xyXG59XHJcblxyXG4vLyBUT0RPOlxyXG5leHBvcnQgY29uc3QgaGFuZGxlTW92ZSA9IChcclxuICBtYXQ6IG51bWJlcltdW10sXHJcbiAgaTogbnVtYmVyLFxyXG4gIGo6IG51bWJlcixcclxuICB0dXJuOiBLaSxcclxuICBjdXJyZW50Tm9kZTogVE5vZGUsXHJcbiAgb25BZnRlck1vdmU6IChub2RlOiBUTm9kZSwgaXNNb3ZlZDogYm9vbGVhbikgPT4gdm9pZFxyXG4pID0+IHtcclxuICBpZiAodHVybiA9PT0gS2kuRW1wdHkpIHJldHVybjtcclxuICBpZiAoY2FuTW92ZShtYXQsIGksIGosIHR1cm4pKSB7XHJcbiAgICAvLyBkaXNwYXRjaCh1aVNsaWNlLmFjdGlvbnMuc2V0VHVybigtdHVybikpO1xyXG4gICAgY29uc3QgdmFsdWUgPSBTR0ZfTEVUVEVSU1tpXSArIFNHRl9MRVRURVJTW2pdO1xyXG4gICAgY29uc3QgdG9rZW4gPSB0dXJuID09PSBLaS5CbGFjayA/ICdCJyA6ICdXJztcclxuICAgIGNvbnN0IGhhc2ggPSBjYWxjSGFzaChjdXJyZW50Tm9kZSwgW01vdmVQcm9wLmZyb20oYCR7dG9rZW59WyR7dmFsdWV9XWApXSk7XHJcbiAgICBjb25zdCBmaWx0ZXJlZCA9IGN1cnJlbnROb2RlLmNoaWxkcmVuLmZpbHRlcihcclxuICAgICAgKG46IFROb2RlKSA9PiBuLm1vZGVsLmlkID09PSBoYXNoXHJcbiAgICApO1xyXG4gICAgbGV0IG5vZGU6IFROb2RlO1xyXG4gICAgaWYgKGZpbHRlcmVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgbm9kZSA9IGZpbHRlcmVkWzBdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbm9kZSA9IGJ1aWxkTW92ZU5vZGUoYCR7dG9rZW59WyR7dmFsdWV9XWAsIGN1cnJlbnROb2RlKTtcclxuICAgICAgY3VycmVudE5vZGUuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICB9XHJcbiAgICBpZiAob25BZnRlck1vdmUpIG9uQWZ0ZXJNb3ZlKG5vZGUsIHRydWUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBpZiAob25BZnRlck1vdmUpIG9uQWZ0ZXJNb3ZlKGN1cnJlbnROb2RlLCBmYWxzZSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENsZWFyIHN0b25lIGZyb20gdGhlIGN1cnJlbnROb2RlXHJcbiAqIEBwYXJhbSBjdXJyZW50Tm9kZVxyXG4gKiBAcGFyYW0gdmFsdWVcclxuICovXHJcbmV4cG9ydCBjb25zdCBjbGVhclN0b25lRnJvbUN1cnJlbnROb2RlID0gKFxyXG4gIGN1cnJlbnROb2RlOiBUTm9kZSxcclxuICB2YWx1ZTogc3RyaW5nXHJcbikgPT4ge1xyXG4gIGNvbnN0IHBhdGggPSBjdXJyZW50Tm9kZS5nZXRQYXRoKCk7XHJcbiAgcGF0aC5mb3JFYWNoKG5vZGUgPT4ge1xyXG4gICAgY29uc3Qge3NldHVwUHJvcHN9ID0gbm9kZS5tb2RlbDtcclxuICAgIGlmIChzZXR1cFByb3BzLmZpbHRlcigoczogU2V0dXBQcm9wKSA9PiBzLnZhbHVlID09PSB2YWx1ZSkubGVuZ3RoID4gMCkge1xyXG4gICAgICBub2RlLm1vZGVsLnNldHVwUHJvcHMgPSBzZXR1cFByb3BzLmZpbHRlcigoczogYW55KSA9PiBzLnZhbHVlICE9PSB2YWx1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZXR1cFByb3BzLmZvckVhY2goKHM6IFNldHVwUHJvcCkgPT4ge1xyXG4gICAgICAgIHMudmFsdWVzID0gcy52YWx1ZXMuZmlsdGVyKHYgPT4gdiAhPT0gdmFsdWUpO1xyXG4gICAgICAgIGlmIChzLnZhbHVlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIG5vZGUubW9kZWwuc2V0dXBQcm9wcyA9IG5vZGUubW9kZWwuc2V0dXBQcm9wcy5maWx0ZXIoXHJcbiAgICAgICAgICAgIChwOiBTZXR1cFByb3ApID0+IHAudG9rZW4gIT09IHMudG9rZW5cclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgc3RvbmUgdG8gdGhlIGN1cnJlbnQgbm9kZSBpbiB0aGUgdHJlZS5cclxuICpcclxuICogQHBhcmFtIGN1cnJlbnROb2RlIFRoZSBjdXJyZW50IG5vZGUgaW4gdGhlIHRyZWUuXHJcbiAqIEBwYXJhbSBtYXQgVGhlIG1hdHJpeCByZXByZXNlbnRpbmcgdGhlIGJvYXJkLlxyXG4gKiBAcGFyYW0gaSBUaGUgcm93IGluZGV4IG9mIHRoZSBzdG9uZS5cclxuICogQHBhcmFtIGogVGhlIGNvbHVtbiBpbmRleCBvZiB0aGUgc3RvbmUuXHJcbiAqIEBwYXJhbSBraSBUaGUgY29sb3Igb2YgdGhlIHN0b25lIChLaS5XaGl0ZSBvciBLaS5CbGFjaykuXHJcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHN0b25lIHdhcyByZW1vdmVkIGZyb20gcHJldmlvdXMgbm9kZXMsIGZhbHNlIG90aGVyd2lzZS5cclxuICovXHJcbmV4cG9ydCBjb25zdCBhZGRTdG9uZVRvQ3VycmVudE5vZGUgPSAoXHJcbiAgY3VycmVudE5vZGU6IFROb2RlLFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICBpOiBudW1iZXIsXHJcbiAgajogbnVtYmVyLFxyXG4gIGtpOiBLaVxyXG4pID0+IHtcclxuICBjb25zdCB2YWx1ZSA9IFNHRl9MRVRURVJTW2ldICsgU0dGX0xFVFRFUlNbal07XHJcbiAgY29uc3QgdG9rZW4gPSBraSA9PT0gS2kuV2hpdGUgPyAnQVcnIDogJ0FCJztcclxuICBjb25zdCBwcm9wID0gZmluZFByb3AoY3VycmVudE5vZGUsIHRva2VuKTtcclxuICBsZXQgcmVzdWx0ID0gZmFsc2U7XHJcbiAgaWYgKG1hdFtpXVtqXSAhPT0gS2kuRW1wdHkpIHtcclxuICAgIGNsZWFyU3RvbmVGcm9tQ3VycmVudE5vZGUoY3VycmVudE5vZGUsIHZhbHVlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgaWYgKHByb3ApIHtcclxuICAgICAgcHJvcC52YWx1ZXMgPSBbLi4ucHJvcC52YWx1ZXMsIHZhbHVlXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGN1cnJlbnROb2RlLm1vZGVsLnNldHVwUHJvcHMgPSBbXHJcbiAgICAgICAgLi4uY3VycmVudE5vZGUubW9kZWwuc2V0dXBQcm9wcyxcclxuICAgICAgICBuZXcgU2V0dXBQcm9wKHRva2VuLCB2YWx1ZSksXHJcbiAgICAgIF07XHJcbiAgICB9XHJcbiAgICByZXN1bHQgPSB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBtb3ZlIHRvIHRoZSBnaXZlbiBtYXRyaXggYW5kIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgbm9kZSBpbiB0aGUgdHJlZS5cclxuICogSWYgdGhlIGtpIGlzIGVtcHR5LCBubyBtb3ZlIGlzIGFkZGVkIGFuZCBudWxsIGlzIHJldHVybmVkLlxyXG4gKlxyXG4gKiBAcGFyYW0gbWF0IC0gVGhlIG1hdHJpeCByZXByZXNlbnRpbmcgdGhlIGdhbWUgYm9hcmQuXHJcbiAqIEBwYXJhbSBjdXJyZW50Tm9kZSAtIFRoZSBjdXJyZW50IG5vZGUgaW4gdGhlIHRyZWUuXHJcbiAqIEBwYXJhbSBpIC0gVGhlIHJvdyBpbmRleCBvZiB0aGUgbW92ZS5cclxuICogQHBhcmFtIGogLSBUaGUgY29sdW1uIGluZGV4IG9mIHRoZSBtb3ZlLlxyXG4gKiBAcGFyYW0ga2kgLSBUaGUgdHlwZSBvZiBtb3ZlIChLaSkuXHJcbiAqIEByZXR1cm5zIFRoZSBjb3JyZXNwb25kaW5nIG5vZGUgaW4gdGhlIHRyZWUsIG9yIG51bGwgaWYgbm8gbW92ZSBpcyBhZGRlZC5cclxuICovXHJcbi8vIFRPRE86IFRoZSBwYXJhbXMgaGVyZSBpcyB3ZWlyZFxyXG5leHBvcnQgY29uc3QgYWRkTW92ZVRvQ3VycmVudE5vZGUgPSAoXHJcbiAgY3VycmVudE5vZGU6IFROb2RlLFxyXG4gIG1hdDogbnVtYmVyW11bXSxcclxuICBpOiBudW1iZXIsXHJcbiAgajogbnVtYmVyLFxyXG4gIGtpOiBLaVxyXG4pID0+IHtcclxuICBpZiAoa2kgPT09IEtpLkVtcHR5KSByZXR1cm47XHJcblxyXG4gIGNvbnN0IHByZXZpb3VzQm9hcmRTdGF0ZSA9IGN1cnJlbnROb2RlLnBhcmVudFxyXG4gICAgPyBjYWxjTWF0QW5kTWFya3VwKGN1cnJlbnROb2RlLnBhcmVudCkubWF0XHJcbiAgICA6IG51bGw7XHJcblxyXG4gIGxldCBub2RlO1xyXG4gIGlmIChjYW5Nb3ZlKG1hdCwgaSwgaiwga2ksIHByZXZpb3VzQm9hcmRTdGF0ZSkpIHtcclxuICAgIGNvbnN0IHZhbHVlID0gU0dGX0xFVFRFUlNbaV0gKyBTR0ZfTEVUVEVSU1tqXTtcclxuICAgIGNvbnN0IHRva2VuID0ga2kgPT09IEtpLkJsYWNrID8gJ0InIDogJ1cnO1xyXG4gICAgY29uc3QgaGFzaCA9IGNhbGNIYXNoKGN1cnJlbnROb2RlLCBbTW92ZVByb3AuZnJvbShgJHt0b2tlbn1bJHt2YWx1ZX1dYCldKTtcclxuICAgIGNvbnN0IGZpbHRlcmVkID0gY3VycmVudE5vZGUuY2hpbGRyZW4uZmlsdGVyKFxyXG4gICAgICAobjogVE5vZGUpID0+IG4ubW9kZWwuaWQgPT09IGhhc2hcclxuICAgICk7XHJcbiAgICBpZiAoZmlsdGVyZWQubGVuZ3RoID4gMCkge1xyXG4gICAgICBub2RlID0gZmlsdGVyZWRbMF07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBub2RlID0gYnVpbGRNb3ZlTm9kZShgJHt0b2tlbn1bJHt2YWx1ZX1dYCwgY3VycmVudE5vZGUpO1xyXG4gICAgICBjdXJyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG5vZGU7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY1ByZXZlbnRNb3ZlTWF0Rm9yRGlzcGxheU9ubHkgPSAoXHJcbiAgbm9kZTogVE5vZGUsXHJcbiAgZGVmYXVsdEJvYXJkU2l6ZSA9IDE5XHJcbikgPT4ge1xyXG4gIGlmICghbm9kZSkgcmV0dXJuIHplcm9zKFtkZWZhdWx0Qm9hcmRTaXplLCBkZWZhdWx0Qm9hcmRTaXplXSk7XHJcbiAgY29uc3Qgc2l6ZSA9IGV4dHJhY3RCb2FyZFNpemUobm9kZSwgZGVmYXVsdEJvYXJkU2l6ZSk7XHJcbiAgY29uc3QgcHJldmVudE1vdmVNYXQgPSB6ZXJvcyhbc2l6ZSwgc2l6ZV0pO1xyXG5cclxuICBwcmV2ZW50TW92ZU1hdC5mb3JFYWNoKHJvdyA9PiByb3cuZmlsbCgxKSk7XHJcbiAgaWYgKG5vZGUuaGFzQ2hpbGRyZW4oKSkge1xyXG4gICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChuOiBUTm9kZSkgPT4ge1xyXG4gICAgICBuLm1vZGVsLm1vdmVQcm9wcy5mb3JFYWNoKChtOiBNb3ZlUHJvcCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMF0pO1xyXG4gICAgICAgIGNvbnN0IGogPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMV0pO1xyXG4gICAgICAgIGlmIChpID49IDAgJiYgaiA+PSAwICYmIGkgPCBzaXplICYmIGogPCBzaXplKSB7XHJcbiAgICAgICAgICBwcmV2ZW50TW92ZU1hdFtpXVtqXSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuICByZXR1cm4gcHJldmVudE1vdmVNYXQ7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY2FsY1ByZXZlbnRNb3ZlTWF0ID0gKG5vZGU6IFROb2RlLCBkZWZhdWx0Qm9hcmRTaXplID0gMTkpID0+IHtcclxuICBpZiAoIW5vZGUpIHJldHVybiB6ZXJvcyhbZGVmYXVsdEJvYXJkU2l6ZSwgZGVmYXVsdEJvYXJkU2l6ZV0pO1xyXG4gIGNvbnN0IHNpemUgPSBleHRyYWN0Qm9hcmRTaXplKG5vZGUsIGRlZmF1bHRCb2FyZFNpemUpO1xyXG4gIGNvbnN0IHByZXZlbnRNb3ZlTWF0ID0gemVyb3MoW3NpemUsIHNpemVdKTtcclxuICBjb25zdCBmb3JjZU5vZGVzID0gW107XHJcbiAgbGV0IHByZXZlbnRNb3ZlTm9kZXM6IFROb2RlW10gPSBbXTtcclxuICBpZiAobm9kZS5oYXNDaGlsZHJlbigpKSB7XHJcbiAgICBwcmV2ZW50TW92ZU5vZGVzID0gbm9kZS5jaGlsZHJlbi5maWx0ZXIoKG46IFROb2RlKSA9PiBpc1ByZXZlbnRNb3ZlTm9kZShuKSk7XHJcbiAgfVxyXG5cclxuICBpZiAoaXNGb3JjZU5vZGUobm9kZSkpIHtcclxuICAgIHByZXZlbnRNb3ZlTWF0LmZvckVhY2gocm93ID0+IHJvdy5maWxsKDEpKTtcclxuICAgIGlmIChub2RlLmhhc0NoaWxkcmVuKCkpIHtcclxuICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChuOiBUTm9kZSkgPT4ge1xyXG4gICAgICAgIG4ubW9kZWwubW92ZVByb3BzLmZvckVhY2goKG06IE1vdmVQcm9wKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBpID0gU0dGX0xFVFRFUlMuaW5kZXhPZihtLnZhbHVlWzBdKTtcclxuICAgICAgICAgIGNvbnN0IGogPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMV0pO1xyXG4gICAgICAgICAgaWYgKGkgPj0gMCAmJiBqID49IDAgJiYgaSA8IHNpemUgJiYgaiA8IHNpemUpIHtcclxuICAgICAgICAgICAgcHJldmVudE1vdmVNYXRbaV1bal0gPSAwO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByZXZlbnRNb3ZlTm9kZXMuZm9yRWFjaCgobjogVE5vZGUpID0+IHtcclxuICAgIG4ubW9kZWwubW92ZVByb3BzLmZvckVhY2goKG06IE1vdmVQcm9wKSA9PiB7XHJcbiAgICAgIGNvbnN0IGkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMF0pO1xyXG4gICAgICBjb25zdCBqID0gU0dGX0xFVFRFUlMuaW5kZXhPZihtLnZhbHVlWzFdKTtcclxuICAgICAgaWYgKGkgPj0gMCAmJiBqID49IDAgJiYgaSA8IHNpemUgJiYgaiA8IHNpemUpIHtcclxuICAgICAgICBwcmV2ZW50TW92ZU1hdFtpXVtqXSA9IDE7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gcHJldmVudE1vdmVNYXQ7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgbWFya3VwIG1hdHJpeCBmb3IgdmFyaWF0aW9ucyBpbiBhIGdpdmVuIFNHRiBub2RlLlxyXG4gKlxyXG4gKiBAcGFyYW0gbm9kZSAtIFRoZSBTR0Ygbm9kZSB0byBjYWxjdWxhdGUgdGhlIG1hcmt1cCBmb3IuXHJcbiAqIEBwYXJhbSBwb2xpY3kgLSBUaGUgcG9saWN5IGZvciBoYW5kbGluZyB0aGUgbWFya3VwLiBEZWZhdWx0cyB0byAnYXBwZW5kJy5cclxuICogQHJldHVybnMgVGhlIGNhbGN1bGF0ZWQgbWFya3VwIGZvciB0aGUgdmFyaWF0aW9ucy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBjYWxjVmFyaWF0aW9uc01hcmt1cCA9IChcclxuICBub2RlOiBUTm9kZSxcclxuICBwb2xpY3k6ICdhcHBlbmQnIHwgJ3ByZXBlbmQnIHwgJ3JlcGxhY2UnID0gJ2FwcGVuZCcsXHJcbiAgYWN0aXZlSW5kZXg6IG51bWJlciA9IDAsXHJcbiAgZGVmYXVsdEJvYXJkU2l6ZSA9IDE5XHJcbikgPT4ge1xyXG4gIGNvbnN0IHJlcyA9IGNhbGNNYXRBbmRNYXJrdXAobm9kZSk7XHJcbiAgY29uc3Qge21hdCwgbWFya3VwfSA9IHJlcztcclxuICBjb25zdCBzaXplID0gZXh0cmFjdEJvYXJkU2l6ZShub2RlLCBkZWZhdWx0Qm9hcmRTaXplKTtcclxuXHJcbiAgaWYgKG5vZGUuaGFzQ2hpbGRyZW4oKSkge1xyXG4gICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChuOiBUTm9kZSkgPT4ge1xyXG4gICAgICBuLm1vZGVsLm1vdmVQcm9wcy5mb3JFYWNoKChtOiBNb3ZlUHJvcCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMF0pO1xyXG4gICAgICAgIGNvbnN0IGogPSBTR0ZfTEVUVEVSUy5pbmRleE9mKG0udmFsdWVbMV0pO1xyXG4gICAgICAgIGlmIChpIDwgMCB8fCBqIDwgMCkgcmV0dXJuO1xyXG4gICAgICAgIGlmIChpIDwgc2l6ZSAmJiBqIDwgc2l6ZSkge1xyXG4gICAgICAgICAgbGV0IG1hcmsgPSBNYXJrdXAuTmV1dHJhbE5vZGU7XHJcbiAgICAgICAgICBpZiAoaW5Xcm9uZ1BhdGgobikpIHtcclxuICAgICAgICAgICAgbWFyayA9XHJcbiAgICAgICAgICAgICAgbi5nZXRJbmRleCgpID09PSBhY3RpdmVJbmRleFxyXG4gICAgICAgICAgICAgICAgPyBNYXJrdXAuTmVnYXRpdmVBY3RpdmVOb2RlXHJcbiAgICAgICAgICAgICAgICA6IE1hcmt1cC5OZWdhdGl2ZU5vZGU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaW5SaWdodFBhdGgobikpIHtcclxuICAgICAgICAgICAgbWFyayA9XHJcbiAgICAgICAgICAgICAgbi5nZXRJbmRleCgpID09PSBhY3RpdmVJbmRleFxyXG4gICAgICAgICAgICAgICAgPyBNYXJrdXAuUG9zaXRpdmVBY3RpdmVOb2RlXHJcbiAgICAgICAgICAgICAgICA6IE1hcmt1cC5Qb3NpdGl2ZU5vZGU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAobWF0W2ldW2pdID09PSBLaS5FbXB0eSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHBvbGljeSkge1xyXG4gICAgICAgICAgICAgIGNhc2UgJ3ByZXBlbmQnOlxyXG4gICAgICAgICAgICAgICAgbWFya3VwW2ldW2pdID0gbWFyayArICd8JyArIG1hcmt1cFtpXVtqXTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxyXG4gICAgICAgICAgICAgICAgbWFya3VwW2ldW2pdID0gbWFyaztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XHJcbiAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIG1hcmt1cFtpXVtqXSArPSAnfCcgKyBtYXJrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1hcmt1cDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBkZXRlY3RTVCA9IChub2RlOiBUTm9kZSkgPT4ge1xyXG4gIC8vIFJlZmVyZW5jZTogaHR0cHM6Ly93d3cucmVkLWJlYW4uY29tL3NnZi9wcm9wZXJ0aWVzLmh0bWwjU1RcclxuICBjb25zdCByb290ID0gbm9kZS5nZXRQYXRoKClbMF07XHJcbiAgY29uc3Qgc3RQcm9wID0gcm9vdC5tb2RlbC5yb290UHJvcHMuZmluZCgocDogUm9vdFByb3ApID0+IHAudG9rZW4gPT09ICdTVCcpO1xyXG4gIGxldCBzaG93VmFyaWF0aW9uc01hcmt1cCA9IGZhbHNlO1xyXG4gIGxldCBzaG93Q2hpbGRyZW5NYXJrdXAgPSBmYWxzZTtcclxuICBsZXQgc2hvd1NpYmxpbmdzTWFya3VwID0gZmFsc2U7XHJcblxyXG4gIGNvbnN0IHN0ID0gc3RQcm9wPy52YWx1ZSB8fCAnMCc7XHJcbiAgaWYgKHN0KSB7XHJcbiAgICBpZiAoc3QgPT09ICcwJykge1xyXG4gICAgICBzaG93U2libGluZ3NNYXJrdXAgPSBmYWxzZTtcclxuICAgICAgc2hvd0NoaWxkcmVuTWFya3VwID0gdHJ1ZTtcclxuICAgICAgc2hvd1ZhcmlhdGlvbnNNYXJrdXAgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChzdCA9PT0gJzEnKSB7XHJcbiAgICAgIHNob3dTaWJsaW5nc01hcmt1cCA9IHRydWU7XHJcbiAgICAgIHNob3dDaGlsZHJlbk1hcmt1cCA9IGZhbHNlO1xyXG4gICAgICBzaG93VmFyaWF0aW9uc01hcmt1cCA9IHRydWU7XHJcbiAgICB9IGVsc2UgaWYgKHN0ID09PSAnMicpIHtcclxuICAgICAgc2hvd1NpYmxpbmdzTWFya3VwID0gZmFsc2U7XHJcbiAgICAgIHNob3dDaGlsZHJlbk1hcmt1cCA9IHRydWU7XHJcbiAgICAgIHNob3dWYXJpYXRpb25zTWFya3VwID0gZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKHN0ID09PSAnMycpIHtcclxuICAgICAgc2hvd1NpYmxpbmdzTWFya3VwID0gdHJ1ZTtcclxuICAgICAgc2hvd0NoaWxkcmVuTWFya3VwID0gZmFsc2U7XHJcbiAgICAgIHNob3dWYXJpYXRpb25zTWFya3VwID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiB7c2hvd1ZhcmlhdGlvbnNNYXJrdXAsIHNob3dDaGlsZHJlbk1hcmt1cCwgc2hvd1NpYmxpbmdzTWFya3VwfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBtYXQgYW5kIG1hcmt1cCBhcnJheXMgYmFzZWQgb24gdGhlIGN1cnJlbnROb2RlIGFuZCBkZWZhdWx0Qm9hcmRTaXplLlxyXG4gKiBAcGFyYW0gY3VycmVudE5vZGUgVGhlIGN1cnJlbnQgbm9kZSBpbiB0aGUgdHJlZS5cclxuICogQHBhcmFtIGRlZmF1bHRCb2FyZFNpemUgVGhlIGRlZmF1bHQgc2l6ZSBvZiB0aGUgYm9hcmQgKG9wdGlvbmFsLCBkZWZhdWx0IGlzIDE5KS5cclxuICogQHJldHVybnMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hdC92aXNpYmxlQXJlYU1hdC9tYXJrdXAvbnVtTWFya3VwIGFycmF5cy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBjYWxjTWF0QW5kTWFya3VwID0gKGN1cnJlbnROb2RlOiBUTm9kZSwgZGVmYXVsdEJvYXJkU2l6ZSA9IDE5KSA9PiB7XHJcbiAgY29uc3QgcGF0aCA9IGN1cnJlbnROb2RlLmdldFBhdGgoKTtcclxuICBjb25zdCByb290ID0gcGF0aFswXTtcclxuXHJcbiAgbGV0IGxpLCBsajtcclxuICBsZXQgc2V0dXBDb3VudCA9IDA7XHJcbiAgY29uc3Qgc2l6ZSA9IGV4dHJhY3RCb2FyZFNpemUoY3VycmVudE5vZGUsIGRlZmF1bHRCb2FyZFNpemUpO1xyXG4gIGxldCBtYXQgPSB6ZXJvcyhbc2l6ZSwgc2l6ZV0pO1xyXG4gIGNvbnN0IHZpc2libGVBcmVhTWF0ID0gemVyb3MoW3NpemUsIHNpemVdKTtcclxuICBjb25zdCBtYXJrdXAgPSBlbXB0eShbc2l6ZSwgc2l6ZV0pO1xyXG4gIGNvbnN0IG51bU1hcmt1cCA9IGVtcHR5KFtzaXplLCBzaXplXSk7XHJcblxyXG4gIHBhdGguZm9yRWFjaCgobm9kZSwgaW5kZXgpID0+IHtcclxuICAgIGNvbnN0IHttb3ZlUHJvcHMsIHNldHVwUHJvcHMsIHJvb3RQcm9wc30gPSBub2RlLm1vZGVsO1xyXG4gICAgaWYgKHNldHVwUHJvcHMubGVuZ3RoID4gMCkgc2V0dXBDb3VudCArPSAxO1xyXG5cclxuICAgIG1vdmVQcm9wcy5mb3JFYWNoKChtOiBNb3ZlUHJvcCkgPT4ge1xyXG4gICAgICBjb25zdCBpID0gU0dGX0xFVFRFUlMuaW5kZXhPZihtLnZhbHVlWzBdKTtcclxuICAgICAgY29uc3QgaiA9IFNHRl9MRVRURVJTLmluZGV4T2YobS52YWx1ZVsxXSk7XHJcbiAgICAgIGlmIChpIDwgMCB8fCBqIDwgMCkgcmV0dXJuO1xyXG4gICAgICBpZiAoaSA8IHNpemUgJiYgaiA8IHNpemUpIHtcclxuICAgICAgICBsaSA9IGk7XHJcbiAgICAgICAgbGogPSBqO1xyXG4gICAgICAgIG1hdCA9IG1vdmUobWF0LCBpLCBqLCBtLnRva2VuID09PSAnQicgPyBLaS5CbGFjayA6IEtpLldoaXRlKTtcclxuXHJcbiAgICAgICAgaWYgKGxpICE9PSB1bmRlZmluZWQgJiYgbGogIT09IHVuZGVmaW5lZCAmJiBsaSA+PSAwICYmIGxqID49IDApIHtcclxuICAgICAgICAgIG51bU1hcmt1cFtsaV1bbGpdID0gKFxyXG4gICAgICAgICAgICBub2RlLm1vZGVsLm51bWJlciB8fCBpbmRleCAtIHNldHVwQ291bnRcclxuICAgICAgICAgICkudG9TdHJpbmcoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpbmRleCA9PT0gcGF0aC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICBtYXJrdXBbbGldW2xqXSA9IE1hcmt1cC5DdXJyZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0dXAgcHJvcHMgc2hvdWxkIG92ZXJyaWRlIG1vdmUgcHJvcHNcclxuICAgIHNldHVwUHJvcHMuZm9yRWFjaCgoc2V0dXA6IGFueSkgPT4ge1xyXG4gICAgICBzZXR1cC52YWx1ZXMuZm9yRWFjaCgodmFsdWU6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKHZhbHVlWzBdKTtcclxuICAgICAgICBjb25zdCBqID0gU0dGX0xFVFRFUlMuaW5kZXhPZih2YWx1ZVsxXSk7XHJcbiAgICAgICAgaWYgKGkgPCAwIHx8IGogPCAwKSByZXR1cm47XHJcbiAgICAgICAgaWYgKGkgPCBzaXplICYmIGogPCBzaXplKSB7XHJcbiAgICAgICAgICBsaSA9IGk7XHJcbiAgICAgICAgICBsaiA9IGo7XHJcbiAgICAgICAgICBtYXRbaV1bal0gPSBzZXR1cC50b2tlbiA9PT0gJ0FCJyA/IDEgOiAtMTtcclxuICAgICAgICAgIGlmIChzZXR1cC50b2tlbiA9PT0gJ0FFJykgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSWYgdGhlIHJvb3Qgbm9kZSBkb2VzIG5vdCBpbmNsdWRlIGFueSBzZXR1cCBwcm9wZXJ0aWVzXHJcbiAgICAvLyBjaGVjayB3aGV0aGVyIGl0cyBmaXJzdCBjaGlsZCBpcyBhIHNldHVwIG5vZGUgKGkuZS4sIGEgbm9uLW1vdmUgbm9kZSlcclxuICAgIC8vIGFuZCBhcHBseSBpdHMgc2V0dXAgcHJvcGVydGllcyBpbnN0ZWFkXHJcbiAgICBpZiAoc2V0dXBQcm9wcy5sZW5ndGggPT09IDAgJiYgY3VycmVudE5vZGUuaXNSb290KCkpIHtcclxuICAgICAgY29uc3QgZmlyc3RDaGlsZE5vZGUgPSBjdXJyZW50Tm9kZS5jaGlsZHJlblswXTtcclxuICAgICAgaWYgKFxyXG4gICAgICAgIGZpcnN0Q2hpbGROb2RlICYmXHJcbiAgICAgICAgaXNTZXR1cE5vZGUoZmlyc3RDaGlsZE5vZGUpICYmXHJcbiAgICAgICAgIWlzTW92ZU5vZGUoZmlyc3RDaGlsZE5vZGUpXHJcbiAgICAgICkge1xyXG4gICAgICAgIGNvbnN0IHNldHVwUHJvcHMgPSBmaXJzdENoaWxkTm9kZS5tb2RlbC5zZXR1cFByb3BzO1xyXG4gICAgICAgIHNldHVwUHJvcHMuZm9yRWFjaCgoc2V0dXA6IGFueSkgPT4ge1xyXG4gICAgICAgICAgc2V0dXAudmFsdWVzLmZvckVhY2goKHZhbHVlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IFNHRl9MRVRURVJTLmluZGV4T2YodmFsdWVbMF0pO1xyXG4gICAgICAgICAgICBjb25zdCBqID0gU0dGX0xFVFRFUlMuaW5kZXhPZih2YWx1ZVsxXSk7XHJcbiAgICAgICAgICAgIGlmIChpIDwgMCB8fCBqIDwgMCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoaSA8IHNpemUgJiYgaiA8IHNpemUpIHtcclxuICAgICAgICAgICAgICBsaSA9IGk7XHJcbiAgICAgICAgICAgICAgbGogPSBqO1xyXG4gICAgICAgICAgICAgIG1hdFtpXVtqXSA9IHNldHVwLnRva2VuID09PSAnQUInID8gMSA6IC0xO1xyXG4gICAgICAgICAgICAgIGlmIChzZXR1cC50b2tlbiA9PT0gJ0FFJykgbWF0W2ldW2pdID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDbGVhciBudW1iZXIgd2hlbiBzdG9uZXMgYXJlIGNhcHR1cmVkXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHNpemU7IGorKykge1xyXG4gICAgICAgIGlmIChtYXRbaV1bal0gPT09IDApIG51bU1hcmt1cFtpXVtqXSA9ICcnO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIC8vIENhbGN1bGF0aW5nIHRoZSB2aXNpYmxlIGFyZWFcclxuICBpZiAocm9vdCkge1xyXG4gICAgcm9vdC5hbGwoKG5vZGU6IFROb2RlKSA9PiB7XHJcbiAgICAgIGNvbnN0IHttb3ZlUHJvcHMsIHNldHVwUHJvcHMsIHJvb3RQcm9wc30gPSBub2RlLm1vZGVsO1xyXG4gICAgICBpZiAoc2V0dXBQcm9wcy5sZW5ndGggPiAwKSBzZXR1cENvdW50ICs9IDE7XHJcbiAgICAgIHNldHVwUHJvcHMuZm9yRWFjaCgoc2V0dXA6IGFueSkgPT4ge1xyXG4gICAgICAgIHNldHVwLnZhbHVlcy5mb3JFYWNoKCh2YWx1ZTogYW55KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBpID0gU0dGX0xFVFRFUlMuaW5kZXhPZih2YWx1ZVswXSk7XHJcbiAgICAgICAgICBjb25zdCBqID0gU0dGX0xFVFRFUlMuaW5kZXhPZih2YWx1ZVsxXSk7XHJcbiAgICAgICAgICBpZiAoaSA+PSAwICYmIGogPj0gMCAmJiBpIDwgc2l6ZSAmJiBqIDwgc2l6ZSkge1xyXG4gICAgICAgICAgICB2aXNpYmxlQXJlYU1hdFtpXVtqXSA9IEtpLkJsYWNrO1xyXG4gICAgICAgICAgICBpZiAoc2V0dXAudG9rZW4gPT09ICdBRScpIHZpc2libGVBcmVhTWF0W2ldW2pdID0gMDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtb3ZlUHJvcHMuZm9yRWFjaCgobTogTW92ZVByb3ApID0+IHtcclxuICAgICAgICBjb25zdCBpID0gU0dGX0xFVFRFUlMuaW5kZXhPZihtLnZhbHVlWzBdKTtcclxuICAgICAgICBjb25zdCBqID0gU0dGX0xFVFRFUlMuaW5kZXhPZihtLnZhbHVlWzFdKTtcclxuICAgICAgICBpZiAoaSA+PSAwICYmIGogPj0gMCAmJiBpIDwgc2l6ZSAmJiBqIDwgc2l6ZSkge1xyXG4gICAgICAgICAgdmlzaWJsZUFyZWFNYXRbaV1bal0gPSBLaS5CbGFjaztcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IG1hcmt1cFByb3BzID0gY3VycmVudE5vZGUubW9kZWwubWFya3VwUHJvcHM7XHJcbiAgbWFya3VwUHJvcHMuZm9yRWFjaCgobTogTWFya3VwUHJvcCkgPT4ge1xyXG4gICAgY29uc3QgdG9rZW4gPSBtLnRva2VuO1xyXG4gICAgY29uc3QgdmFsdWVzID0gbS52YWx1ZXM7XHJcbiAgICB2YWx1ZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgIGNvbnN0IGkgPSBTR0ZfTEVUVEVSUy5pbmRleE9mKHZhbHVlWzBdKTtcclxuICAgICAgY29uc3QgaiA9IFNHRl9MRVRURVJTLmluZGV4T2YodmFsdWVbMV0pO1xyXG4gICAgICBpZiAoaSA8IDAgfHwgaiA8IDApIHJldHVybjtcclxuICAgICAgaWYgKGkgPCBzaXplICYmIGogPCBzaXplKSB7XHJcbiAgICAgICAgbGV0IG1hcms7XHJcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xyXG4gICAgICAgICAgY2FzZSAnQ1InOlxyXG4gICAgICAgICAgICBtYXJrID0gTWFya3VwLkNpcmNsZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlICdTUSc6XHJcbiAgICAgICAgICAgIG1hcmsgPSBNYXJrdXAuU3F1YXJlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGNhc2UgJ1RSJzpcclxuICAgICAgICAgICAgbWFyayA9IE1hcmt1cC5UcmlhbmdsZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlICdNQSc6XHJcbiAgICAgICAgICAgIG1hcmsgPSBNYXJrdXAuQ3Jvc3M7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICBtYXJrID0gdmFsdWUuc3BsaXQoJzonKVsxXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbWFya3VwW2ldW2pdID0gbWFyaztcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIGlmIChcclxuICAvLyAgIGxpICE9PSB1bmRlZmluZWQgJiZcclxuICAvLyAgIGxqICE9PSB1bmRlZmluZWQgJiZcclxuICAvLyAgIGxpID49IDAgJiZcclxuICAvLyAgIGxqID49IDAgJiZcclxuICAvLyAgICFtYXJrdXBbbGldW2xqXVxyXG4gIC8vICkge1xyXG4gIC8vICAgbWFya3VwW2xpXVtsal0gPSBNYXJrdXAuQ3VycmVudDtcclxuICAvLyB9XHJcblxyXG4gIHJldHVybiB7bWF0LCB2aXNpYmxlQXJlYU1hdCwgbWFya3VwLCBudW1NYXJrdXB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmRzIGEgcHJvcGVydHkgaW4gdGhlIGdpdmVuIG5vZGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHRva2VuLlxyXG4gKiBAcGFyYW0gbm9kZSBUaGUgbm9kZSB0byBzZWFyY2ggZm9yIHRoZSBwcm9wZXJ0eS5cclxuICogQHBhcmFtIHRva2VuIFRoZSB0b2tlbiBvZiB0aGUgcHJvcGVydHkgdG8gZmluZC5cclxuICogQHJldHVybnMgVGhlIGZvdW5kIHByb3BlcnR5IG9yIG51bGwgaWYgbm90IGZvdW5kLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGZpbmRQcm9wID0gKG5vZGU6IFROb2RlLCB0b2tlbjogc3RyaW5nKSA9PiB7XHJcbiAgaWYgKCFub2RlKSByZXR1cm47XHJcbiAgaWYgKE1PVkVfUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgcmV0dXJuIG5vZGUubW9kZWwubW92ZVByb3BzLmZpbmQoKHA6IE1vdmVQcm9wKSA9PiBwLnRva2VuID09PSB0b2tlbik7XHJcbiAgfVxyXG4gIGlmIChOT0RFX0FOTk9UQVRJT05fUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgcmV0dXJuIG5vZGUubW9kZWwubm9kZUFubm90YXRpb25Qcm9wcy5maW5kKFxyXG4gICAgICAocDogTm9kZUFubm90YXRpb25Qcm9wKSA9PiBwLnRva2VuID09PSB0b2tlblxyXG4gICAgKTtcclxuICB9XHJcbiAgaWYgKE1PVkVfQU5OT1RBVElPTl9QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICByZXR1cm4gbm9kZS5tb2RlbC5tb3ZlQW5ub3RhdGlvblByb3BzLmZpbmQoXHJcbiAgICAgIChwOiBNb3ZlQW5ub3RhdGlvblByb3ApID0+IHAudG9rZW4gPT09IHRva2VuXHJcbiAgICApO1xyXG4gIH1cclxuICBpZiAoUk9PVF9QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICByZXR1cm4gbm9kZS5tb2RlbC5yb290UHJvcHMuZmluZCgocDogUm9vdFByb3ApID0+IHAudG9rZW4gPT09IHRva2VuKTtcclxuICB9XHJcbiAgaWYgKFNFVFVQX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgIHJldHVybiBub2RlLm1vZGVsLnNldHVwUHJvcHMuZmluZCgocDogU2V0dXBQcm9wKSA9PiBwLnRva2VuID09PSB0b2tlbik7XHJcbiAgfVxyXG4gIGlmIChNQVJLVVBfUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgcmV0dXJuIG5vZGUubW9kZWwubWFya3VwUHJvcHMuZmluZCgocDogTWFya3VwUHJvcCkgPT4gcC50b2tlbiA9PT0gdG9rZW4pO1xyXG4gIH1cclxuICBpZiAoR0FNRV9JTkZPX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgIHJldHVybiBub2RlLm1vZGVsLmdhbWVJbmZvUHJvcHMuZmluZChcclxuICAgICAgKHA6IEdhbWVJbmZvUHJvcCkgPT4gcC50b2tlbiA9PT0gdG9rZW5cclxuICAgICk7XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmRzIHByb3BlcnRpZXMgaW4gYSBnaXZlbiBub2RlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCB0b2tlbi5cclxuICogQHBhcmFtIG5vZGUgLSBUaGUgbm9kZSB0byBzZWFyY2ggZm9yIHByb3BlcnRpZXMuXHJcbiAqIEBwYXJhbSB0b2tlbiAtIFRoZSB0b2tlbiB0byBtYXRjaCBhZ2FpbnN0IHRoZSBwcm9wZXJ0aWVzLlxyXG4gKiBAcmV0dXJucyBBbiBhcnJheSBvZiBwcm9wZXJ0aWVzIHRoYXQgbWF0Y2ggdGhlIHByb3ZpZGVkIHRva2VuLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGZpbmRQcm9wcyA9IChub2RlOiBUTm9kZSwgdG9rZW46IHN0cmluZykgPT4ge1xyXG4gIGlmIChNT1ZFX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgIHJldHVybiBub2RlLm1vZGVsLm1vdmVQcm9wcy5maWx0ZXIoKHA6IE1vdmVQcm9wKSA9PiBwLnRva2VuID09PSB0b2tlbik7XHJcbiAgfVxyXG4gIGlmIChOT0RFX0FOTk9UQVRJT05fUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgcmV0dXJuIG5vZGUubW9kZWwubm9kZUFubm90YXRpb25Qcm9wcy5maWx0ZXIoXHJcbiAgICAgIChwOiBOb2RlQW5ub3RhdGlvblByb3ApID0+IHAudG9rZW4gPT09IHRva2VuXHJcbiAgICApO1xyXG4gIH1cclxuICBpZiAoTU9WRV9BTk5PVEFUSU9OX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgIHJldHVybiBub2RlLm1vZGVsLm1vdmVBbm5vdGF0aW9uUHJvcHMuZmlsdGVyKFxyXG4gICAgICAocDogTW92ZUFubm90YXRpb25Qcm9wKSA9PiBwLnRva2VuID09PSB0b2tlblxyXG4gICAgKTtcclxuICB9XHJcbiAgaWYgKFJPT1RfUFJPUF9MSVNULmluY2x1ZGVzKHRva2VuKSkge1xyXG4gICAgcmV0dXJuIG5vZGUubW9kZWwucm9vdFByb3BzLmZpbHRlcigocDogUm9vdFByb3ApID0+IHAudG9rZW4gPT09IHRva2VuKTtcclxuICB9XHJcbiAgaWYgKFNFVFVQX1BST1BfTElTVC5pbmNsdWRlcyh0b2tlbikpIHtcclxuICAgIHJldHVybiBub2RlLm1vZGVsLnNldHVwUHJvcHMuZmlsdGVyKChwOiBTZXR1cFByb3ApID0+IHAudG9rZW4gPT09IHRva2VuKTtcclxuICB9XHJcbiAgaWYgKE1BUktVUF9QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICByZXR1cm4gbm9kZS5tb2RlbC5tYXJrdXBQcm9wcy5maWx0ZXIoKHA6IE1hcmt1cFByb3ApID0+IHAudG9rZW4gPT09IHRva2VuKTtcclxuICB9XHJcbiAgaWYgKEdBTUVfSU5GT19QUk9QX0xJU1QuaW5jbHVkZXModG9rZW4pKSB7XHJcbiAgICByZXR1cm4gbm9kZS5tb2RlbC5nYW1lSW5mb1Byb3BzLmZpbHRlcihcclxuICAgICAgKHA6IEdhbWVJbmZvUHJvcCkgPT4gcC50b2tlbiA9PT0gdG9rZW5cclxuICAgICk7XHJcbiAgfVxyXG4gIHJldHVybiBbXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZW5Nb3ZlID0gKFxyXG4gIG5vZGU6IFROb2RlLFxyXG4gIG9uUmlnaHQ6IChwYXRoOiBzdHJpbmcpID0+IHZvaWQsXHJcbiAgb25Xcm9uZzogKHBhdGg6IHN0cmluZykgPT4gdm9pZCxcclxuICBvblZhcmlhbnQ6IChwYXRoOiBzdHJpbmcpID0+IHZvaWQsXHJcbiAgb25PZmZQYXRoOiAocGF0aDogc3RyaW5nKSA9PiB2b2lkXHJcbik6IFROb2RlIHwgdW5kZWZpbmVkID0+IHtcclxuICBsZXQgbmV4dE5vZGU7XHJcbiAgY29uc3QgZ2V0UGF0aCA9IChub2RlOiBUTm9kZSkgPT4ge1xyXG4gICAgY29uc3QgbmV3UGF0aCA9IGNvbXBhY3QoXHJcbiAgICAgIG5vZGUuZ2V0UGF0aCgpLm1hcChuID0+IG4ubW9kZWwubW92ZVByb3BzWzBdPy50b1N0cmluZygpKVxyXG4gICAgKS5qb2luKCc7Jyk7XHJcbiAgICByZXR1cm4gbmV3UGF0aDtcclxuICB9O1xyXG5cclxuICBjb25zdCBjaGVja1Jlc3VsdCA9IChub2RlOiBUTm9kZSkgPT4ge1xyXG4gICAgaWYgKG5vZGUuaGFzQ2hpbGRyZW4oKSkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHBhdGggPSBnZXRQYXRoKG5vZGUpO1xyXG4gICAgaWYgKGlzUmlnaHROb2RlKG5vZGUpKSB7XHJcbiAgICAgIGlmIChvblJpZ2h0KSBvblJpZ2h0KHBhdGgpO1xyXG4gICAgfSBlbHNlIGlmIChpc1ZhcmlhbnROb2RlKG5vZGUpKSB7XHJcbiAgICAgIGlmIChvblZhcmlhbnQpIG9uVmFyaWFudChwYXRoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChvbldyb25nKSBvbldyb25nKHBhdGgpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGlmIChub2RlLmhhc0NoaWxkcmVuKCkpIHtcclxuICAgIGNvbnN0IHJpZ2h0Tm9kZXMgPSBub2RlLmNoaWxkcmVuLmZpbHRlcigobjogVE5vZGUpID0+IGluUmlnaHRQYXRoKG4pKTtcclxuICAgIGNvbnN0IHdyb25nTm9kZXMgPSBub2RlLmNoaWxkcmVuLmZpbHRlcigobjogVE5vZGUpID0+IGluV3JvbmdQYXRoKG4pKTtcclxuICAgIGNvbnN0IHZhcmlhbnROb2RlcyA9IG5vZGUuY2hpbGRyZW4uZmlsdGVyKChuOiBUTm9kZSkgPT4gaW5WYXJpYW50UGF0aChuKSk7XHJcblxyXG4gICAgbmV4dE5vZGUgPSBub2RlO1xyXG5cclxuICAgIGlmIChpblJpZ2h0UGF0aChub2RlKSAmJiByaWdodE5vZGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgbmV4dE5vZGUgPSBzYW1wbGUocmlnaHROb2Rlcyk7XHJcbiAgICB9IGVsc2UgaWYgKGluV3JvbmdQYXRoKG5vZGUpICYmIHdyb25nTm9kZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBuZXh0Tm9kZSA9IHNhbXBsZSh3cm9uZ05vZGVzKTtcclxuICAgIH0gZWxzZSBpZiAoaW5WYXJpYW50UGF0aChub2RlKSAmJiB2YXJpYW50Tm9kZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBuZXh0Tm9kZSA9IHNhbXBsZSh2YXJpYW50Tm9kZXMpO1xyXG4gICAgfSBlbHNlIGlmIChpc1JpZ2h0Tm9kZShub2RlKSkge1xyXG4gICAgICBvblJpZ2h0KGdldFBhdGgobmV4dE5vZGUpKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG9uV3JvbmcoZ2V0UGF0aChuZXh0Tm9kZSkpO1xyXG4gICAgfVxyXG4gICAgaWYgKG5leHROb2RlKSBjaGVja1Jlc3VsdChuZXh0Tm9kZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNoZWNrUmVzdWx0KG5vZGUpO1xyXG4gIH1cclxuICByZXR1cm4gbmV4dE5vZGU7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZXh0cmFjdEJvYXJkU2l6ZSA9IChub2RlOiBUTm9kZSwgZGVmYXVsdEJvYXJkU2l6ZSA9IDE5KSA9PiB7XHJcbiAgY29uc3Qgcm9vdCA9IG5vZGUuZ2V0UGF0aCgpWzBdO1xyXG4gIGNvbnN0IHNpemUgPSBNYXRoLm1pbihcclxuICAgIHBhcnNlSW50KFN0cmluZyhmaW5kUHJvcChyb290LCAnU1onKT8udmFsdWUgfHwgZGVmYXVsdEJvYXJkU2l6ZSkpLFxyXG4gICAgTUFYX0JPQVJEX1NJWkVcclxuICApO1xyXG4gIHJldHVybiBzaXplO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldEZpcnN0VG9Nb3ZlQ29sb3JGcm9tUm9vdCA9IChcclxuICByb290OiBUTm9kZSB8IHVuZGVmaW5lZCB8IG51bGwsXHJcbiAgZGVmYXVsdE1vdmVDb2xvcjogS2kgPSBLaS5CbGFja1xyXG4pID0+IHtcclxuICBpZiAocm9vdCkge1xyXG4gICAgY29uc3Qgc2V0dXBOb2RlID0gcm9vdC5maXJzdChuID0+IGlzU2V0dXBOb2RlKG4pKTtcclxuICAgIGlmIChzZXR1cE5vZGUpIHtcclxuICAgICAgY29uc3QgZmlyc3RNb3ZlTm9kZSA9IHNldHVwTm9kZS5maXJzdChuID0+IGlzTW92ZU5vZGUobikpO1xyXG4gICAgICBpZiAoIWZpcnN0TW92ZU5vZGUpIHJldHVybiBkZWZhdWx0TW92ZUNvbG9yO1xyXG4gICAgICByZXR1cm4gZ2V0TW92ZUNvbG9yKGZpcnN0TW92ZU5vZGUpO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBjb25zb2xlLndhcm4oJ0RlZmF1bHQgZmlyc3QgdG8gbW92ZSBjb2xvcicsIGRlZmF1bHRNb3ZlQ29sb3IpO1xyXG4gIHJldHVybiBkZWZhdWx0TW92ZUNvbG9yO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldEZpcnN0VG9Nb3ZlQ29sb3JGcm9tU2dmID0gKFxyXG4gIHNnZjogc3RyaW5nLFxyXG4gIGRlZmF1bHRNb3ZlQ29sb3I6IEtpID0gS2kuQmxhY2tcclxuKSA9PiB7XHJcbiAgY29uc3Qgc2dmUGFyc2VyID0gbmV3IFNnZihzZ2YpO1xyXG4gIGlmIChzZ2ZQYXJzZXIucm9vdClcclxuICAgIGdldEZpcnN0VG9Nb3ZlQ29sb3JGcm9tUm9vdChzZ2ZQYXJzZXIucm9vdCwgZGVmYXVsdE1vdmVDb2xvcik7XHJcbiAgLy8gY29uc29sZS53YXJuKCdEZWZhdWx0IGZpcnN0IHRvIG1vdmUgY29sb3InLCBkZWZhdWx0TW92ZUNvbG9yKTtcclxuICByZXR1cm4gZGVmYXVsdE1vdmVDb2xvcjtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRNb3ZlQ29sb3IgPSAobm9kZTogVE5vZGUsIGRlZmF1bHRNb3ZlQ29sb3I6IEtpID0gS2kuQmxhY2spID0+IHtcclxuICBjb25zdCBtb3ZlUHJvcCA9IG5vZGUubW9kZWw/Lm1vdmVQcm9wcz8uWzBdO1xyXG4gIHN3aXRjaCAobW92ZVByb3A/LnRva2VuKSB7XHJcbiAgICBjYXNlICdXJzpcclxuICAgICAgcmV0dXJuIEtpLldoaXRlO1xyXG4gICAgY2FzZSAnQic6XHJcbiAgICAgIHJldHVybiBLaS5CbGFjaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIC8vIGNvbnNvbGUud2FybignRGVmYXVsdCBtb3ZlIGNvbG9yIGlzJywgZGVmYXVsdE1vdmVDb2xvcik7XHJcbiAgICAgIHJldHVybiBkZWZhdWx0TW92ZUNvbG9yO1xyXG4gIH1cclxufTtcclxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RvbmUge1xyXG4gIHByb3RlY3RlZCBnbG9iYWxBbHBoYSA9IDE7XHJcbiAgcHJvdGVjdGVkIHNpemUgPSAwO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByb3RlY3RlZCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgIHByb3RlY3RlZCB4OiBudW1iZXIsXHJcbiAgICBwcm90ZWN0ZWQgeTogbnVtYmVyLFxyXG4gICAgcHJvdGVjdGVkIGtpOiBudW1iZXJcclxuICApIHt9XHJcbiAgZHJhdygpIHtcclxuICAgIC8vIEJhc2UgZHJhdyBtZXRob2QgLSB0byBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzXHJcbiAgfVxyXG5cclxuICBzZXRHbG9iYWxBbHBoYShhbHBoYTogbnVtYmVyKSB7XHJcbiAgICB0aGlzLmdsb2JhbEFscGhhID0gYWxwaGE7XHJcbiAgfVxyXG5cclxuICBzZXRTaXplKHNpemU6IG51bWJlcikge1xyXG4gICAgdGhpcy5zaXplID0gc2l6ZTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IFN0b25lIGZyb20gJy4vYmFzZSc7XHJcbmltcG9ydCB7S2ksIFRoZW1lQ29uZmlnLCBUaGVtZUNvbnRleHR9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0IHtCQVNFX1RIRU1FX0NPTkZJR30gZnJvbSAnLi4vY29uc3QnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZsYXRTdG9uZSBleHRlbmRzIFN0b25lIHtcclxuICBwcm90ZWN0ZWQgdGhlbWVDb250ZXh0PzogVGhlbWVDb250ZXh0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELFxyXG4gICAgeDogbnVtYmVyLFxyXG4gICAgeTogbnVtYmVyLFxyXG4gICAga2k6IG51bWJlcixcclxuICAgIHRoZW1lQ29udGV4dD86IFRoZW1lQ29udGV4dFxyXG4gICkge1xyXG4gICAgc3VwZXIoY3R4LCB4LCB5LCBraSk7XHJcbiAgICB0aGlzLnRoZW1lQ29udGV4dCA9IHRoZW1lQ29udGV4dDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhIHRoZW1lIHByb3BlcnR5IHZhbHVlIHdpdGggZmFsbGJhY2tcclxuICAgKi9cclxuICBwcm90ZWN0ZWQgZ2V0VGhlbWVQcm9wZXJ0eTxLIGV4dGVuZHMga2V5b2YgVGhlbWVDb25maWc+KFxyXG4gICAga2V5OiBLXHJcbiAgKTogVGhlbWVDb25maWdbS10ge1xyXG4gICAgaWYgKCF0aGlzLnRoZW1lQ29udGV4dCkge1xyXG4gICAgICByZXR1cm4gQkFTRV9USEVNRV9DT05GSUdba2V5XTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7dGhlbWUsIHRoZW1lT3B0aW9uc30gPSB0aGlzLnRoZW1lQ29udGV4dDtcclxuICAgIGNvbnN0IHRoZW1lU3BlY2lmaWMgPSB0aGVtZU9wdGlvbnNbdGhlbWVdO1xyXG4gICAgY29uc3QgZGVmYXVsdENvbmZpZyA9IHRoZW1lT3B0aW9ucy5kZWZhdWx0O1xyXG5cclxuICAgIC8vIFRyeSB0aGVtZS1zcGVjaWZpYyB2YWx1ZSBmaXJzdCwgdGhlbiBkZWZhdWx0XHJcbiAgICBjb25zdCByZXN1bHQgPSAodGhlbWVTcGVjaWZpYz8uW2tleV0gPz9cclxuICAgICAgZGVmYXVsdENvbmZpZ1trZXldKSBhcyBUaGVtZUNvbmZpZ1tLXTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBkcmF3KCkge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgc2l6ZSwga2ksIGdsb2JhbEFscGhhfSA9IHRoaXM7XHJcbiAgICBpZiAoc2l6ZSA8PSAwKSByZXR1cm47XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gZ2xvYmFsQWxwaGE7XHJcbiAgICBjdHguYXJjKHgsIHksIHNpemUgLyAyLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnYm9hcmRMaW5lQ29sb3InKTtcclxuICAgIGlmIChraSA9PT0gS2kuQmxhY2spIHtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnZmxhdEJsYWNrQ29sb3InKTtcclxuICAgIH0gZWxzZSBpZiAoa2kgPT09IEtpLldoaXRlKSB7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2ZsYXRXaGl0ZUNvbG9yJyk7XHJcbiAgICB9XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IFN0b25lIGZyb20gJy4vYmFzZSc7XHJcbmltcG9ydCB7S2ksIFRoZW1lQ29udGV4dH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5pbXBvcnQge0ZsYXRTdG9uZX0gZnJvbSAnLi9GbGF0U3RvbmUnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEltYWdlU3RvbmUgZXh0ZW5kcyBTdG9uZSB7XHJcbiAgcHJpdmF0ZSBmYWxsYmFja1N0b25lPzogRmxhdFN0b25lO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELFxyXG4gICAgeDogbnVtYmVyLFxyXG4gICAgeTogbnVtYmVyLFxyXG4gICAga2k6IG51bWJlcixcclxuICAgIHByaXZhdGUgbW9kOiBudW1iZXIsXHJcbiAgICBwcml2YXRlIGJsYWNrczogYW55LFxyXG4gICAgcHJpdmF0ZSB3aGl0ZXM6IGFueSxcclxuICAgIHByaXZhdGUgdGhlbWVDb250ZXh0PzogVGhlbWVDb250ZXh0XHJcbiAgKSB7XHJcbiAgICBzdXBlcihjdHgsIHgsIHksIGtpKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRmxhdFN0b25lIGFzIGZhbGxiYWNrIG9wdGlvblxyXG4gICAgaWYgKHRoZW1lQ29udGV4dCkge1xyXG4gICAgICB0aGlzLmZhbGxiYWNrU3RvbmUgPSBuZXcgRmxhdFN0b25lKGN0eCwgeCwgeSwga2ksIHRoZW1lQ29udGV4dCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBkcmF3KCkge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgc2l6ZSwga2ksIGJsYWNrcywgd2hpdGVzLCBtb2R9ID0gdGhpcztcclxuICAgIGlmIChzaXplIDw9IDApIHJldHVybjtcclxuXHJcbiAgICBsZXQgaW1nO1xyXG4gICAgaWYgKGtpID09PSBLaS5CbGFjaykge1xyXG4gICAgICBpbWcgPSBibGFja3NbbW9kICUgYmxhY2tzLmxlbmd0aF07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpbWcgPSB3aGl0ZXNbbW9kICUgd2hpdGVzLmxlbmd0aF07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgaW1hZ2UgaXMgbG9hZGVkIGNvbXBsZXRlbHlcclxuICAgIGlmIChpbWcgJiYgaW1nLmNvbXBsZXRlICYmIGltZy5uYXR1cmFsSGVpZ2h0ICE9PSAwKSB7XHJcbiAgICAgIC8vIEltYWdlIGxvYWRlZCwgcmVuZGVyIHdpdGggaW1hZ2VcclxuICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIHggLSBzaXplIC8gMiwgeSAtIHNpemUgLyAyLCBzaXplLCBzaXplKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIEltYWdlIG5vdCBsb2FkZWQgb3IgbG9hZCBmYWlsZWQsIHVzZSBGbGF0U3RvbmUgYXMgZmFsbGJhY2tcclxuICAgICAgaWYgKHRoaXMuZmFsbGJhY2tTdG9uZSkge1xyXG4gICAgICAgIHRoaXMuZmFsbGJhY2tTdG9uZS5zZXRTaXplKHNpemUpO1xyXG4gICAgICAgIHRoaXMuZmFsbGJhY2tTdG9uZS5kcmF3KCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldFNpemUoc2l6ZTogbnVtYmVyKSB7XHJcbiAgICBzdXBlci5zZXRTaXplKHNpemUpO1xyXG4gICAgLy8gU3luY2hyb25vdXNseSB1cGRhdGUgZmFsbGJhY2tTdG9uZSBzaXplXHJcbiAgICBpZiAodGhpcy5mYWxsYmFja1N0b25lKSB7XHJcbiAgICAgIHRoaXMuZmFsbGJhY2tTdG9uZS5zZXRTaXplKHNpemUpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQge1xyXG4gIEFuYWx5c2lzUG9pbnRUaGVtZSxcclxuICBBbmFseXNpc1BvaW50T3B0aW9ucyxcclxuICBNb3ZlSW5mbyxcclxuICBSb290SW5mbyxcclxufSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCB7XHJcbiAgY2FsY0FuYWx5c2lzUG9pbnRDb2xvcixcclxuICBjYWxjU2NvcmVEaWZmLFxyXG4gIGNhbGNTY29yZURpZmZUZXh0LFxyXG4gIG5Gb3JtYXR0ZXIsXHJcbiAgcm91bmQzLFxyXG59IGZyb20gJy4uL2hlbHBlcic7XHJcbmltcG9ydCB7XHJcbiAgTElHSFRfR1JFRU5fUkdCLFxyXG4gIExJR0hUX1JFRF9SR0IsXHJcbiAgTElHSFRfWUVMTE9XX1JHQixcclxuICBZRUxMT1dfUkdCLFxyXG59IGZyb20gJy4uL2NvbnN0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuYWx5c2lzUG9pbnQge1xyXG4gIHByaXZhdGUgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XHJcbiAgcHJpdmF0ZSB4OiBudW1iZXI7XHJcbiAgcHJpdmF0ZSB5OiBudW1iZXI7XHJcbiAgcHJpdmF0ZSByOiBudW1iZXI7XHJcbiAgcHJpdmF0ZSByb290SW5mbzogUm9vdEluZm87XHJcbiAgcHJpdmF0ZSBtb3ZlSW5mbzogTW92ZUluZm87XHJcbiAgcHJpdmF0ZSBwb2xpY3lWYWx1ZT86IG51bWJlcjtcclxuICBwcml2YXRlIHRoZW1lOiBBbmFseXNpc1BvaW50VGhlbWU7XHJcbiAgcHJpdmF0ZSBvdXRsaW5lQ29sb3I/OiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFuYWx5c2lzUG9pbnRPcHRpb25zKSB7XHJcbiAgICB0aGlzLmN0eCA9IG9wdGlvbnMuY3R4O1xyXG4gICAgdGhpcy54ID0gb3B0aW9ucy54O1xyXG4gICAgdGhpcy55ID0gb3B0aW9ucy55O1xyXG4gICAgdGhpcy5yID0gb3B0aW9ucy5yO1xyXG4gICAgdGhpcy5yb290SW5mbyA9IG9wdGlvbnMucm9vdEluZm87XHJcbiAgICB0aGlzLm1vdmVJbmZvID0gb3B0aW9ucy5tb3ZlSW5mbztcclxuICAgIHRoaXMucG9saWN5VmFsdWUgPSBvcHRpb25zLnBvbGljeVZhbHVlO1xyXG4gICAgdGhpcy50aGVtZSA9IG9wdGlvbnMudGhlbWUgPz8gQW5hbHlzaXNQb2ludFRoZW1lLkRlZmF1bHQ7XHJcbiAgICB0aGlzLm91dGxpbmVDb2xvciA9IG9wdGlvbnMub3V0bGluZUNvbG9yO1xyXG4gIH1cclxuXHJcbiAgZHJhdygpIHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHIsIHJvb3RJbmZvLCBtb3ZlSW5mbywgdGhlbWV9ID0gdGhpcztcclxuICAgIGlmIChyIDwgMCkgcmV0dXJuO1xyXG5cclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguc2hhZG93T2Zmc2V0WCA9IDA7XHJcbiAgICBjdHguc2hhZG93T2Zmc2V0WSA9IDA7XHJcbiAgICBjdHguc2hhZG93Q29sb3IgPSAnI2ZmZic7XHJcbiAgICBjdHguc2hhZG93Qmx1ciA9IDA7XHJcblxyXG4gICAgLy8gdGhpcy5kcmF3RGVmYXVsdEFuYWx5c2lzUG9pbnQoKTtcclxuICAgIGlmICh0aGVtZSA9PT0gQW5hbHlzaXNQb2ludFRoZW1lLkRlZmF1bHQpIHtcclxuICAgICAgdGhpcy5kcmF3RGVmYXVsdEFuYWx5c2lzUG9pbnQoKTtcclxuICAgIH0gZWxzZSBpZiAodGhlbWUgPT09IEFuYWx5c2lzUG9pbnRUaGVtZS5Qcm9ibGVtKSB7XHJcbiAgICAgIHRoaXMuZHJhd1Byb2JsZW1BbmFseXNpc1BvaW50KCk7XHJcbiAgICB9IGVsc2UgaWYgKHRoZW1lID09PSBBbmFseXNpc1BvaW50VGhlbWUuU2NlbmFyaW8pIHtcclxuICAgICAgdGhpcy5kcmF3U2NlbmFyaW9BbmFseXNpc1BvaW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZHJhd1Byb2JsZW1BbmFseXNpc1BvaW50ID0gKCkgPT4ge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgciwgcm9vdEluZm8sIG1vdmVJbmZvLCBvdXRsaW5lQ29sb3J9ID0gdGhpcztcclxuICAgIGNvbnN0IHtvcmRlcn0gPSBtb3ZlSW5mbztcclxuXHJcbiAgICBsZXQgcENvbG9yID0gY2FsY0FuYWx5c2lzUG9pbnRDb2xvcihyb290SW5mbywgbW92ZUluZm8pO1xyXG5cclxuICAgIGlmIChvcmRlciA8IDUpIHtcclxuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IDA7XHJcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDApJztcclxuICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoeCwgeSwgciAqIDAuOSwgeCwgeSwgcik7XHJcbiAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBwQ29sb3IpO1xyXG4gICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC45LCAncmdiYSgyNTUsIDI1NSwgMjU1LCAwJyk7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBncmFkaWVudDtcclxuICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgaWYgKG91dGxpbmVDb2xvcikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBvdXRsaW5lQ29sb3I7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBmb250U2l6ZSA9IHIgLyAxLjU7XHJcblxyXG4gICAgICBjdHguZm9udCA9IGAke2ZvbnRTaXplICogMC44fXB4IFRhaG9tYWA7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xyXG4gICAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblxyXG4gICAgICBjdHguZm9udCA9IGAke2ZvbnRTaXplfXB4IFRhaG9tYWA7XHJcbiAgICAgIGNvbnN0IHNjb3JlVGV4dCA9IGNhbGNTY29yZURpZmZUZXh0KHJvb3RJbmZvLCBtb3ZlSW5mbyk7XHJcbiAgICAgIGN0eC5maWxsVGV4dChzY29yZVRleHQsIHgsIHkpO1xyXG5cclxuICAgICAgY3R4LmZvbnQgPSBgJHtmb250U2l6ZSAqIDAuOH1weCBUYWhvbWFgO1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBjdHguZmlsbFRleHQobkZvcm1hdHRlcihtb3ZlSW5mby52aXNpdHMpLCB4LCB5ICsgciAvIDIgKyBmb250U2l6ZSAvIDgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5kcmF3Q2FuZGlkYXRlUG9pbnQoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBwcml2YXRlIGRyYXdEZWZhdWx0QW5hbHlzaXNQb2ludCA9ICgpID0+IHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHIsIHJvb3RJbmZvLCBtb3ZlSW5mb30gPSB0aGlzO1xyXG4gICAgY29uc3Qge29yZGVyfSA9IG1vdmVJbmZvO1xyXG5cclxuICAgIGxldCBwQ29sb3IgPSBjYWxjQW5hbHlzaXNQb2ludENvbG9yKHJvb3RJbmZvLCBtb3ZlSW5mbyk7XHJcblxyXG4gICAgaWYgKG9yZGVyIDwgNSkge1xyXG4gICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgIGN0eC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gMDtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMCknO1xyXG4gICAgICBjb25zdCBncmFkaWVudCA9IGN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudCh4LCB5LCByICogMC45LCB4LCB5LCByKTtcclxuICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIHBDb2xvcik7XHJcbiAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjksICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAnKTtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xyXG4gICAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgICAgY29uc3QgZm9udFNpemUgPSByIC8gMS41O1xyXG5cclxuICAgICAgY3R4LmZvbnQgPSBgJHtmb250U2l6ZSAqIDAuOH1weCBUYWhvbWFgO1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cclxuICAgICAgY29uc3Qgd2lucmF0ZSA9XHJcbiAgICAgICAgcm9vdEluZm8uY3VycmVudFBsYXllciA9PT0gJ0InXHJcbiAgICAgICAgICA/IG1vdmVJbmZvLndpbnJhdGVcclxuICAgICAgICAgIDogMSAtIG1vdmVJbmZvLndpbnJhdGU7XHJcblxyXG4gICAgICBjdHguZmlsbFRleHQocm91bmQzKHdpbnJhdGUsIDEwMCwgMSksIHgsIHkgLSByIC8gMiArIGZvbnRTaXplIC8gNSk7XHJcblxyXG4gICAgICBjdHguZm9udCA9IGAke2ZvbnRTaXplfXB4IFRhaG9tYWA7XHJcbiAgICAgIGNvbnN0IHNjb3JlVGV4dCA9IGNhbGNTY29yZURpZmZUZXh0KHJvb3RJbmZvLCBtb3ZlSW5mbyk7XHJcbiAgICAgIGN0eC5maWxsVGV4dChzY29yZVRleHQsIHgsIHkgKyBmb250U2l6ZSAvIDMpO1xyXG5cclxuICAgICAgY3R4LmZvbnQgPSBgJHtmb250U2l6ZSAqIDAuOH1weCBUYWhvbWFgO1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBjdHguZmlsbFRleHQobkZvcm1hdHRlcihtb3ZlSW5mby52aXNpdHMpLCB4LCB5ICsgciAvIDIgKyBmb250U2l6ZSAvIDMpO1xyXG5cclxuICAgICAgY29uc3Qgb3JkZXIgPSBtb3ZlSW5mby5vcmRlcjtcclxuICAgICAgY3R4LmZpbGxUZXh0KChvcmRlciArIDEpLnRvU3RyaW5nKCksIHggKyByLCB5IC0gciAvIDIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5kcmF3Q2FuZGlkYXRlUG9pbnQoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBwcml2YXRlIGRyYXdTY2VuYXJpb0FuYWx5c2lzUG9pbnQgPSAoKSA9PiB7XHJcbiAgICBjb25zdCB7Y3R4LCB4LCB5LCByLCByb290SW5mbywgbW92ZUluZm99ID0gdGhpcztcclxuICAgIGNvbnN0IHtvcmRlcn0gPSBtb3ZlSW5mbztcclxuXHJcbiAgICBsZXQgcENvbG9yID0gY2FsY0FuYWx5c2lzUG9pbnRDb2xvcihyb290SW5mbywgbW92ZUluZm8pO1xyXG5cclxuICAgIGlmIChvcmRlciA8IDkpIHtcclxuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICBjdHguYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IDA7XHJcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDApJztcclxuICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoeCwgeSwgciAqIDAuOSwgeCwgeSwgcik7XHJcbiAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBwQ29sb3IpO1xyXG4gICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC45LCAncmdiYSgyNTUsIDI1NSwgMjU1LCAwJyk7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBncmFkaWVudDtcclxuICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgIGNvbnN0IGZvbnRTaXplID0gciAvIDEuNTtcclxuXHJcbiAgICAgIGN0eC5mb250ID0gYCR7Zm9udFNpemUgKiAwLjh9cHggVGFob21hYDtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XHJcbiAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHJcbiAgICAgIC8vIERpc3BsYXkgaHVtYW5Qb2xpY3kgdmFsdWUgKGZyb20gcG9saWN5VmFsdWUpIG9yIGZhbGxiYWNrIHRvIG1vdmVJbmZvLnByaW9yXHJcbiAgICAgIC8vIEZpbHRlciBvdXQgLTEgdmFsdWVzIChpbGxlZ2FsIHBvc2l0aW9ucyBpbiBwb2xpY3kgYXJyYXkpXHJcbiAgICAgIGNvbnN0IHBvbGljeSA9XHJcbiAgICAgICAgdGhpcy5wb2xpY3lWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMucG9saWN5VmFsdWUgIT09IC0xXHJcbiAgICAgICAgICA/IHRoaXMucG9saWN5VmFsdWVcclxuICAgICAgICAgIDogbW92ZUluZm8ucHJpb3I7XHJcblxyXG4gICAgICBjb25zdCBwb2xpY3lQZXJjZW50ID0gcm91bmQzKHBvbGljeSwgMTAwLCAxKTtcclxuICAgICAgY3R4LmZpbGxUZXh0KHBvbGljeVBlcmNlbnQsIHgsIHkgLSByIC8gMiArIGZvbnRTaXplIC8gNSk7XHJcblxyXG4gICAgICBjdHguZm9udCA9IGAke2ZvbnRTaXplfXB4IFRhaG9tYWA7XHJcbiAgICAgIGNvbnN0IHNjb3JlVGV4dCA9IGNhbGNTY29yZURpZmZUZXh0KHJvb3RJbmZvLCBtb3ZlSW5mbyk7XHJcbiAgICAgIGN0eC5maWxsVGV4dChzY29yZVRleHQsIHgsIHkgKyBmb250U2l6ZSAvIDMpO1xyXG5cclxuICAgICAgY3R4LmZvbnQgPSBgJHtmb250U2l6ZSAqIDAuOH1weCBUYWhvbWFgO1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBjdHguZmlsbFRleHQobkZvcm1hdHRlcihtb3ZlSW5mby52aXNpdHMpLCB4LCB5ICsgciAvIDIgKyBmb250U2l6ZSAvIDMpO1xyXG5cclxuICAgICAgY29uc3Qgb3JkZXIgPSBtb3ZlSW5mby5vcmRlcjtcclxuICAgICAgY3R4LmZpbGxUZXh0KChvcmRlciArIDEpLnRvU3RyaW5nKCksIHggKyByLCB5IC0gciAvIDIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5kcmF3Q2FuZGlkYXRlUG9pbnQoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBwcml2YXRlIGRyYXdDYW5kaWRhdGVQb2ludCA9ICgpID0+IHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHIsIHJvb3RJbmZvLCBtb3ZlSW5mb30gPSB0aGlzO1xyXG4gICAgY29uc3QgcENvbG9yID0gY2FsY0FuYWx5c2lzUG9pbnRDb2xvcihyb290SW5mbywgbW92ZUluZm8pO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LCB5LCByICogMC42LCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMDtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDApJztcclxuICAgIGNvbnN0IGdyYWRpZW50ID0gY3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KHgsIHksIHIgKiAwLjQsIHgsIHksIHIpO1xyXG4gICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIHBDb2xvcik7XHJcbiAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC45NSwgJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMCcpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICB9O1xyXG59XHJcbiIsImltcG9ydCB7VGhlbWUsIFRoZW1lUHJvcGVydHlLZXksIFRoZW1lQ29udGV4dCwgVGhlbWVDb25maWd9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0IHtCQVNFX1RIRU1FX0NPTkZJR30gZnJvbSAnLi4vY29uc3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWFya3VwIHtcclxuICBwcm90ZWN0ZWQgZ2xvYmFsQWxwaGEgPSAxO1xyXG4gIHByb3RlY3RlZCBjb2xvciA9ICcnO1xyXG4gIHByb3RlY3RlZCBsaW5lRGFzaDogbnVtYmVyW10gPSBbXTtcclxuICBwcm90ZWN0ZWQgdGhlbWVDb250ZXh0PzogVGhlbWVDb250ZXh0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByb3RlY3RlZCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgIHByb3RlY3RlZCB4OiBudW1iZXIsXHJcbiAgICBwcm90ZWN0ZWQgeTogbnVtYmVyLFxyXG4gICAgcHJvdGVjdGVkIHM6IG51bWJlcixcclxuICAgIHByb3RlY3RlZCBraTogbnVtYmVyLFxyXG4gICAgdGhlbWVDb250ZXh0PzogVGhlbWVDb250ZXh0LFxyXG4gICAgcHJvdGVjdGVkIHZhbDogc3RyaW5nIHwgbnVtYmVyID0gJydcclxuICApIHtcclxuICAgIHRoaXMudGhlbWVDb250ZXh0ID0gdGhlbWVDb250ZXh0O1xyXG4gIH1cclxuXHJcbiAgZHJhdygpIHtcclxuICAgIC8vIEJhc2UgZHJhdyBtZXRob2QgLSB0byBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzXHJcbiAgfVxyXG5cclxuICBzZXRHbG9iYWxBbHBoYShhbHBoYTogbnVtYmVyKSB7XHJcbiAgICB0aGlzLmdsb2JhbEFscGhhID0gYWxwaGE7XHJcbiAgfVxyXG5cclxuICBzZXRDb2xvcihjb2xvcjogc3RyaW5nKSB7XHJcbiAgICB0aGlzLmNvbG9yID0gY29sb3I7XHJcbiAgfVxyXG5cclxuICBzZXRMaW5lRGFzaChsaW5lRGFzaDogbnVtYmVyW10pIHtcclxuICAgIHRoaXMubGluZURhc2ggPSBsaW5lRGFzaDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhIHRoZW1lIHByb3BlcnR5IHZhbHVlIHdpdGggZmFsbGJhY2tcclxuICAgKi9cclxuICBwcm90ZWN0ZWQgZ2V0VGhlbWVQcm9wZXJ0eTxLIGV4dGVuZHMga2V5b2YgVGhlbWVDb25maWc+KFxyXG4gICAga2V5OiBLXHJcbiAgKTogVGhlbWVDb25maWdbS10ge1xyXG4gICAgaWYgKCF0aGlzLnRoZW1lQ29udGV4dCkge1xyXG4gICAgICByZXR1cm4gQkFTRV9USEVNRV9DT05GSUdba2V5XTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7dGhlbWUsIHRoZW1lT3B0aW9uc30gPSB0aGlzLnRoZW1lQ29udGV4dDtcclxuICAgIGNvbnN0IHRoZW1lU3BlY2lmaWMgPSB0aGVtZU9wdGlvbnNbdGhlbWVdO1xyXG4gICAgY29uc3QgZGVmYXVsdENvbmZpZyA9IHRoZW1lT3B0aW9ucy5kZWZhdWx0O1xyXG5cclxuICAgIC8vIFRyeSB0aGVtZS1zcGVjaWZpYyB2YWx1ZSBmaXJzdCwgdGhlbiBkZWZhdWx0XHJcbiAgICBjb25zdCByZXN1bHQgPSAodGhlbWVTcGVjaWZpYz8uW2tleV0gPz9cclxuICAgICAgZGVmYXVsdENvbmZpZ1trZXldKSBhcyBUaGVtZUNvbmZpZ1tLXTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuaW1wb3J0IHtLaX0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIENpcmNsZU1hcmt1cCBleHRlbmRzIE1hcmt1cCB7XHJcbiAgZHJhdygpIHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHMsIGtpLCBnbG9iYWxBbHBoYSwgY29sb3J9ID0gdGhpcztcclxuICAgIGNvbnN0IHJhZGl1cyA9IHMgKiAwLjU7XHJcbiAgICBsZXQgc2l6ZSA9IHJhZGl1cyAqIDAuNjU7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gZ2xvYmFsQWxwaGE7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdtYXJrdXBMaW5lV2lkdGgnKTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoKTtcclxuICAgIGlmIChraSA9PT0gS2kuV2hpdGUpIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0QmxhY2tDb2xvcicpO1xyXG4gICAgfSBlbHNlIGlmIChraSA9PT0gS2kuQmxhY2spIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0V2hpdGVDb2xvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdib2FyZExpbmVDb2xvcicpO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgIH1cclxuICAgIGlmIChjb2xvcikgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XHJcbiAgICBpZiAoc2l6ZSA+IDApIHtcclxuICAgICAgY3R4LmFyYyh4LCB5LCBzaXplLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcbiAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuaW1wb3J0IHtLaX0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIENyb3NzTWFya3VwIGV4dGVuZHMgTWFya3VwIHtcclxuICBkcmF3KCkge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgcywga2ksIGdsb2JhbEFscGhhfSA9IHRoaXM7XHJcbiAgICBjb25zdCByYWRpdXMgPSBzICogMC41O1xyXG4gICAgbGV0IHNpemUgPSByYWRpdXMgKiAwLjU7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICBjdHguZ2xvYmFsQWxwaGEgPSBnbG9iYWxBbHBoYTtcclxuICAgIGlmIChraSA9PT0gS2kuV2hpdGUpIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0QmxhY2tDb2xvcicpO1xyXG4gICAgfSBlbHNlIGlmIChraSA9PT0gS2kuQmxhY2spIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0V2hpdGVDb2xvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdib2FyZExpbmVDb2xvcicpO1xyXG4gICAgICBzaXplID0gcmFkaXVzICogMC41ODtcclxuICAgIH1cclxuICAgIGN0eC5tb3ZlVG8oeCAtIHNpemUsIHkgLSBzaXplKTtcclxuICAgIGN0eC5saW5lVG8oeCArIHNpemUsIHkgKyBzaXplKTtcclxuICAgIGN0eC5tb3ZlVG8oeCArIHNpemUsIHkgLSBzaXplKTtcclxuICAgIGN0eC5saW5lVG8oeCAtIHNpemUsIHkgKyBzaXplKTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgTWFya3VwIGZyb20gJy4vTWFya3VwQmFzZSc7XHJcbmltcG9ydCB7S2l9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBUZXh0TWFya3VwIGV4dGVuZHMgTWFya3VwIHtcclxuICBkcmF3KCkge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgcywga2ksIHZhbCwgZ2xvYmFsQWxwaGF9ID0gdGhpcztcclxuICAgIGNvbnN0IHNpemUgPSBzICogMC44O1xyXG4gICAgbGV0IGZvbnRTaXplID0gc2l6ZSAvIDEuNTtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguZ2xvYmFsQWxwaGEgPSBnbG9iYWxBbHBoYTtcclxuXHJcbiAgICBpZiAoa2kgPT09IEtpLldoaXRlKSB7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2ZsYXRCbGFja0NvbG9yJyk7XHJcbiAgICB9IGVsc2UgaWYgKGtpID09PSBLaS5CbGFjaykge1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0V2hpdGVDb2xvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnYm9hcmRMaW5lQ29sb3InKTtcclxuICAgIH1cclxuICAgIC8vIGVsc2Uge1xyXG4gICAgLy8gICBjdHguY2xlYXJSZWN0KHggLSBzaXplIC8gMiwgeSAtIHNpemUgLyAyLCBzaXplLCBzaXplKTtcclxuICAgIC8vIH1cclxuICAgIGlmICh2YWwudG9TdHJpbmcoKS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgZm9udFNpemUgPSBzaXplIC8gMS41O1xyXG4gICAgfSBlbHNlIGlmICh2YWwudG9TdHJpbmcoKS5sZW5ndGggPT09IDIpIHtcclxuICAgICAgZm9udFNpemUgPSBzaXplIC8gMS44O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9udFNpemUgPSBzaXplIC8gMi4wO1xyXG4gICAgfVxyXG4gICAgY3R4LmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4IFRhaG9tYWA7XHJcbiAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICBjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XHJcbiAgICBjdHguZmlsbFRleHQodmFsLnRvU3RyaW5nKCksIHgsIHkgKyAyKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuaW1wb3J0IHtLaX0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNxdWFyZU1hcmt1cCBleHRlbmRzIE1hcmt1cCB7XHJcbiAgZHJhdygpIHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHMsIGtpLCBnbG9iYWxBbHBoYX0gPSB0aGlzO1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ21hcmt1cExpbmVXaWR0aCcpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gZ2xvYmFsQWxwaGE7XHJcbiAgICBsZXQgc2l6ZSA9IHMgKiAwLjU1O1xyXG4gICAgaWYgKGtpID09PSBLaS5XaGl0ZSkge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2ZsYXRCbGFja0NvbG9yJyk7XHJcbiAgICB9IGVsc2UgaWYgKGtpID09PSBLaS5CbGFjaykge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2ZsYXRXaGl0ZUNvbG9yJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2JvYXJkTGluZUNvbG9yJyk7XHJcbiAgICAgIGN0eC5saW5lV2lkdGggPSAzO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlY3QoeCAtIHNpemUgLyAyLCB5IC0gc2l6ZSAvIDIsIHNpemUsIHNpemUpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IE1hcmt1cCBmcm9tICcuL01hcmt1cEJhc2UnO1xyXG5pbXBvcnQge0tpfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgVHJpYW5nbGVNYXJrdXAgZXh0ZW5kcyBNYXJrdXAge1xyXG4gIGRyYXcoKSB7XHJcbiAgICBjb25zdCB7Y3R4LCB4LCB5LCBzLCBraSwgZ2xvYmFsQWxwaGF9ID0gdGhpcztcclxuICAgIGNvbnN0IHJhZGl1cyA9IHMgKiAwLjU7XHJcbiAgICBsZXQgc2l6ZSA9IHJhZGl1cyAqIDAuNzU7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gZ2xvYmFsQWxwaGE7XHJcbiAgICBjdHgubW92ZVRvKHgsIHkgLSBzaXplKTtcclxuICAgIGN0eC5saW5lVG8oeCAtIHNpemUgKiBNYXRoLmNvcygwLjUyMyksIHkgKyBzaXplICogTWF0aC5zaW4oMC41MjMpKTtcclxuICAgIGN0eC5saW5lVG8oeCArIHNpemUgKiBNYXRoLmNvcygwLjUyMyksIHkgKyBzaXplICogTWF0aC5zaW4oMC41MjMpKTtcclxuXHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdtYXJrdXBMaW5lV2lkdGgnKTtcclxuICAgIGlmIChraSA9PT0gS2kuV2hpdGUpIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0QmxhY2tDb2xvcicpO1xyXG4gICAgfSBlbHNlIGlmIChraSA9PT0gS2kuQmxhY2spIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0V2hpdGVDb2xvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdib2FyZExpbmVDb2xvcicpO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gMztcclxuICAgICAgc2l6ZSA9IHJhZGl1cyAqIDAuNztcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOb2RlTWFya3VwIGV4dGVuZHMgTWFya3VwIHtcclxuICBkcmF3KCkge1xyXG4gICAgY29uc3Qge2N0eCwgeCwgeSwgcywga2ksIGNvbG9yLCBnbG9iYWxBbHBoYX0gPSB0aGlzO1xyXG4gICAgY29uc3QgcmFkaXVzID0gcyAqIDAuNTtcclxuICAgIGxldCBzaXplID0gcmFkaXVzICogMC40O1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5nbG9iYWxBbHBoYSA9IGdsb2JhbEFscGhhO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDQ7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoKTtcclxuICAgIGlmIChzaXplID4gMCkge1xyXG4gICAgICBjdHguYXJjKHgsIHksIHNpemUsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IE1hcmt1cCBmcm9tICcuL01hcmt1cEJhc2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFjdGl2ZU5vZGVNYXJrdXAgZXh0ZW5kcyBNYXJrdXAge1xyXG4gIGRyYXcoKSB7XHJcbiAgICBjb25zdCB7Y3R4LCB4LCB5LCBzLCBraSwgY29sb3IsIGdsb2JhbEFscGhhfSA9IHRoaXM7XHJcbiAgICBjb25zdCByYWRpdXMgPSBzICogMC41O1xyXG4gICAgbGV0IHNpemUgPSByYWRpdXMgKiAwLjU7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gZ2xvYmFsQWxwaGE7XHJcbiAgICBjdHgubGluZVdpZHRoID0gNDtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LnNldExpbmVEYXNoKHRoaXMubGluZURhc2gpO1xyXG4gICAgaWYgKHNpemUgPiAwKSB7XHJcbiAgICAgIGN0eC5hcmMoeCwgeSwgc2l6ZSwgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG4gICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBpZiAoc2l6ZSA+IDApIHtcclxuICAgICAgY3R4LmFyYyh4LCB5LCBzaXplICogMC40LCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcbiAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQge0tpfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBDaXJjbGVTb2xpZE1hcmt1cCBleHRlbmRzIE1hcmt1cCB7XHJcbiAgZHJhdygpIHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHMsIGtpLCBnbG9iYWxBbHBoYSwgY29sb3J9ID0gdGhpcztcclxuICAgIGNvbnN0IHJhZGl1cyA9IHMgKiAwLjI1O1xyXG4gICAgbGV0IHNpemUgPSByYWRpdXMgKiAwLjY1O1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5nbG9iYWxBbHBoYSA9IGdsb2JhbEFscGhhO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnbWFya3VwTGluZVdpZHRoJyk7XHJcbiAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCk7XHJcbiAgICBpZiAoa2kgPT09IEtpLkJsYWNrKSB7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2ZsYXRXaGl0ZUNvbG9yJyk7XHJcbiAgICB9IGVsc2UgaWYgKGtpID09PSBLaS5XaGl0ZSkge1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdmbGF0QmxhY2tDb2xvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnYm9hcmRMaW5lQ29sb3InKTtcclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IDM7XHJcbiAgICB9XHJcbiAgICBpZiAoY29sb3IpIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGlmIChzaXplID4gMCkge1xyXG4gICAgICBjdHguYXJjKHgsIHksIHNpemUsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCBNYXJrdXAgZnJvbSAnLi9NYXJrdXBCYXNlJztcclxuaW1wb3J0IHtLaX0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEhpZ2hsaWdodE1hcmt1cCBleHRlbmRzIE1hcmt1cCB7XHJcbiAgZHJhdygpIHtcclxuICAgIGNvbnN0IHtjdHgsIHgsIHksIHMsIGtpLCBnbG9iYWxBbHBoYX0gPSB0aGlzO1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ21hcmt1cExpbmVXaWR0aCcpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gMC42O1xyXG4gICAgbGV0IHNpemUgPSBzICogMC40O1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnaGlnaGxpZ2h0Q29sb3InKTtcclxuICAgIGlmIChraSA9PT0gS2kuV2hpdGUgfHwga2kgPT09IEtpLkJsYWNrKSB7XHJcbiAgICAgIHNpemUgPSBzICogMC4zNTtcclxuICAgIH1cclxuICAgIGN0eC5hcmMoeCwgeSwgc2l6ZSwgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgfVxyXG59XHJcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIEVmZmVjdEJhc2Uge1xyXG4gIHByb3RlY3RlZCBnbG9iYWxBbHBoYSA9IDE7XHJcbiAgcHJvdGVjdGVkIGNvbG9yID0gJyc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJvdGVjdGVkIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELFxyXG4gICAgcHJvdGVjdGVkIHg6IG51bWJlcixcclxuICAgIHByb3RlY3RlZCB5OiBudW1iZXIsXHJcbiAgICBwcm90ZWN0ZWQgc2l6ZTogbnVtYmVyLFxyXG4gICAgcHJvdGVjdGVkIGtpOiBudW1iZXJcclxuICApIHt9XHJcblxyXG4gIHBsYXkoKSB7XHJcbiAgICAvLyBCYXNlIHBsYXkgbWV0aG9kIC0gdG8gYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3Nlc1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgRWZmZWN0QmFzZSBmcm9tICcuL0VmZmVjdEJhc2UnO1xyXG5pbXBvcnQge2VuY29kZX0gZnJvbSAnanMtYmFzZTY0JztcclxuXHJcbmNvbnN0IGJhblN2ZyA9IGA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiBmaWxsPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJiaSBiaS1iYW5cIiB2aWV3Qm94PVwiMCAwIDE2IDE2XCI+XHJcbiAgPHBhdGggZD1cIk0xNSA4YTYuOTcgNi45NyAwIDAgMC0xLjcxLTQuNTg0bC05Ljg3NCA5Ljg3NUE3IDcgMCAwIDAgMTUgOE0yLjcxIDEyLjU4NGw5Ljg3NC05Ljg3NWE3IDcgMCAwIDAtOS44NzQgOS44NzRaTTE2IDhBOCA4IDAgMSAxIDAgOGE4IDggMCAwIDEgMTYgMFwiLz5cclxuPC9zdmc+YDtcclxuXHJcbmV4cG9ydCBjbGFzcyBCYW5FZmZlY3QgZXh0ZW5kcyBFZmZlY3RCYXNlIHtcclxuICBwcml2YXRlIGltZyA9IG5ldyBJbWFnZSgpO1xyXG4gIHByaXZhdGUgYWxwaGEgPSAwO1xyXG4gIHByaXZhdGUgZmFkZUluRHVyYXRpb24gPSAyMDA7XHJcbiAgcHJpdmF0ZSBmYWRlT3V0RHVyYXRpb24gPSAxNTA7XHJcbiAgcHJpdmF0ZSBzdGF5RHVyYXRpb24gPSA0MDA7XHJcbiAgcHJpdmF0ZSBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcbiAgcHJpdmF0ZSBpc0ZhZGluZ091dCA9IGZhbHNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByb3RlY3RlZCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgIHByb3RlY3RlZCB4OiBudW1iZXIsXHJcbiAgICBwcm90ZWN0ZWQgeTogbnVtYmVyLFxyXG4gICAgcHJvdGVjdGVkIHNpemU6IG51bWJlcixcclxuICAgIHByb3RlY3RlZCBraTogbnVtYmVyXHJcbiAgKSB7XHJcbiAgICBzdXBlcihjdHgsIHgsIHksIHNpemUsIGtpKTtcclxuXHJcbiAgICAvLyBDb252ZXJ0IFNWRyBzdHJpbmcgdG8gYSBkYXRhIFVSTFxyXG4gICAgY29uc3Qgc3ZnQmxvYiA9IG5ldyBCbG9iKFtiYW5TdmddLCB7dHlwZTogJ2ltYWdlL3N2Zyt4bWwnfSk7XHJcblxyXG4gICAgY29uc3Qgc3ZnRGF0YVVybCA9IGBkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCR7ZW5jb2RlKGJhblN2Zyl9YDtcclxuXHJcbiAgICB0aGlzLmltZyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy5pbWcuc3JjID0gc3ZnRGF0YVVybDtcclxuICB9XHJcblxyXG4gIHBsYXkgPSAoKSA9PiB7XHJcbiAgICBpZiAoIXRoaXMuaW1nLmNvbXBsZXRlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7Y3R4LCB4LCB5LCBzaXplLCBpbWcsIGZhZGVJbkR1cmF0aW9uLCBmYWRlT3V0RHVyYXRpb259ID0gdGhpcztcclxuXHJcbiAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuc3RhcnRUaW1lKSB7XHJcbiAgICAgIHRoaXMuc3RhcnRUaW1lID0gbm93O1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5jbGVhclJlY3QoeCAtIHNpemUgLyAyLCB5IC0gc2l6ZSAvIDIsIHNpemUsIHNpemUpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5hbHBoYTtcclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCB4IC0gc2l6ZSAvIDIsIHkgLSBzaXplIC8gMiwgc2l6ZSwgc2l6ZSk7XHJcbiAgICBjdHguZ2xvYmFsQWxwaGEgPSAxO1xyXG5cclxuICAgIGNvbnN0IGVsYXBzZWQgPSBub3cgLSB0aGlzLnN0YXJ0VGltZTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaXNGYWRpbmdPdXQpIHtcclxuICAgICAgdGhpcy5hbHBoYSA9IE1hdGgubWluKGVsYXBzZWQgLyBmYWRlSW5EdXJhdGlvbiwgMSk7XHJcbiAgICAgIGlmIChlbGFwc2VkID49IGZhZGVJbkR1cmF0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5hbHBoYSA9IDE7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLmlzRmFkaW5nT3V0ID0gdHJ1ZTtcclxuICAgICAgICAgIHRoaXMuc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcbiAgICAgICAgfSwgdGhpcy5zdGF5RHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zdCBmYWRlRWxhcHNlZCA9IG5vdyAtIHRoaXMuc3RhcnRUaW1lO1xyXG4gICAgICB0aGlzLmFscGhhID0gTWF0aC5tYXgoMSAtIGZhZGVFbGFwc2VkIC8gZmFkZU91dER1cmF0aW9uLCAwKTtcclxuICAgICAgaWYgKGZhZGVFbGFwc2VkID49IGZhZGVPdXREdXJhdGlvbikge1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSAwO1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoeCAtIHNpemUgLyAyLCB5IC0gc2l6ZSAvIDIsIHNpemUsIHNpemUpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnBsYXkpO1xyXG4gIH07XHJcbn1cclxuIiwiaW1wb3J0IHtjb21wYWN0fSBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQge1xyXG4gIGNhbGNWaXNpYmxlQXJlYSxcclxuICByZXZlcnNlT2Zmc2V0LFxyXG4gIHplcm9zLFxyXG4gIGVtcHR5LFxyXG4gIGExVG9Qb3MsXHJcbiAgYTFUb0luZGV4LFxyXG4gIG9mZnNldEExTW92ZSxcclxuICBjYW5Nb3ZlLFxyXG59IGZyb20gJy4vaGVscGVyJztcclxuaW1wb3J0IHtcclxuICBBMV9MRVRURVJTLFxyXG4gIEExX05VTUJFUlMsXHJcbiAgREVGQVVMVF9PUFRJT05TLFxyXG4gIE1BWF9CT0FSRF9TSVpFLFxyXG4gIFRIRU1FX1JFU09VUkNFUyxcclxuICBCQVNFX1RIRU1FX0NPTkZJRyxcclxufSBmcm9tICcuL2NvbnN0JztcclxuaW1wb3J0IHtcclxuICBDdXJzb3IsXHJcbiAgTWFya3VwLFxyXG4gIFRoZW1lLFxyXG4gIEtpLFxyXG4gIEFuYWx5c2lzLFxyXG4gIEdob3N0QmFuT3B0aW9ucyxcclxuICBHaG9zdEJhbk9wdGlvbnNQYXJhbXMsXHJcbiAgQ2VudGVyLFxyXG4gIEFuYWx5c2lzUG9pbnRUaGVtZSxcclxuICBFZmZlY3QsXHJcbiAgVGhlbWVPcHRpb25zLFxyXG4gIFRoZW1lQ29uZmlnLFxyXG4gIFRoZW1lUHJvcGVydHlLZXksXHJcbiAgVGhlbWVDb250ZXh0LFxyXG59IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuaW1wb3J0IHtJbWFnZVN0b25lLCBGbGF0U3RvbmV9IGZyb20gJy4vc3RvbmVzJztcclxuaW1wb3J0IEFuYWx5c2lzUG9pbnQgZnJvbSAnLi9zdG9uZXMvQW5hbHlzaXNQb2ludCc7XHJcblxyXG5pbXBvcnQge1xyXG4gIENpcmNsZU1hcmt1cCxcclxuICBDcm9zc01hcmt1cCxcclxuICBUZXh0TWFya3VwLFxyXG4gIFNxdWFyZU1hcmt1cCxcclxuICBUcmlhbmdsZU1hcmt1cCxcclxuICBOb2RlTWFya3VwLFxyXG4gIEFjdGl2ZU5vZGVNYXJrdXAsXHJcbiAgQ2lyY2xlU29saWRNYXJrdXAsXHJcbiAgSGlnaGxpZ2h0TWFya3VwLFxyXG59IGZyb20gJy4vbWFya3Vwcyc7XHJcbmltcG9ydCB7QmFuRWZmZWN0fSBmcm9tICcuL2VmZmVjdHMnO1xyXG5cclxuY29uc3QgZ2V0VGhlbWVSZXNvdXJjZXMgPSAoXHJcbiAgdGhlbWU6IFRoZW1lLFxyXG4gIHRoZW1lUmVzb3VyY2VzOiBhbnksXHJcbiAgYm9hcmRTaXplOiBudW1iZXIgPSA1MTJcclxuKSA9PiB7XHJcbiAgY29uc3QgcmVzb3VyY2VzID0gdGhlbWVSZXNvdXJjZXNbdGhlbWVdO1xyXG4gIGlmICghcmVzb3VyY2VzKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgLy8gSWYgYm9hcmQgc2l6ZSA8IDI1NiBhbmQgbWljcm9SZXMgZXhpc3RzLCB1c2UgbWljcm9SZXMgcmVzb3VyY2VzXHJcbiAgaWYgKGJvYXJkU2l6ZSA8IDI1NiAmJiByZXNvdXJjZXMubWljcm9SZXMpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGJvYXJkOiByZXNvdXJjZXMubWljcm9SZXMuYm9hcmQgfHwgcmVzb3VyY2VzLmJvYXJkLFxyXG4gICAgICBibGFja3M6XHJcbiAgICAgICAgcmVzb3VyY2VzLm1pY3JvUmVzLmJsYWNrcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgICAgPyByZXNvdXJjZXMubWljcm9SZXMuYmxhY2tzXHJcbiAgICAgICAgICA6IHJlc291cmNlcy5ibGFja3MsXHJcbiAgICAgIHdoaXRlczpcclxuICAgICAgICByZXNvdXJjZXMubWljcm9SZXMud2hpdGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgICA/IHJlc291cmNlcy5taWNyb1Jlcy53aGl0ZXNcclxuICAgICAgICAgIDogcmVzb3VyY2VzLndoaXRlcyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBJZiBib2FyZCBzaXplIDwgNTEyIGFuZCBsb3dSZXMgZXhpc3RzLCB1c2UgbG93UmVzIHJlc291cmNlc1xyXG4gIGlmIChib2FyZFNpemUgPCA1MTIgJiYgcmVzb3VyY2VzLmxvd1Jlcykge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYm9hcmQ6IHJlc291cmNlcy5sb3dSZXMuYm9hcmQgfHwgcmVzb3VyY2VzLmJvYXJkLFxyXG4gICAgICBibGFja3M6XHJcbiAgICAgICAgcmVzb3VyY2VzLmxvd1Jlcy5ibGFja3M/Lmxlbmd0aCA+IDBcclxuICAgICAgICAgID8gcmVzb3VyY2VzLmxvd1Jlcy5ibGFja3NcclxuICAgICAgICAgIDogcmVzb3VyY2VzLmJsYWNrcyxcclxuICAgICAgd2hpdGVzOlxyXG4gICAgICAgIHJlc291cmNlcy5sb3dSZXMud2hpdGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgICA/IHJlc291cmNlcy5sb3dSZXMud2hpdGVzXHJcbiAgICAgICAgICA6IHJlc291cmNlcy53aGl0ZXMsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLy8gT3RoZXJ3aXNlIHVzZSByZWd1bGFyIHJlc291cmNlc1xyXG4gIHJldHVybiB7XHJcbiAgICBib2FyZDogcmVzb3VyY2VzLmJvYXJkLFxyXG4gICAgYmxhY2tzOiByZXNvdXJjZXMuYmxhY2tzLFxyXG4gICAgd2hpdGVzOiByZXNvdXJjZXMud2hpdGVzLFxyXG4gIH07XHJcbn07XHJcblxyXG4vLyBHZXQgYWxsIHRoZW1lIHJlc291cmNlcyBmb3IgcHJlbG9hZGluZyAoYWxsIHJlc29sdXRpb25zKVxyXG5jb25zdCBnZXRBbGxUaGVtZVJlc291cmNlcyA9ICh0aGVtZTogVGhlbWUsIHRoZW1lUmVzb3VyY2VzOiBhbnkpID0+IHtcclxuICBjb25zdCByZXNvdXJjZXMgPSB0aGVtZVJlc291cmNlc1t0aGVtZV07XHJcbiAgaWYgKCFyZXNvdXJjZXMpIHJldHVybiBbXTtcclxuXHJcbiAgY29uc3QgYWxsSW1hZ2VzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAvLyBBZGQgcmVndWxhciByZXNvbHV0aW9uIHJlc291cmNlc1xyXG4gIGlmIChyZXNvdXJjZXMuYm9hcmQpIGFsbEltYWdlcy5wdXNoKHJlc291cmNlcy5ib2FyZCk7XHJcbiAgaWYgKHJlc291cmNlcy5ibGFja3MpIGFsbEltYWdlcy5wdXNoKC4uLnJlc291cmNlcy5ibGFja3MpO1xyXG4gIGlmIChyZXNvdXJjZXMud2hpdGVzKSBhbGxJbWFnZXMucHVzaCguLi5yZXNvdXJjZXMud2hpdGVzKTtcclxuXHJcbiAgLy8gQWRkIGxvd1JlcyByZXNvdXJjZXMgaWYgdGhleSBleGlzdFxyXG4gIGlmIChyZXNvdXJjZXMubG93UmVzKSB7XHJcbiAgICBpZiAocmVzb3VyY2VzLmxvd1Jlcy5ib2FyZCkgYWxsSW1hZ2VzLnB1c2gocmVzb3VyY2VzLmxvd1Jlcy5ib2FyZCk7XHJcbiAgICBpZiAocmVzb3VyY2VzLmxvd1Jlcy5ibGFja3MpIGFsbEltYWdlcy5wdXNoKC4uLnJlc291cmNlcy5sb3dSZXMuYmxhY2tzKTtcclxuICAgIGlmIChyZXNvdXJjZXMubG93UmVzLndoaXRlcykgYWxsSW1hZ2VzLnB1c2goLi4ucmVzb3VyY2VzLmxvd1Jlcy53aGl0ZXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gQWRkIG1pY3JvUmVzIHJlc291cmNlcyBpZiB0aGV5IGV4aXN0XHJcbiAgaWYgKHJlc291cmNlcy5taWNyb1Jlcykge1xyXG4gICAgaWYgKHJlc291cmNlcy5taWNyb1Jlcy5ib2FyZCkgYWxsSW1hZ2VzLnB1c2gocmVzb3VyY2VzLm1pY3JvUmVzLmJvYXJkKTtcclxuICAgIGlmIChyZXNvdXJjZXMubWljcm9SZXMuYmxhY2tzKSBhbGxJbWFnZXMucHVzaCguLi5yZXNvdXJjZXMubWljcm9SZXMuYmxhY2tzKTtcclxuICAgIGlmIChyZXNvdXJjZXMubWljcm9SZXMud2hpdGVzKSBhbGxJbWFnZXMucHVzaCguLi5yZXNvdXJjZXMubWljcm9SZXMud2hpdGVzKTtcclxuICB9XHJcblxyXG4gIC8vIFJlbW92ZSBkdXBsaWNhdGVzXHJcbiAgcmV0dXJuIEFycmF5LmZyb20obmV3IFNldChhbGxJbWFnZXMpKTtcclxufTtcclxuXHJcbmNvbnN0IGltYWdlczoge1xyXG4gIFtrZXk6IHN0cmluZ106IEhUTUxJbWFnZUVsZW1lbnQ7XHJcbn0gPSB7fTtcclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBzZXQgaGlnaC1xdWFsaXR5IGltYWdlIHNtb290aGluZyBmb3IgY2FudmFzIGNvbnRleHRcclxuY29uc3Qgc2V0SW1hZ2VTbW9vdGhpbmdRdWFsaXR5ID0gKFxyXG4gIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgbnVsbCB8IHVuZGVmaW5lZFxyXG4pID0+IHtcclxuICBpZiAoY3R4KSB7XHJcbiAgICBjdHguaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gdHJ1ZTtcclxuICAgIGN0eC5pbWFnZVNtb290aGluZ1F1YWxpdHkgPSAnaGlnaCc7XHJcbiAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gaXNNb2JpbGVEZXZpY2UoKSB7XHJcbiAgcmV0dXJuIC9Nb2JpfEFuZHJvaWR8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaS50ZXN0KFxyXG4gICAgbmF2aWdhdG9yLnVzZXJBZ2VudFxyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByZWxvYWQoXHJcbiAgdXJsczogc3RyaW5nW10sXHJcbiAgZG9uZTogKCkgPT4gdm9pZCxcclxuICBvbkltYWdlTG9hZGVkPzogKHVybDogc3RyaW5nKSA9PiB2b2lkXHJcbikge1xyXG4gIGxldCBsb2FkZWQgPSAwO1xyXG4gIGNvbnN0IGltYWdlTG9hZGVkID0gKCkgPT4ge1xyXG4gICAgbG9hZGVkKys7XHJcbiAgICBpZiAobG9hZGVkID09PSB1cmxzLmxlbmd0aCkge1xyXG4gICAgICBkb25lKCk7XHJcbiAgICB9XHJcbiAgfTtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICghaW1hZ2VzW3VybHNbaV1dKSB7XHJcbiAgICAgIGltYWdlc1t1cmxzW2ldXSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICBpbWFnZXNbdXJsc1tpXV0uc3JjID0gdXJsc1tpXTtcclxuICAgICAgaW1hZ2VzW3VybHNbaV1dLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpbWFnZUxvYWRlZCgpO1xyXG4gICAgICAgIC8vIENhbGxiYWNrIHdoZW4gc2luZ2xlIGltYWdlIGxvYWQgY29tcGxldGVzXHJcbiAgICAgICAgaWYgKG9uSW1hZ2VMb2FkZWQpIHtcclxuICAgICAgICAgIG9uSW1hZ2VMb2FkZWQodXJsc1tpXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBpbWFnZXNbdXJsc1tpXV0ub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpbWFnZUxvYWRlZCgpO1xyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIGlmIChpbWFnZXNbdXJsc1tpXV0uY29tcGxldGUpIHtcclxuICAgICAgLy8gSW1hZ2UgYWxyZWFkeSBsb2FkZWRcclxuICAgICAgaW1hZ2VMb2FkZWQoKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmxldCBkcHIgPSAxLjA7XHJcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xyXG4gIGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDEuMDtcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9USEVNRV9PUFRJT05TOiBUaGVtZU9wdGlvbnMgPSB7XHJcbiAgZGVmYXVsdDogQkFTRV9USEVNRV9DT05GSUcsXHJcbiAgW1RoZW1lLkZsYXRdOiB7XHJcbiAgICBib2FyZEJhY2tncm91bmRDb2xvcjogJyNlNmJiODUnLFxyXG4gIH0sXHJcbiAgW1RoZW1lLldhcm1dOiB7XHJcbiAgICBib2FyZEJhY2tncm91bmRDb2xvcjogJyNDMThCNTAnLFxyXG4gIH0sXHJcbiAgW1RoZW1lLkRhcmtdOiB7XHJcbiAgICBhY3RpdmVDb2xvcjogJyM5Q0EzQUYnLFxyXG4gICAgaW5hY3RpdmVDb2xvcjogJyM2NjY2NjYnLFxyXG4gICAgYm9hcmRMaW5lQ29sb3I6ICcjOUNBM0FGJyxcclxuICAgIGJvYXJkQmFja2dyb3VuZENvbG9yOiAnIzJCMzAzNScsXHJcbiAgfSxcclxuICBbVGhlbWUuWXVuemlNb25rZXlEYXJrXToge1xyXG4gICAgYWN0aXZlQ29sb3I6ICcjQTFDOUFGJyxcclxuICAgIGluYWN0aXZlQ29sb3I6ICcjQTFDOUFGJyxcclxuICAgIGJvYXJkTGluZUNvbG9yOiAnI0ExQzlBRicsXHJcbiAgICBmbGF0QmxhY2tDb2xvcjogJyMwRTIwMTknLFxyXG4gICAgZmxhdEJsYWNrQ29sb3JBbHQ6ICcjMDIxRDExJyxcclxuICAgIGZsYXRXaGl0ZUNvbG9yOiAnI0EyQzhCNCcsXHJcbiAgICBmbGF0V2hpdGVDb2xvckFsdDogJyNBRkNCQkMnLFxyXG4gICAgc2hhZG93Q29sb3I6ICdyZ2JhKDAsIDAsIDAsIDAuMSknLFxyXG4gICAgc3RvbmVSYXRpbzogMC41MTE1LFxyXG4gIH0sXHJcbiAgW1RoZW1lLkhpZ2hDb250cmFzdF06IHtcclxuICAgIC8vIEhpZ2ggY29udHJhc3QgdGhlbWUsIGZyaWVuZGx5IGZvciBhbGwgdHlwZXMgb2YgY29sb3IgYmxpbmRuZXNzXHJcbiAgICBib2FyZEJhY2tncm91bmRDb2xvcjogJyNGNUY1REMnLCAvLyBCZWlnZSBiYWNrZ3JvdW5kLCBnZW50bGUgb24gZXllc1xyXG4gICAgYm9hcmRMaW5lQ29sb3I6ICcjMkY0RjRGJywgLy8gRGFyayBzbGF0ZSBncmF5IGxpbmVzIGZvciBoaWdoIGNvbnRyYXN0XHJcbiAgICBhY3RpdmVDb2xvcjogJyMyRjRGNEYnLFxyXG4gICAgaW5hY3RpdmVDb2xvcjogJyM4MDgwODAnLFxyXG5cclxuICAgIC8vIFN0b25lIGNvbG9yczogdHJhZGl0aW9uYWwgYmxhY2sgYW5kIHdoaXRlIGZvciBtYXhpbXVtIGNvbnRyYXN0IGFuZCBjb2xvciBibGluZCBmcmllbmRsaW5lc3NcclxuICAgIGZsYXRCbGFja0NvbG9yOiAnIzAwMDAwMCcsIC8vIFB1cmUgYmxhY2sgLSB1bml2ZXJzYWxseSBhY2Nlc3NpYmxlXHJcbiAgICBmbGF0QmxhY2tDb2xvckFsdDogJyMxQTFBMUEnLCAvLyBWZXJ5IGRhcmsgZ3JheSB2YXJpYW50XHJcbiAgICBmbGF0V2hpdGVDb2xvcjogJyNGRkZGRkYnLCAvLyBQdXJlIHdoaXRlIC0gbWF4aW11bSBjb250cmFzdCB3aXRoIGJsYWNrXHJcbiAgICBmbGF0V2hpdGVDb2xvckFsdDogJyNGOEY4RjgnLCAvLyBWZXJ5IGxpZ2h0IGdyYXkgdmFyaWFudFxyXG5cclxuICAgIC8vIE5vZGUgYW5kIG1hcmt1cCBjb2xvcnMgLSB1c2luZyBjb2xvcmJsaW5kLWZyaWVuZGx5IGNvbG9ycyB0aGF0IGF2b2lkIHJlZC1ncmVlbiBjb21iaW5hdGlvbnNcclxuICAgIHBvc2l0aXZlTm9kZUNvbG9yOiAnIzAyODRDNycsIC8vIEJsdWUgKHBvc2l0aXZlKSAtIHNhZmUgZm9yIGFsbCBjb2xvciBibGluZG5lc3MgdHlwZXNcclxuICAgIG5lZ2F0aXZlTm9kZUNvbG9yOiAnI0VBNTgwQycsIC8vIE9yYW5nZSAobmVnYXRpdmUpIC0gZGlzdGluZ3Vpc2hhYmxlIGZyb20gYmx1ZSBmb3IgYWxsIHVzZXJzXHJcbiAgICBuZXV0cmFsTm9kZUNvbG9yOiAnIzdDMkQxMicsIC8vIEJyb3duIChuZXV0cmFsKSAtIGFsdGVybmF0aXZlIHRvIHByb2JsZW1hdGljIGNvbG9yc1xyXG4gICAgZGVmYXVsdE5vZGVDb2xvcjogJyM0QjU1NjMnLCAvLyBEYXJrIGdyYXlcclxuICAgIHdhcm5pbmdOb2RlQ29sb3I6ICcjRkJCRjI0JywgLy8gQnJpZ2h0IHllbGxvdyB3YXJuaW5nXHJcblxyXG4gICAgLy8gSGlnaGxpZ2h0IGFuZCBzaGFkb3dcclxuICAgIGhpZ2hsaWdodENvbG9yOiAnI0ZERTA0NycsIC8vIEJyaWdodCB5ZWxsb3cgaGlnaGxpZ2h0XHJcbiAgICBzaGFkb3dDb2xvcjogJyMzNzQxNTEnLCAvLyBEYXJrIGdyYXkgc2hhZG93XHJcbiAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBHaG9zdEJhbiB7XHJcbiAgZGVmYXVsdE9wdGlvbnM6IEdob3N0QmFuT3B0aW9ucyA9IHtcclxuICAgIGJvYXJkU2l6ZTogMTksXHJcbiAgICBkeW5hbWljUGFkZGluZzogZmFsc2UsXHJcbiAgICBwYWRkaW5nOiAxMCxcclxuICAgIGV4dGVudDogMyxcclxuICAgIGludGVyYWN0aXZlOiBmYWxzZSxcclxuICAgIGNvb3JkaW5hdGU6IHRydWUsXHJcbiAgICB0aGVtZTogVGhlbWUuQmxhY2tBbmRXaGl0ZSxcclxuICAgIGFuYWx5c2lzUG9pbnRUaGVtZTogQW5hbHlzaXNQb2ludFRoZW1lLkRlZmF1bHQsXHJcbiAgICBiYWNrZ3JvdW5kOiBmYWxzZSxcclxuICAgIHNob3dBbmFseXNpczogZmFsc2UsXHJcbiAgICBzaG93T3duZXJzaGlwOiBmYWxzZSxcclxuICAgIGFkYXB0aXZlQm9hcmRMaW5lOiB0cnVlLFxyXG4gICAgdGhlbWVPcHRpb25zOiBERUZBVUxUX1RIRU1FX09QVElPTlMsXHJcbiAgICB0aGVtZVJlc291cmNlczogVEhFTUVfUkVTT1VSQ0VTLFxyXG4gICAgbW92ZVNvdW5kOiBmYWxzZSxcclxuICAgIGFkYXB0aXZlU3RhclNpemU6IHRydWUsXHJcbiAgICBtb2JpbGVJbmRpY2F0b3JPZmZzZXQ6IDAsXHJcbiAgfTtcclxuICBvcHRpb25zOiBHaG9zdEJhbk9wdGlvbnM7XHJcbiAgZG9tOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZDtcclxuICBjYW52YXM/OiBIVE1MQ2FudmFzRWxlbWVudDtcclxuICBib2FyZD86IEhUTUxDYW52YXNFbGVtZW50O1xyXG4gIGFuYWx5c2lzQ2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgY3Vyc29yQ2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgbWFya3VwQ2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgZWZmZWN0Q2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgb3duZXJzaGlwQ2FudmFzPzogSFRNTENhbnZhc0VsZW1lbnQ7XHJcbiAgbW92ZVNvdW5kQXVkaW8/OiBIVE1MQXVkaW9FbGVtZW50O1xyXG4gIHR1cm46IEtpO1xyXG4gIHByaXZhdGUgY3Vyc29yOiBDdXJzb3IgPSBDdXJzb3IuTm9uZTtcclxuICBwcml2YXRlIGN1cnNvclZhbHVlOiBzdHJpbmcgPSAnJztcclxuICBwcml2YXRlIHRvdWNoTW92aW5nID0gZmFsc2U7XHJcbiAgcHJpdmF0ZSB0b3VjaFN0YXJ0UG9pbnQ6IERPTVBvaW50ID0gbmV3IERPTVBvaW50KCk7XHJcbiAgcHVibGljIGN1cnNvclBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdO1xyXG4gIHB1YmxpYyBhY3R1YWxDdXJzb3JQb3NpdGlvbjogW251bWJlciwgbnVtYmVyXTtcclxuICBwdWJsaWMgY3Vyc29yUG9pbnQ6IERPTVBvaW50ID0gbmV3IERPTVBvaW50KCk7XHJcbiAgcHVibGljIGFjdHVhbEN1cnNvclBvaW50OiBET01Qb2ludCA9IG5ldyBET01Qb2ludCgpO1xyXG4gIHB1YmxpYyBtYXQ6IG51bWJlcltdW107XHJcbiAgcHVibGljIG1hcmt1cDogc3RyaW5nW11bXTtcclxuICBwdWJsaWMgdmlzaWJsZUFyZWFNYXQ6IG51bWJlcltdW10gfCB1bmRlZmluZWQ7XHJcbiAgcHVibGljIHByZXZlbnRNb3ZlTWF0OiBudW1iZXJbXVtdO1xyXG4gIHB1YmxpYyBlZmZlY3RNYXQ6IHN0cmluZ1tdW107XHJcbiAgcHJpdmF0ZSBwcmV2aW91c0JvYXJkU3RhdGU6IG51bWJlcltdW10gfCBudWxsID0gbnVsbDtcclxuICBtYXhodjogbnVtYmVyO1xyXG4gIHRyYW5zTWF0OiBET01NYXRyaXg7XHJcbiAgYW5hbHlzaXM6IEFuYWx5c2lzIHwgbnVsbDtcclxuICB2aXNpYmxlQXJlYTogbnVtYmVyW11bXTtcclxuICBub2RlTWFya3VwU3R5bGVzOiB7XHJcbiAgICBba2V5OiBzdHJpbmddOiB7XHJcbiAgICAgIGNvbG9yOiBzdHJpbmc7XHJcbiAgICAgIGxpbmVEYXNoOiBudW1iZXJbXTtcclxuICAgIH07XHJcbiAgfSA9IHt9O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBHaG9zdEJhbk9wdGlvbnNQYXJhbXMgPSB7fSkge1xyXG4gICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAuLi50aGlzLmRlZmF1bHRPcHRpb25zLFxyXG4gICAgICAuLi5vcHRpb25zLFxyXG4gICAgICB0aGVtZU9wdGlvbnM6IHtcclxuICAgICAgICAuLi50aGlzLmRlZmF1bHRPcHRpb25zLnRoZW1lT3B0aW9ucyxcclxuICAgICAgICAuLi4ob3B0aW9ucy50aGVtZU9wdGlvbnMgfHwge30pLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuICAgIGNvbnN0IHNpemUgPSB0aGlzLm9wdGlvbnMuYm9hcmRTaXplO1xyXG4gICAgdGhpcy5tYXQgPSB6ZXJvcyhbc2l6ZSwgc2l6ZV0pO1xyXG4gICAgdGhpcy5wcmV2ZW50TW92ZU1hdCA9IHplcm9zKFtzaXplLCBzaXplXSk7XHJcbiAgICB0aGlzLm1hcmt1cCA9IGVtcHR5KFtzaXplLCBzaXplXSk7XHJcbiAgICB0aGlzLmVmZmVjdE1hdCA9IGVtcHR5KFtzaXplLCBzaXplXSk7XHJcbiAgICB0aGlzLnR1cm4gPSBLaS5CbGFjaztcclxuICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSBbLTEsIC0xXTtcclxuICAgIHRoaXMuYWN0dWFsQ3Vyc29yUG9zaXRpb24gPSBbLTEsIC0xXTtcclxuICAgIHRoaXMubWF4aHYgPSBzaXplO1xyXG4gICAgdGhpcy50cmFuc01hdCA9IG5ldyBET01NYXRyaXgoKTtcclxuICAgIHRoaXMuYW5hbHlzaXMgPSBudWxsO1xyXG4gICAgdGhpcy52aXNpYmxlQXJlYSA9IFtcclxuICAgICAgWzAsIHNpemUgLSAxXSxcclxuICAgICAgWzAsIHNpemUgLSAxXSxcclxuICAgIF07XHJcblxyXG4gICAgdGhpcy51cGRhdGVOb2RlTWFya3VwU3R5bGVzKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldFRoZW1lUHJvcGVydHk8VCBleHRlbmRzIGtleW9mIFRoZW1lQ29uZmlnPihcclxuICAgIHByb3BlcnR5S2V5OiBUXHJcbiAgKTogVGhlbWVDb25maWdbVF07XHJcbiAgcHJpdmF0ZSBnZXRUaGVtZVByb3BlcnR5KHByb3BlcnR5S2V5OiBUaGVtZVByb3BlcnR5S2V5KTogc3RyaW5nIHwgbnVtYmVyO1xyXG4gIHByaXZhdGUgZ2V0VGhlbWVQcm9wZXJ0eTxUIGV4dGVuZHMga2V5b2YgVGhlbWVDb25maWc+KFxyXG4gICAgcHJvcGVydHlLZXk6IFQgfCBUaGVtZVByb3BlcnR5S2V5XHJcbiAgKTogVGhlbWVDb25maWdbVF0gfCBzdHJpbmcgfCBudW1iZXIge1xyXG4gICAgY29uc3Qga2V5ID1cclxuICAgICAgdHlwZW9mIHByb3BlcnR5S2V5ID09PSAnc3RyaW5nJyA/IHByb3BlcnR5S2V5IDogKHByb3BlcnR5S2V5IGFzIHN0cmluZyk7XHJcbiAgICBjb25zdCBjdXJyZW50VGhlbWUgPSB0aGlzLm9wdGlvbnMudGhlbWU7XHJcbiAgICBjb25zdCB0aGVtZUNvbmZpZyA9IHRoaXMub3B0aW9ucy50aGVtZU9wdGlvbnNbY3VycmVudFRoZW1lXSB8fCB7fTtcclxuICAgIGNvbnN0IGRlZmF1bHRDb25maWcgPSB0aGlzLm9wdGlvbnMudGhlbWVPcHRpb25zLmRlZmF1bHQgfHwge307XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gKHRoZW1lQ29uZmlnW2tleSBhcyBrZXlvZiBUaGVtZUNvbmZpZ10gfHxcclxuICAgICAgZGVmYXVsdENvbmZpZ1trZXkgYXMga2V5b2YgVGhlbWVDb25maWddKSBhcyBUaGVtZUNvbmZpZ1tUXTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIHRoZW1lIGNvbnRleHQgZm9yIG1hcmt1cCBjb21wb25lbnRzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVUaGVtZUNvbnRleHQoKTogVGhlbWVDb250ZXh0IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRoZW1lOiB0aGlzLm9wdGlvbnMudGhlbWUsXHJcbiAgICAgIHRoZW1lT3B0aW9uczogdGhpcy5vcHRpb25zLnRoZW1lT3B0aW9ucyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZU5vZGVNYXJrdXBTdHlsZXMoKSB7XHJcbiAgICBjb25zdCBkZWZhdWx0RGFzaGVkTGluZURhc2ggPSBbOCwgNl07XHJcbiAgICBjb25zdCBkZWZhdWx0RG90dGVkTGluZURhc2ggPSBbNCwgNF07XHJcblxyXG4gICAgdGhpcy5ub2RlTWFya3VwU3R5bGVzID0ge1xyXG4gICAgICBbTWFya3VwLlBvc2l0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuUG9zaXRpdmVOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBbXSxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5OZWdhdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5Lk5lZ2F0aXZlTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogW10sXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuTmV1dHJhbE5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5Lk5ldXRyYWxOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBbXSxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5EZWZhdWx0Tm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuRGVmYXVsdE5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IFtdLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLldhcm5pbmdOb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5XYXJuaW5nTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogW10sXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuUG9zaXRpdmVEYXNoZWROb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5Qb3NpdGl2ZU5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREYXNoZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5OZWdhdGl2ZURhc2hlZE5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5Lk5lZ2F0aXZlTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogZGVmYXVsdERhc2hlZExpbmVEYXNoLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLk5ldXRyYWxEYXNoZWROb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZXV0cmFsTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogZGVmYXVsdERhc2hlZExpbmVEYXNoLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLkRlZmF1bHREYXNoZWROb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5EZWZhdWx0Tm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogZGVmYXVsdERhc2hlZExpbmVEYXNoLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLldhcm5pbmdEYXNoZWROb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5XYXJuaW5nTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogZGVmYXVsdERhc2hlZExpbmVEYXNoLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLlBvc2l0aXZlRG90dGVkTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuUG9zaXRpdmVOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RG90dGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuTmVnYXRpdmVEb3R0ZWROb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZWdhdGl2ZU5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREb3R0ZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5OZXV0cmFsRG90dGVkTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuTmV1dHJhbE5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREb3R0ZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5EZWZhdWx0RG90dGVkTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuRGVmYXVsdE5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREb3R0ZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5XYXJuaW5nRG90dGVkTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuV2FybmluZ05vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREb3R0ZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5Qb3NpdGl2ZUFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5LlBvc2l0aXZlTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogW10sXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuTmVnYXRpdmVBY3RpdmVOb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZWdhdGl2ZU5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IFtdLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLk5ldXRyYWxBY3RpdmVOb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZXV0cmFsTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogW10sXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuRGVmYXVsdEFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5LkRlZmF1bHROb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBbXSxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5XYXJuaW5nQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuV2FybmluZ05vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IFtdLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLlBvc2l0aXZlRGFzaGVkQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuUG9zaXRpdmVOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RGFzaGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuTmVnYXRpdmVEYXNoZWRBY3RpdmVOb2RlXToge1xyXG4gICAgICAgIGNvbG9yOiB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZWdhdGl2ZU5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREYXNoZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5OZXV0cmFsRGFzaGVkQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuTmV1dHJhbE5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREYXNoZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5EZWZhdWx0RGFzaGVkQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuRGVmYXVsdE5vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREYXNoZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5XYXJuaW5nRGFzaGVkQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuV2FybmluZ05vZGVDb2xvciksXHJcbiAgICAgICAgbGluZURhc2g6IGRlZmF1bHREYXNoZWRMaW5lRGFzaCxcclxuICAgICAgfSxcclxuICAgICAgW01hcmt1cC5Qb3NpdGl2ZURvdHRlZEFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5LlBvc2l0aXZlTm9kZUNvbG9yKSxcclxuICAgICAgICBsaW5lRGFzaDogZGVmYXVsdERvdHRlZExpbmVEYXNoLFxyXG4gICAgICB9LFxyXG4gICAgICBbTWFya3VwLk5lZ2F0aXZlRG90dGVkQWN0aXZlTm9kZV06IHtcclxuICAgICAgICBjb2xvcjogdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuTmVnYXRpdmVOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RG90dGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuTmV1dHJhbERvdHRlZEFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5Lk5ldXRyYWxOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RG90dGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuRGVmYXVsdERvdHRlZEFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5LkRlZmF1bHROb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RG90dGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICAgIFtNYXJrdXAuV2FybmluZ0RvdHRlZEFjdGl2ZU5vZGVdOiB7XHJcbiAgICAgICAgY29sb3I6IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShUaGVtZVByb3BlcnR5S2V5Lldhcm5pbmdOb2RlQ29sb3IpLFxyXG4gICAgICAgIGxpbmVEYXNoOiBkZWZhdWx0RG90dGVkTGluZURhc2gsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgc2V0VHVybih0dXJuOiBLaSkge1xyXG4gICAgdGhpcy50dXJuID0gdHVybjtcclxuICB9XHJcblxyXG4gIHNldFByZXZpb3VzQm9hcmRTdGF0ZShib2FyZFN0YXRlOiBudW1iZXJbXVtdIHwgbnVsbCkge1xyXG4gICAgdGhpcy5wcmV2aW91c0JvYXJkU3RhdGUgPSBib2FyZFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgZ2V0UHJldmlvdXNCb2FyZFN0YXRlKCk6IG51bWJlcltdW10gfCBudWxsIHtcclxuICAgIHJldHVybiB0aGlzLnByZXZpb3VzQm9hcmRTdGF0ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBjdXJyZW50IGJvYXJkIHN0YXRlIGFzIGhpc3Rvcnkgc3RhdGUgZm9yIGtvIHJ1bGUgY2hlY2tpbmcgaW4gbmV4dCBtb3ZlXHJcbiAgICovXHJcbiAgcmVjb3JkQ3VycmVudEJvYXJkU3RhdGUoKSB7XHJcbiAgICB0aGlzLnByZXZpb3VzQm9hcmRTdGF0ZSA9IHRoaXMubWF0Lm1hcChyb3cgPT4gWy4uLnJvd10pO1xyXG4gIH1cclxuXHJcbiAgc2V0Qm9hcmRTaXplKHNpemU6IG51bWJlcikge1xyXG4gICAgdGhpcy5vcHRpb25zLmJvYXJkU2l6ZSA9IE1hdGgubWluKHNpemUsIE1BWF9CT0FSRF9TSVpFKTtcclxuICB9XHJcblxyXG4gIHJlc2l6ZSgpIHtcclxuICAgIGlmIChcclxuICAgICAgIXRoaXMuY2FudmFzIHx8XHJcbiAgICAgICF0aGlzLmN1cnNvckNhbnZhcyB8fFxyXG4gICAgICAhdGhpcy5kb20gfHxcclxuICAgICAgIXRoaXMuYm9hcmQgfHxcclxuICAgICAgIXRoaXMubWFya3VwQ2FudmFzIHx8XHJcbiAgICAgICF0aGlzLm93bmVyc2hpcENhbnZhcyB8fFxyXG4gICAgICAhdGhpcy5hbmFseXNpc0NhbnZhcyB8fFxyXG4gICAgICAhdGhpcy5lZmZlY3RDYW52YXNcclxuICAgIClcclxuICAgICAgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IGNhbnZhc2VzID0gW1xyXG4gICAgICB0aGlzLmJvYXJkLFxyXG4gICAgICB0aGlzLmNhbnZhcyxcclxuICAgICAgdGhpcy5tYXJrdXBDYW52YXMsXHJcbiAgICAgIHRoaXMub3duZXJzaGlwQ2FudmFzLFxyXG4gICAgICB0aGlzLmN1cnNvckNhbnZhcyxcclxuICAgICAgdGhpcy5hbmFseXNpc0NhbnZhcyxcclxuICAgICAgdGhpcy5lZmZlY3RDYW52YXMsXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IHtzaXplfSA9IHRoaXMub3B0aW9ucztcclxuICAgIGNvbnN0IHtjbGllbnRXaWR0aH0gPSB0aGlzLmRvbTtcclxuXHJcbiAgICBjYW52YXNlcy5mb3JFYWNoKGNhbnZhcyA9PiB7XHJcbiAgICAgIGlmIChzaXplKSB7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gc2l6ZSAqIGRwcjtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gc2l6ZSAqIGRwcjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjbGllbnRXaWR0aCArICdweCc7XHJcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGNsaWVudFdpZHRoICsgJ3B4JztcclxuICAgICAgICBjYW52YXMud2lkdGggPSBNYXRoLmZsb29yKGNsaWVudFdpZHRoICogZHByKTtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gTWF0aC5mbG9vcihjbGllbnRXaWR0aCAqIGRwcik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNhbnZhcyhpZDogc3RyaW5nLCBwb2ludGVyRXZlbnRzID0gdHJ1ZSk6IEhUTUxDYW52YXNFbGVtZW50IHtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgY2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgIGNhbnZhcy5pZCA9IGlkO1xyXG4gICAgaWYgKCFwb2ludGVyRXZlbnRzKSB7XHJcbiAgICAgIGNhbnZhcy5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNhbnZhcztcclxuICB9XHJcblxyXG4gIGluaXQoZG9tOiBIVE1MRWxlbWVudCkge1xyXG4gICAgY29uc3Qgc2l6ZSA9IHRoaXMub3B0aW9ucy5ib2FyZFNpemU7XHJcbiAgICB0aGlzLm1hdCA9IHplcm9zKFtzaXplLCBzaXplXSk7XHJcbiAgICB0aGlzLm1hcmt1cCA9IGVtcHR5KFtzaXplLCBzaXplXSk7XHJcbiAgICB0aGlzLnRyYW5zTWF0ID0gbmV3IERPTU1hdHJpeCgpO1xyXG5cclxuICAgIHRoaXMuYm9hcmQgPSB0aGlzLmNyZWF0ZUNhbnZhcygnZ2hvc3RiYW4tYm9hcmQnKTtcclxuICAgIHRoaXMuY2FudmFzID0gdGhpcy5jcmVhdGVDYW52YXMoJ2dob3N0YmFuLWNhbnZhcycpO1xyXG4gICAgdGhpcy5vd25lcnNoaXBDYW52YXMgPSB0aGlzLmNyZWF0ZUNhbnZhcygnZ2hvc3RiYW4tb3duZXJzaGlwJywgZmFsc2UpO1xyXG4gICAgdGhpcy5tYXJrdXBDYW52YXMgPSB0aGlzLmNyZWF0ZUNhbnZhcygnZ2hvc3RiYW4tbWFya3VwJywgZmFsc2UpO1xyXG4gICAgdGhpcy5hbmFseXNpc0NhbnZhcyA9IHRoaXMuY3JlYXRlQ2FudmFzKCdnaG9zdGJhbi1hbmFseXNpcycsIGZhbHNlKTtcclxuICAgIHRoaXMuY3Vyc29yQ2FudmFzID0gdGhpcy5jcmVhdGVDYW52YXMoJ2dob3N0YmFuLWN1cnNvcicpO1xyXG4gICAgdGhpcy5lZmZlY3RDYW52YXMgPSB0aGlzLmNyZWF0ZUNhbnZhcygnZ2hvc3RiYW4tZWZmZWN0JywgZmFsc2UpO1xyXG5cclxuICAgIHRoaXMuZG9tID0gZG9tO1xyXG4gICAgZG9tLmlubmVySFRNTCA9ICcnO1xyXG4gICAgZG9tLmFwcGVuZENoaWxkKHRoaXMuYm9hcmQpO1xyXG4gICAgZG9tLmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcclxuICAgIGRvbS5hcHBlbmRDaGlsZCh0aGlzLm93bmVyc2hpcENhbnZhcyk7XHJcbiAgICBkb20uYXBwZW5kQ2hpbGQodGhpcy5tYXJrdXBDYW52YXMpO1xyXG4gICAgZG9tLmFwcGVuZENoaWxkKHRoaXMuYW5hbHlzaXNDYW52YXMpO1xyXG4gICAgZG9tLmFwcGVuZENoaWxkKHRoaXMuY3Vyc29yQ2FudmFzKTtcclxuICAgIGRvbS5hcHBlbmRDaGlsZCh0aGlzLmVmZmVjdENhbnZhcyk7XHJcblxyXG4gICAgdGhpcy5yZXNpemUoKTtcclxuICAgIHRoaXMucmVuZGVySW50ZXJhY3RpdmUoKTtcclxuXHJcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcclxuICAgICAgICB0aGlzLnJlc2l6ZSgpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldE9wdGlvbnMob3B0aW9uczogR2hvc3RCYW5PcHRpb25zUGFyYW1zKSB7XHJcbiAgICBjb25zdCBwcmV2aW91c1Nob3dBbmFseXNpcyA9IHRoaXMub3B0aW9ucy5zaG93QW5hbHlzaXM7XHJcbiAgICBjb25zdCBwcmV2aW91c1Nob3dPd25lcnNoaXAgPSB0aGlzLm9wdGlvbnMuc2hvd093bmVyc2hpcDtcclxuXHJcbiAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgIC4uLnRoaXMub3B0aW9ucyxcclxuICAgICAgLi4ub3B0aW9ucyxcclxuICAgICAgdGhlbWVPcHRpb25zOiB7XHJcbiAgICAgICAgLi4udGhpcy5vcHRpb25zLnRoZW1lT3B0aW9ucyxcclxuICAgICAgICAuLi4ob3B0aW9ucy50aGVtZU9wdGlvbnMgfHwge30pLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuICAgIHRoaXMudXBkYXRlTm9kZU1hcmt1cFN0eWxlcygpO1xyXG4gICAgdGhpcy5yZW5kZXJJbnRlcmFjdGl2ZSgpO1xyXG5cclxuICAgIGlmIChwcmV2aW91c1Nob3dBbmFseXNpcyAmJiAhdGhpcy5vcHRpb25zLnNob3dBbmFseXNpcykge1xyXG4gICAgICB0aGlzLmNsZWFyQW5hbHlzaXNDYW52YXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocHJldmlvdXNTaG93T3duZXJzaGlwICYmICF0aGlzLm9wdGlvbnMuc2hvd093bmVyc2hpcCkge1xyXG4gICAgICB0aGlzLmNsZWFyT3duZXJzaGlwQ2FudmFzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFwcmV2aW91c1Nob3dBbmFseXNpcyAmJiB0aGlzLm9wdGlvbnMuc2hvd0FuYWx5c2lzICYmIHRoaXMuYW5hbHlzaXMpIHtcclxuICAgICAgdGhpcy5kcmF3QW5hbHlzaXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXByZXZpb3VzU2hvd093bmVyc2hpcCAmJiB0aGlzLm9wdGlvbnMuc2hvd093bmVyc2hpcCAmJiB0aGlzLmFuYWx5c2lzKSB7XHJcbiAgICAgIHRoaXMuZHJhd093bmVyc2hpcCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2V0TWF0KG1hdDogbnVtYmVyW11bXSkge1xyXG4gICAgdGhpcy5tYXQgPSBtYXQ7XHJcbiAgICBpZiAoIXRoaXMudmlzaWJsZUFyZWFNYXQpIHtcclxuICAgICAgdGhpcy52aXNpYmxlQXJlYU1hdCA9IG1hdDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldFZpc2libGVBcmVhTWF0KG1hdDogbnVtYmVyW11bXSkge1xyXG4gICAgdGhpcy52aXNpYmxlQXJlYU1hdCA9IG1hdDtcclxuICB9XHJcblxyXG4gIHNldFByZXZlbnRNb3ZlTWF0KG1hdDogbnVtYmVyW11bXSkge1xyXG4gICAgdGhpcy5wcmV2ZW50TW92ZU1hdCA9IG1hdDtcclxuICB9XHJcblxyXG4gIHNldEVmZmVjdE1hdChtYXQ6IHN0cmluZ1tdW10pIHtcclxuICAgIHRoaXMuZWZmZWN0TWF0ID0gbWF0O1xyXG4gIH1cclxuXHJcbiAgc2V0TWFya3VwKG1hcmt1cDogc3RyaW5nW11bXSkge1xyXG4gICAgdGhpcy5tYXJrdXAgPSBtYXJrdXA7XHJcbiAgfVxyXG5cclxuICBzZXRDdXJzb3IoY3Vyc29yOiBDdXJzb3IsIHZhbHVlID0gJycpIHtcclxuICAgIHRoaXMuY3Vyc29yID0gY3Vyc29yO1xyXG4gICAgdGhpcy5jdXJzb3JWYWx1ZSA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgc2V0Q3Vyc29yV2l0aFJlbmRlciA9IChkb21Qb2ludDogRE9NUG9pbnQsIG9mZnNldFkgPSAwKSA9PiB7XHJcbiAgICBjb25zdCB7cGFkZGluZ30gPSB0aGlzLm9wdGlvbnM7XHJcbiAgICBjb25zdCB7c3BhY2V9ID0gdGhpcy5jYWxjU3BhY2VBbmRQYWRkaW5nKCk7XHJcbiAgICBjb25zdCBwb2ludCA9IHRoaXMudHJhbnNNYXQuaW52ZXJzZSgpLnRyYW5zZm9ybVBvaW50KGRvbVBvaW50KTtcclxuICAgIGNvbnN0IGlkeCA9IE1hdGgucm91bmQoKHBvaW50LnggLSBwYWRkaW5nICsgc3BhY2UgLyAyKSAvIHNwYWNlKTtcclxuICAgIGNvbnN0IGlkeSA9IE1hdGgucm91bmQoKHBvaW50LnkgLSBwYWRkaW5nICsgc3BhY2UgLyAyKSAvIHNwYWNlKSArIG9mZnNldFk7XHJcbiAgICBjb25zdCB4eCA9IGlkeCAqIHNwYWNlO1xyXG4gICAgY29uc3QgeXkgPSBpZHkgKiBzcGFjZTtcclxuICAgIGNvbnN0IHBvaW50T25DYW52YXMgPSBuZXcgRE9NUG9pbnQoeHgsIHl5KTtcclxuICAgIGNvbnN0IHAgPSB0aGlzLnRyYW5zTWF0LnRyYW5zZm9ybVBvaW50KHBvaW50T25DYW52YXMpO1xyXG4gICAgdGhpcy5hY3R1YWxDdXJzb3JQb2ludCA9IHA7XHJcbiAgICB0aGlzLmFjdHVhbEN1cnNvclBvc2l0aW9uID0gW2lkeCAtIDEsIGlkeSAtIDFdO1xyXG5cclxuICAgIGlmICh0aGlzLnByZXZlbnRNb3ZlTWF0Py5baWR4IC0gMV0/LltpZHkgLSAxXSA9PT0gMSkge1xyXG4gICAgICB0aGlzLmN1cnNvclBvc2l0aW9uID0gWy0xLCAtMV07XHJcbiAgICAgIHRoaXMuY3Vyc29yUG9pbnQgPSBuZXcgRE9NUG9pbnQoKTtcclxuICAgICAgdGhpcy5kcmF3Q3Vyc29yKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmN1cnNvclBvaW50ID0gcDtcclxuICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSBbaWR4IC0gMSwgaWR5IC0gMV07XHJcbiAgICB0aGlzLmRyYXdDdXJzb3IoKTtcclxuXHJcbiAgICBpZiAoaXNNb2JpbGVEZXZpY2UoKSkgdGhpcy5kcmF3Qm9hcmQoKTtcclxuICB9O1xyXG5cclxuICBwcml2YXRlIG9uTW91c2VNb3ZlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuY3Vyc29yQ2FudmFzO1xyXG4gICAgaWYgKCFjYW52YXMpIHJldHVybjtcclxuXHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBjb25zdCBwb2ludCA9IG5ldyBET01Qb2ludChlLm9mZnNldFggKiBkcHIsIGUub2Zmc2V0WSAqIGRwcik7XHJcbiAgICB0aGlzLnNldEN1cnNvcldpdGhSZW5kZXIocG9pbnQpO1xyXG4gIH07XHJcblxyXG4gIHByaXZhdGUgY2FsY1RvdWNoUG9pbnQgPSAoZTogVG91Y2hFdmVudCkgPT4ge1xyXG4gICAgbGV0IHBvaW50ID0gbmV3IERPTVBvaW50KCk7XHJcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLmN1cnNvckNhbnZhcztcclxuICAgIGlmICghY2FudmFzKSByZXR1cm4gcG9pbnQ7XHJcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgY29uc3QgdG91Y2hlcyA9IGUuY2hhbmdlZFRvdWNoZXM7XHJcbiAgICBwb2ludCA9IG5ldyBET01Qb2ludChcclxuICAgICAgKHRvdWNoZXNbMF0uY2xpZW50WCAtIHJlY3QubGVmdCkgKiBkcHIsXHJcbiAgICAgICh0b3VjaGVzWzBdLmNsaWVudFkgLSByZWN0LnRvcCkgKiBkcHJcclxuICAgICk7XHJcbiAgICByZXR1cm4gcG9pbnQ7XHJcbiAgfTtcclxuXHJcbiAgcHJpdmF0ZSBvblRvdWNoU3RhcnQgPSAoZTogVG91Y2hFdmVudCkgPT4ge1xyXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5jdXJzb3JDYW52YXM7XHJcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xyXG5cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIHRoaXMudG91Y2hNb3ZpbmcgPSB0cnVlO1xyXG4gICAgY29uc3QgcG9pbnQgPSB0aGlzLmNhbGNUb3VjaFBvaW50KGUpO1xyXG4gICAgdGhpcy50b3VjaFN0YXJ0UG9pbnQgPSBwb2ludDtcclxuICAgIHRoaXMuc2V0Q3Vyc29yV2l0aFJlbmRlcihwb2ludCk7XHJcbiAgfTtcclxuXHJcbiAgcHJpdmF0ZSBvblRvdWNoTW92ZSA9IChlOiBUb3VjaEV2ZW50KSA9PiB7XHJcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLmN1cnNvckNhbnZhcztcclxuICAgIGlmICghY2FudmFzKSByZXR1cm47XHJcblxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdGhpcy50b3VjaE1vdmluZyA9IHRydWU7XHJcbiAgICBjb25zdCBwb2ludCA9IHRoaXMuY2FsY1RvdWNoUG9pbnQoZSk7XHJcbiAgICBsZXQgb2Zmc2V0ID0gMDtcclxuICAgIGxldCBkaXN0YW5jZSA9IDEwO1xyXG4gICAgaWYgKFxyXG4gICAgICBNYXRoLmFicyhwb2ludC54IC0gdGhpcy50b3VjaFN0YXJ0UG9pbnQueCkgPiBkaXN0YW5jZSB8fFxyXG4gICAgICBNYXRoLmFicyhwb2ludC55IC0gdGhpcy50b3VjaFN0YXJ0UG9pbnQueSkgPiBkaXN0YW5jZVxyXG4gICAgKSB7XHJcbiAgICAgIG9mZnNldCA9IHRoaXMub3B0aW9ucy5tb2JpbGVJbmRpY2F0b3JPZmZzZXQ7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNldEN1cnNvcldpdGhSZW5kZXIocG9pbnQsIG9mZnNldCk7XHJcbiAgfTtcclxuXHJcbiAgcHJpdmF0ZSBvblRvdWNoRW5kID0gKCkgPT4ge1xyXG4gICAgdGhpcy50b3VjaE1vdmluZyA9IGZhbHNlO1xyXG4gIH07XHJcblxyXG4gIHJlbmRlckludGVyYWN0aXZlKCkge1xyXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5jdXJzb3JDYW52YXM7XHJcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xyXG5cclxuICAgIGNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKTtcclxuICAgIGNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIHRoaXMub25Nb3VzZU1vdmUpO1xyXG4gICAgY2FudmFzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLm9uVG91Y2hTdGFydCk7XHJcbiAgICBjYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5vblRvdWNoTW92ZSk7XHJcbiAgICBjYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLm9uVG91Y2hFbmQpO1xyXG5cclxuICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJhY3RpdmUpIHtcclxuICAgICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUpO1xyXG4gICAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCB0aGlzLm9uTW91c2VNb3ZlKTtcclxuICAgICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLm9uVG91Y2hTdGFydCk7XHJcbiAgICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLm9uVG91Y2hNb3ZlKTtcclxuICAgICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5vblRvdWNoRW5kKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHNldEFuYWx5c2lzKGFuYWx5c2lzOiBBbmFseXNpcyB8IG51bGwpIHtcclxuICAgIHRoaXMuYW5hbHlzaXMgPSBhbmFseXNpcztcclxuICAgIGlmICghYW5hbHlzaXMpIHtcclxuICAgICAgdGhpcy5jbGVhckFuYWx5c2lzQ2FudmFzKCk7XHJcbiAgICAgIHRoaXMuY2xlYXJPd25lcnNoaXBDYW52YXMoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93QW5hbHlzaXMpIHRoaXMuZHJhd0FuYWx5c2lzKGFuYWx5c2lzKTtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd093bmVyc2hpcCkgdGhpcy5kcmF3T3duZXJzaGlwKCk7XHJcbiAgfVxyXG5cclxuICBzZXRUaGVtZSh0aGVtZTogVGhlbWUsIG9wdGlvbnM6IFBhcnRpYWw8R2hvc3RCYW5PcHRpb25zUGFyYW1zPiA9IHt9KSB7XHJcbiAgICBjb25zdCB7dGhlbWVSZXNvdXJjZXN9ID0gdGhpcy5vcHRpb25zO1xyXG4gICAgaWYgKCF0aGVtZVJlc291cmNlc1t0aGVtZV0pIHJldHVybjtcclxuXHJcbiAgICAvLyBHZXQgYWxsIHRoZW1lIHJlc291cmNlcyBmb3IgcHJlbG9hZGluZyAoYWxsIHJlc29sdXRpb25zKVxyXG4gICAgY29uc3QgYWxsVGhlbWVJbWFnZXMgPSBnZXRBbGxUaGVtZVJlc291cmNlcyh0aGVtZSwgdGhlbWVSZXNvdXJjZXMpO1xyXG5cclxuICAgIHRoaXMub3B0aW9ucy50aGVtZSA9IHRoZW1lO1xyXG4gICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAuLi50aGlzLm9wdGlvbnMsXHJcbiAgICAgIHRoZW1lLFxyXG4gICAgICAuLi5vcHRpb25zLFxyXG4gICAgICB0aGVtZU9wdGlvbnM6IHtcclxuICAgICAgICAuLi50aGlzLm9wdGlvbnMudGhlbWVPcHRpb25zLFxyXG4gICAgICAgIC4uLihvcHRpb25zLnRoZW1lT3B0aW9ucyB8fCB7fSksXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gICAgdGhpcy51cGRhdGVOb2RlTWFya3VwU3R5bGVzKCk7XHJcblxyXG4gICAgLy8gUmVkcmF3IGNhbGxiYWNrIGFmdGVyIGltYWdlIGxvYWRpbmcgY29tcGxldGVzXHJcbiAgICBjb25zdCBvbkltYWdlTG9hZGVkID0gKHVybDogc3RyaW5nKSA9PiB7XHJcbiAgICAgIHRoaXMuZHJhd0JvYXJkKCk7XHJcbiAgICAgIHRoaXMuZHJhd1N0b25lcygpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQcmVsb2FkIGFsbCB0aGVtZSByZXNvdXJjZXMgKGFsbCByZXNvbHV0aW9ucylcclxuICAgIHByZWxvYWQoXHJcbiAgICAgIGFsbFRoZW1lSW1hZ2VzLFxyXG4gICAgICAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kcmF3Qm9hcmQoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICB9LFxyXG4gICAgICBvbkltYWdlTG9hZGVkXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuZHJhd0JvYXJkKCk7XHJcbiAgICB0aGlzLnJlbmRlcigpO1xyXG4gIH1cclxuXHJcbiAgY2FsY0NlbnRlciA9ICgpOiBDZW50ZXIgPT4ge1xyXG4gICAgY29uc3Qge3Zpc2libGVBcmVhfSA9IHRoaXM7XHJcbiAgICBjb25zdCB7Ym9hcmRTaXplfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICBpZiAoXHJcbiAgICAgICh2aXNpYmxlQXJlYVswXVswXSA9PT0gMCAmJiB2aXNpYmxlQXJlYVswXVsxXSA9PT0gYm9hcmRTaXplIC0gMSkgfHxcclxuICAgICAgKHZpc2libGVBcmVhWzFdWzBdID09PSAwICYmIHZpc2libGVBcmVhWzFdWzFdID09PSBib2FyZFNpemUgLSAxKVxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiBDZW50ZXIuQ2VudGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2aXNpYmxlQXJlYVswXVswXSA9PT0gMCkge1xyXG4gICAgICBpZiAodmlzaWJsZUFyZWFbMV1bMF0gPT09IDApIHJldHVybiBDZW50ZXIuVG9wTGVmdDtcclxuICAgICAgZWxzZSBpZiAodmlzaWJsZUFyZWFbMV1bMV0gPT09IGJvYXJkU2l6ZSAtIDEpIHJldHVybiBDZW50ZXIuQm90dG9tTGVmdDtcclxuICAgICAgZWxzZSByZXR1cm4gQ2VudGVyLkxlZnQ7XHJcbiAgICB9IGVsc2UgaWYgKHZpc2libGVBcmVhWzBdWzFdID09PSBib2FyZFNpemUgLSAxKSB7XHJcbiAgICAgIGlmICh2aXNpYmxlQXJlYVsxXVswXSA9PT0gMCkgcmV0dXJuIENlbnRlci5Ub3BSaWdodDtcclxuICAgICAgZWxzZSBpZiAodmlzaWJsZUFyZWFbMV1bMV0gPT09IGJvYXJkU2l6ZSAtIDEpIHJldHVybiBDZW50ZXIuQm90dG9tUmlnaHQ7XHJcbiAgICAgIGVsc2UgcmV0dXJuIENlbnRlci5SaWdodDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmICh2aXNpYmxlQXJlYVsxXVswXSA9PT0gMCkgcmV0dXJuIENlbnRlci5Ub3A7XHJcbiAgICAgIGVsc2UgaWYgKHZpc2libGVBcmVhWzFdWzFdID09PSBib2FyZFNpemUgLSAxKSByZXR1cm4gQ2VudGVyLkJvdHRvbTtcclxuICAgICAgZWxzZSByZXR1cm4gQ2VudGVyLkNlbnRlcjtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjYWxjRHluYW1pY1BhZGRpbmcodmlzaWJsZUFyZWFTaXplOiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHtjb29yZGluYXRlfSA9IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICBjb25zdCB7Y2FudmFzfSA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xyXG4gICAgY29uc3QgcGFkZGluZyA9IGNhbnZhcy53aWR0aCAvICh2aXNpYmxlQXJlYVNpemUgKyAyKSAvIDI7XHJcbiAgICBjb25zdCBwYWRkaW5nV2l0aG91dENvb3JkaW5hdGUgPSBjYW52YXMud2lkdGggLyAodmlzaWJsZUFyZWFTaXplICsgMikgLyA0O1xyXG5cclxuICAgIHRoaXMub3B0aW9ucy5wYWRkaW5nID0gY29vcmRpbmF0ZSA/IHBhZGRpbmcgOiBwYWRkaW5nV2l0aG91dENvb3JkaW5hdGU7XHJcbiAgfVxyXG5cclxuICB6b29tQm9hcmQoem9vbSA9IGZhbHNlKSB7XHJcbiAgICBjb25zdCB7XHJcbiAgICAgIGNhbnZhcyxcclxuICAgICAgYW5hbHlzaXNDYW52YXMsXHJcbiAgICAgIGJvYXJkLFxyXG4gICAgICBjdXJzb3JDYW52YXMsXHJcbiAgICAgIG1hcmt1cENhbnZhcyxcclxuICAgICAgZWZmZWN0Q2FudmFzLFxyXG4gICAgfSA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xyXG4gICAgY29uc3Qge2JvYXJkU2l6ZSwgZXh0ZW50LCBwYWRkaW5nLCBkeW5hbWljUGFkZGluZ30gPSB0aGlzLm9wdGlvbnM7XHJcbiAgICBjb25zdCBib2FyZExpbmVFeHRlbnQgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoXHJcbiAgICAgIFRoZW1lUHJvcGVydHlLZXkuQm9hcmRMaW5lRXh0ZW50XHJcbiAgICApO1xyXG4gICAgY29uc3Qgem9vbWVkVmlzaWJsZUFyZWEgPSBjYWxjVmlzaWJsZUFyZWEoXHJcbiAgICAgIHRoaXMudmlzaWJsZUFyZWFNYXQsXHJcbiAgICAgIGV4dGVudCxcclxuICAgICAgZmFsc2VcclxuICAgICk7XHJcbiAgICBjb25zdCBjdHggPSBjYW52YXM/LmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBjb25zdCBib2FyZEN0eCA9IGJvYXJkPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgY3Vyc29yQ3R4ID0gY3Vyc29yQ2FudmFzPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgbWFya3VwQ3R4ID0gbWFya3VwQ2FudmFzPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgYW5hbHlzaXNDdHggPSBhbmFseXNpc0NhbnZhcz8uZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIGNvbnN0IGVmZmVjdEN0eCA9IGVmZmVjdENhbnZhcz8uZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIGNvbnN0IHZpc2libGVBcmVhID0gem9vbVxyXG4gICAgICA/IHpvb21lZFZpc2libGVBcmVhXHJcbiAgICAgIDogW1xyXG4gICAgICAgICAgWzAsIGJvYXJkU2l6ZSAtIDFdLFxyXG4gICAgICAgICAgWzAsIGJvYXJkU2l6ZSAtIDFdLFxyXG4gICAgICAgIF07XHJcblxyXG4gICAgdGhpcy52aXNpYmxlQXJlYSA9IHZpc2libGVBcmVhO1xyXG4gICAgY29uc3QgdmlzaWJsZUFyZWFTaXplID0gTWF0aC5tYXgoXHJcbiAgICAgIHZpc2libGVBcmVhWzBdWzFdIC0gdmlzaWJsZUFyZWFbMF1bMF0sXHJcbiAgICAgIHZpc2libGVBcmVhWzFdWzFdIC0gdmlzaWJsZUFyZWFbMV1bMF1cclxuICAgICk7XHJcblxyXG4gICAgaWYgKGR5bmFtaWNQYWRkaW5nKSB7XHJcbiAgICAgIHRoaXMuY2FsY0R5bmFtaWNQYWRkaW5nKHZpc2libGVBcmVhU2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHpvb20pIHtcclxuICAgICAgY29uc3Qge3NwYWNlfSA9IHRoaXMuY2FsY1NwYWNlQW5kUGFkZGluZygpO1xyXG4gICAgICBjb25zdCBjZW50ZXIgPSB0aGlzLmNhbGNDZW50ZXIoKTtcclxuXHJcbiAgICAgIGlmIChkeW5hbWljUGFkZGluZykge1xyXG4gICAgICAgIHRoaXMuY2FsY0R5bmFtaWNQYWRkaW5nKHZpc2libGVBcmVhU2l6ZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBleHRyYVZpc2libGVTaXplID0gYm9hcmRMaW5lRXh0ZW50ICogMiArIDE7XHJcblxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgY2VudGVyID09PSBDZW50ZXIuVG9wUmlnaHQgfHxcclxuICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Ub3BMZWZ0IHx8XHJcbiAgICAgICAgY2VudGVyID09PSBDZW50ZXIuQm90dG9tUmlnaHQgfHxcclxuICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Cb3R0b21MZWZ0XHJcbiAgICAgICkge1xyXG4gICAgICAgIGV4dHJhVmlzaWJsZVNpemUgPSBib2FyZExpbmVFeHRlbnQgKyAwLjU7XHJcbiAgICAgIH1cclxuICAgICAgbGV0IHpvb21lZEJvYXJkU2l6ZSA9IHZpc2libGVBcmVhU2l6ZSArIGV4dHJhVmlzaWJsZVNpemU7XHJcblxyXG4gICAgICBpZiAoem9vbWVkQm9hcmRTaXplIDwgYm9hcmRTaXplKSB7XHJcbiAgICAgICAgbGV0IHNjYWxlID0gKGNhbnZhcy53aWR0aCAtIHBhZGRpbmcgKiAyKSAvICh6b29tZWRCb2FyZFNpemUgKiBzcGFjZSk7XHJcblxyXG4gICAgICAgIGxldCBvZmZzZXRYID1cclxuICAgICAgICAgIHZpc2libGVBcmVhWzBdWzBdICogc3BhY2UgKiBzY2FsZSArXHJcbiAgICAgICAgICBwYWRkaW5nICogc2NhbGUgLVxyXG4gICAgICAgICAgcGFkZGluZyAtXHJcbiAgICAgICAgICAoc3BhY2UgKiBleHRyYVZpc2libGVTaXplICogc2NhbGUpIC8gMiArXHJcbiAgICAgICAgICAoc3BhY2UgKiBzY2FsZSkgLyAyO1xyXG5cclxuICAgICAgICBsZXQgb2Zmc2V0WSA9XHJcbiAgICAgICAgICB2aXNpYmxlQXJlYVsxXVswXSAqIHNwYWNlICogc2NhbGUgK1xyXG4gICAgICAgICAgcGFkZGluZyAqIHNjYWxlIC1cclxuICAgICAgICAgIHBhZGRpbmcgLVxyXG4gICAgICAgICAgKHNwYWNlICogZXh0cmFWaXNpYmxlU2l6ZSAqIHNjYWxlKSAvIDIgK1xyXG4gICAgICAgICAgKHNwYWNlICogc2NhbGUpIC8gMjtcclxuXHJcbiAgICAgICAgdGhpcy50cmFuc01hdCA9IG5ldyBET01NYXRyaXgoKTtcclxuICAgICAgICB0aGlzLnRyYW5zTWF0LnRyYW5zbGF0ZVNlbGYoLW9mZnNldFgsIC1vZmZzZXRZKTtcclxuICAgICAgICB0aGlzLnRyYW5zTWF0LnNjYWxlU2VsZihzY2FsZSwgc2NhbGUpO1xyXG4gICAgICAgIGN0eD8uc2V0VHJhbnNmb3JtKHRoaXMudHJhbnNNYXQpO1xyXG4gICAgICAgIGJvYXJkQ3R4Py5zZXRUcmFuc2Zvcm0odGhpcy50cmFuc01hdCk7XHJcbiAgICAgICAgYW5hbHlzaXNDdHg/LnNldFRyYW5zZm9ybSh0aGlzLnRyYW5zTWF0KTtcclxuICAgICAgICBjdXJzb3JDdHg/LnNldFRyYW5zZm9ybSh0aGlzLnRyYW5zTWF0KTtcclxuICAgICAgICBtYXJrdXBDdHg/LnNldFRyYW5zZm9ybSh0aGlzLnRyYW5zTWF0KTtcclxuICAgICAgICBlZmZlY3RDdHg/LnNldFRyYW5zZm9ybSh0aGlzLnRyYW5zTWF0KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnJlc2V0VHJhbnNmb3JtKCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucmVzZXRUcmFuc2Zvcm0oKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNhbGNCb2FyZFZpc2libGVBcmVhKHpvb20gPSBmYWxzZSkge1xyXG4gICAgdGhpcy56b29tQm9hcmQodGhpcy5vcHRpb25zLnpvb20pO1xyXG4gIH1cclxuXHJcbiAgcmVzZXRUcmFuc2Zvcm0oKSB7XHJcbiAgICBjb25zdCB7XHJcbiAgICAgIGNhbnZhcyxcclxuICAgICAgYW5hbHlzaXNDYW52YXMsXHJcbiAgICAgIGJvYXJkLFxyXG4gICAgICBjdXJzb3JDYW52YXMsXHJcbiAgICAgIG1hcmt1cENhbnZhcyxcclxuICAgICAgZWZmZWN0Q2FudmFzLFxyXG4gICAgfSA9IHRoaXM7XHJcbiAgICBjb25zdCBjdHggPSBjYW52YXM/LmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBjb25zdCBib2FyZEN0eCA9IGJvYXJkPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgY3Vyc29yQ3R4ID0gY3Vyc29yQ2FudmFzPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgbWFya3VwQ3R4ID0gbWFya3VwQ2FudmFzPy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgY29uc3QgYW5hbHlzaXNDdHggPSBhbmFseXNpc0NhbnZhcz8uZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIGNvbnN0IGVmZmVjdEN0eCA9IGVmZmVjdENhbnZhcz8uZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHRoaXMudHJhbnNNYXQgPSBuZXcgRE9NTWF0cml4KCk7XHJcbiAgICBjdHg/LnJlc2V0VHJhbnNmb3JtKCk7XHJcbiAgICBib2FyZEN0eD8ucmVzZXRUcmFuc2Zvcm0oKTtcclxuICAgIGFuYWx5c2lzQ3R4Py5yZXNldFRyYW5zZm9ybSgpO1xyXG4gICAgY3Vyc29yQ3R4Py5yZXNldFRyYW5zZm9ybSgpO1xyXG4gICAgbWFya3VwQ3R4Py5yZXNldFRyYW5zZm9ybSgpO1xyXG4gICAgZWZmZWN0Q3R4Py5yZXNldFRyYW5zZm9ybSgpO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgY29uc3Qge21hdH0gPSB0aGlzO1xyXG4gICAgaWYgKHRoaXMubWF0ICYmIG1hdFswXSkgdGhpcy5vcHRpb25zLmJvYXJkU2l6ZSA9IG1hdFswXS5sZW5ndGg7XHJcblxyXG4gICAgdGhpcy56b29tQm9hcmQodGhpcy5vcHRpb25zLnpvb20pO1xyXG4gICAgdGhpcy56b29tQm9hcmQodGhpcy5vcHRpb25zLnpvb20pO1xyXG4gICAgdGhpcy5jbGVhckFsbENhbnZhcygpO1xyXG4gICAgdGhpcy5kcmF3Qm9hcmQoKTtcclxuICAgIHRoaXMuZHJhd1N0b25lcygpO1xyXG4gICAgdGhpcy5kcmF3TWFya3VwKCk7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dPd25lcnNoaXApIHRoaXMuZHJhd093bmVyc2hpcCgpO1xyXG4gICAgdGhpcy5kcmF3Q3Vyc29yKCk7XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dBbmFseXNpcykgdGhpcy5kcmF3QW5hbHlzaXMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlckluT25lQ2FudmFzKGNhbnZhcyA9IHRoaXMuY2FudmFzKSB7XHJcbiAgICB0aGlzLmNsZWFyQWxsQ2FudmFzKCk7XHJcbiAgICB0aGlzLmRyYXdCb2FyZChjYW52YXMsIGZhbHNlKTtcclxuICAgIHRoaXMuZHJhd1N0b25lcyh0aGlzLm1hdCwgY2FudmFzLCBmYWxzZSk7XHJcbiAgICB0aGlzLmRyYXdNYXJrdXAodGhpcy5tYXQsIHRoaXMubWFya3VwLCBjYW52YXMsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIGNsZWFyQWxsQ2FudmFzID0gKCkgPT4ge1xyXG4gICAgdGhpcy5jbGVhckNhbnZhcyh0aGlzLmJvYXJkKTtcclxuICAgIHRoaXMuY2xlYXJDYW52YXMoKTtcclxuICAgIHRoaXMuY2xlYXJDYW52YXModGhpcy5tYXJrdXBDYW52YXMpO1xyXG4gICAgdGhpcy5jbGVhck93bmVyc2hpcENhbnZhcygpO1xyXG4gICAgdGhpcy5jbGVhckNhbnZhcyh0aGlzLmVmZmVjdENhbnZhcyk7XHJcbiAgICB0aGlzLmNsZWFyQ3Vyc29yQ2FudmFzKCk7XHJcbiAgICB0aGlzLmNsZWFyQW5hbHlzaXNDYW52YXMoKTtcclxuICB9O1xyXG5cclxuICBjbGVhckJvYXJkID0gKCkgPT4ge1xyXG4gICAgaWYgKCF0aGlzLmJvYXJkKSByZXR1cm47XHJcbiAgICBjb25zdCBjdHggPSB0aGlzLmJvYXJkLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgIGN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY3R4LmNhbnZhcy53aWR0aCwgY3R4LmNhbnZhcy5oZWlnaHQpO1xyXG4gICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNsZWFyQ2FudmFzID0gKGNhbnZhcyA9IHRoaXMuY2FudmFzKSA9PiB7XHJcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xyXG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgIGN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjbGVhck1hcmt1cENhbnZhcyA9ICgpID0+IHtcclxuICAgIGlmICghdGhpcy5tYXJrdXBDYW52YXMpIHJldHVybjtcclxuICAgIGNvbnN0IGN0eCA9IHRoaXMubWFya3VwQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgIGN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5tYXJrdXBDYW52YXMud2lkdGgsIHRoaXMubWFya3VwQ2FudmFzLmhlaWdodCk7XHJcbiAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY2xlYXJDdXJzb3JDYW52YXMgPSAoKSA9PiB7XHJcbiAgICBpZiAoIXRoaXMuY3Vyc29yQ2FudmFzKSByZXR1cm47XHJcbiAgICBjb25zdCBzaXplID0gdGhpcy5vcHRpb25zLmJvYXJkU2l6ZTtcclxuICAgIGNvbnN0IGN0eCA9IHRoaXMuY3Vyc29yQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgIGN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jdXJzb3JDYW52YXMud2lkdGgsIHRoaXMuY3Vyc29yQ2FudmFzLmhlaWdodCk7XHJcbiAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY2xlYXJBbmFseXNpc0NhbnZhcyA9ICgpID0+IHtcclxuICAgIGlmICghdGhpcy5hbmFseXNpc0NhbnZhcykgcmV0dXJuO1xyXG4gICAgY29uc3QgY3R4ID0gdGhpcy5hbmFseXNpc0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgaWYgKGN0eCkge1xyXG4gICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICBjdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICBjdHguY2xlYXJSZWN0KFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICB0aGlzLmFuYWx5c2lzQ2FudmFzLndpZHRoLFxyXG4gICAgICAgIHRoaXMuYW5hbHlzaXNDYW52YXMuaGVpZ2h0XHJcbiAgICAgICk7XHJcbiAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZHJhd0FuYWx5c2lzID0gKGFuYWx5c2lzID0gdGhpcy5hbmFseXNpcykgPT4ge1xyXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5hbmFseXNpc0NhbnZhcztcclxuICAgIGNvbnN0IHtcclxuICAgICAgdGhlbWUgPSBUaGVtZS5CbGFja0FuZFdoaXRlLFxyXG4gICAgICBhbmFseXNpc1BvaW50VGhlbWUsXHJcbiAgICAgIGJvYXJkU2l6ZSxcclxuICAgICAgZm9yY2VBbmFseXNpc0JvYXJkU2l6ZSxcclxuICAgIH0gPSB0aGlzLm9wdGlvbnM7XHJcbiAgICBjb25zdCB7bWF0LCBtYXJrdXB9ID0gdGhpcztcclxuICAgIGlmICghY2FudmFzIHx8ICFhbmFseXNpcykgcmV0dXJuO1xyXG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBpZiAoIWN0eCkgcmV0dXJuO1xyXG4gICAgdGhpcy5jbGVhckFuYWx5c2lzQ2FudmFzKCk7XHJcbiAgICBjb25zdCB7cm9vdEluZm99ID0gYW5hbHlzaXM7XHJcbiAgICBhbmFseXNpcy5tb3ZlSW5mb3MuZm9yRWFjaChtID0+IHtcclxuICAgICAgaWYgKG0ubW92ZSA9PT0gJ3Bhc3MnKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IGlkT2JqID0gSlNPTi5wYXJzZShhbmFseXNpcy5pZCk7XHJcbiAgICAgIGxldCBhbmFseXNpc0JvYXJkU2l6ZSA9IGJvYXJkU2l6ZTtcclxuICAgICAgY29uc3Qgb2Zmc2V0ZWRNb3ZlID0gb2Zmc2V0QTFNb3ZlKFxyXG4gICAgICAgIG0ubW92ZSxcclxuICAgICAgICAwLFxyXG4gICAgICAgIGFuYWx5c2lzQm9hcmRTaXplIC0gaWRPYmouYnlcclxuICAgICAgKTtcclxuICAgICAgbGV0IHt4OiBpLCB5OiBqfSA9IGExVG9Qb3Mob2Zmc2V0ZWRNb3ZlKTtcclxuICAgICAgaWYgKG1hdFtpXVtqXSAhPT0gMCkgcmV0dXJuO1xyXG4gICAgICBjb25zdCB7c3BhY2UsIHNjYWxlZFBhZGRpbmd9ID0gdGhpcy5jYWxjU3BhY2VBbmRQYWRkaW5nKCk7XHJcbiAgICAgIGNvbnN0IHggPSBzY2FsZWRQYWRkaW5nICsgaSAqIHNwYWNlO1xyXG4gICAgICBjb25zdCB5ID0gc2NhbGVkUGFkZGluZyArIGogKiBzcGFjZTtcclxuICAgICAgY29uc3QgcmF0aW8gPSAwLjQ2O1xyXG4gICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICBpZiAoXHJcbiAgICAgICAgdGhlbWUgIT09IFRoZW1lLlN1YmR1ZWQgJiZcclxuICAgICAgICB0aGVtZSAhPT0gVGhlbWUuQmxhY2tBbmRXaGl0ZSAmJlxyXG4gICAgICAgIHRoZW1lICE9PSBUaGVtZS5GbGF0ICYmXHJcbiAgICAgICAgdGhlbWUgIT09IFRoZW1lLldhcm0gJiZcclxuICAgICAgICB0aGVtZSAhPT0gVGhlbWUuRGFya1xyXG4gICAgICApIHtcclxuICAgICAgICBjdHguc2hhZG93T2Zmc2V0WCA9IDMwO1xyXG4gICAgICAgIGN0eC5zaGFkb3dPZmZzZXRZID0gMzA7XHJcbiAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuU2hhZG93Q29sb3IpO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gODtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguc2hhZG93T2Zmc2V0WCA9IDA7XHJcbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFkgPSAwO1xyXG4gICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICcjZmZmJztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBvdXRsaW5lQ29sb3I7XHJcbiAgICAgIGlmIChtYXJrdXBbaV1bal0uaW5jbHVkZXMoTWFya3VwLlBvc2l0aXZlTm9kZSkpIHtcclxuICAgICAgICBvdXRsaW5lQ29sb3IgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoXHJcbiAgICAgICAgICBUaGVtZVByb3BlcnR5S2V5LlBvc2l0aXZlTm9kZUNvbG9yXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKG1hcmt1cFtpXVtqXS5pbmNsdWRlcyhNYXJrdXAuTmVnYXRpdmVOb2RlKSkge1xyXG4gICAgICAgIG91dGxpbmVDb2xvciA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShcclxuICAgICAgICAgIFRoZW1lUHJvcGVydHlLZXkuTmVnYXRpdmVOb2RlQ29sb3JcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAobWFya3VwW2ldW2pdLmluY2x1ZGVzKE1hcmt1cC5OZXV0cmFsTm9kZSkpIHtcclxuICAgICAgICBvdXRsaW5lQ29sb3IgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5OZXV0cmFsTm9kZUNvbG9yKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IHBvbGljeVZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQ7XHJcbiAgICAgIC8vIENvbnZlcnQgbS5tb3ZlIHRvIHJvdy1tYWpvciBpbmRleCBmb3IgcG9saWN5IGFycmF5XHJcbiAgICAgIC8vIEthdGFHbydzIHBvbGljeSBhcnJheSBpcyBzdG9yZWQgaW4gcm93LW1ham9yIG9yZGVyOiBwb2xpY3lbcm93ICogYm9hcmRTaXplICsgY29sXVxyXG4gICAgICBjb25zdCB7eDogY29sLCB5OiByb3d9ID0gYTFUb1BvcyhtLm1vdmUpO1xyXG4gICAgICBjb25zdCBwb2xpY3lJbmRleCA9IHJvdyAqIGFuYWx5c2lzQm9hcmRTaXplICsgY29sO1xyXG5cclxuICAgICAgaWYgKGFuYWx5c2lzUG9pbnRUaGVtZSA9PT0gQW5hbHlzaXNQb2ludFRoZW1lLlNjZW5hcmlvKSB7XHJcbiAgICAgICAgaWYgKGFuYWx5c2lzLmh1bWFuUG9saWN5ICYmIGFuYWx5c2lzLmh1bWFuUG9saWN5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHBvbGljeVZhbHVlID0gYW5hbHlzaXMuaHVtYW5Qb2xpY3lbcG9saWN5SW5kZXhdO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcG9pbnQgPSBuZXcgQW5hbHlzaXNQb2ludCh7XHJcbiAgICAgICAgY3R4LFxyXG4gICAgICAgIHgsXHJcbiAgICAgICAgeSxcclxuICAgICAgICByOiBzcGFjZSAqIHJhdGlvLFxyXG4gICAgICAgIHJvb3RJbmZvLFxyXG4gICAgICAgIG1vdmVJbmZvOiBtLFxyXG4gICAgICAgIHBvbGljeVZhbHVlLFxyXG4gICAgICAgIHRoZW1lOiBhbmFseXNpc1BvaW50VGhlbWUsXHJcbiAgICAgICAgb3V0bGluZUNvbG9yLFxyXG4gICAgICB9KTtcclxuICAgICAgcG9pbnQuZHJhdygpO1xyXG4gICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgY2xlYXJPd25lcnNoaXBDYW52YXMgPSAoKSA9PiB7XHJcbiAgICBpZiAoIXRoaXMub3duZXJzaGlwQ2FudmFzKSByZXR1cm47XHJcbiAgICBjb25zdCBjdHggPSB0aGlzLm93bmVyc2hpcENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgaWYgKGN0eCkge1xyXG4gICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICBjdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICBjdHguY2xlYXJSZWN0KFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICB0aGlzLm93bmVyc2hpcENhbnZhcy53aWR0aCxcclxuICAgICAgICB0aGlzLm93bmVyc2hpcENhbnZhcy5oZWlnaHRcclxuICAgICAgKTtcclxuICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBkcmF3T3duZXJzaGlwID0gKFxyXG4gICAgb3duZXJzaGlwOiBudW1iZXJbXSB8IG51bGwgPSB0aGlzLmFuYWx5c2lzPy5vd25lcnNoaXAgPz8gbnVsbCxcclxuICAgIG93bmVyc2hpcENhbnZhcyA9IHRoaXMub3duZXJzaGlwQ2FudmFzLFxyXG4gICAgY2xlYXIgPSB0cnVlXHJcbiAgKSA9PiB7XHJcbiAgICBjb25zdCBjYW52YXMgPSBvd25lcnNoaXBDYW52YXM7XHJcbiAgICBpZiAoIWNhbnZhcyB8fCAhb3duZXJzaGlwKSByZXR1cm47XHJcbiAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIGlmICghY3R4KSByZXR1cm47XHJcblxyXG4gICAgaWYgKGNsZWFyKSB0aGlzLmNsZWFyT3duZXJzaGlwQ2FudmFzKCk7XHJcblxyXG4gICAgY29uc3Qge3NwYWNlLCBzY2FsZWRQYWRkaW5nfSA9IHRoaXMuY2FsY1NwYWNlQW5kUGFkZGluZygpO1xyXG4gICAgY29uc3Qge2JvYXJkU2l6ZX0gPSB0aGlzLm9wdGlvbnM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBib2FyZFNpemU7IGkrKykge1xyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvYXJkU2l6ZTsgaisrKSB7XHJcbiAgICAgICAgLy8gcm93LW1ham9yIG9yZGVyXHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBqICogYm9hcmRTaXplICsgaTtcclxuICAgICAgICBjb25zdCBvd25lcnNoaXBWYWx1ZSA9IG93bmVyc2hpcFtpbmRleF07XHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyhvd25lcnNoaXBWYWx1ZSkgPCAwLjEpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBzdG9uZVZhbHVlID0gdGhpcy5tYXRbaV0/LltqXSB8fCAwO1xyXG5cclxuICAgICAgICBjb25zdCBzaG91bGRTaG93ID1cclxuICAgICAgICAgIHN0b25lVmFsdWUgPT09IDAgfHxcclxuICAgICAgICAgIChzdG9uZVZhbHVlID09PSBLaS5CbGFjayAmJiBvd25lcnNoaXBWYWx1ZSA8IDApIHx8XHJcbiAgICAgICAgICAoc3RvbmVWYWx1ZSA9PT0gS2kuV2hpdGUgJiYgb3duZXJzaGlwVmFsdWUgPiAwKTtcclxuXHJcbiAgICAgICAgaWYgKCFzaG91bGRTaG93KSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgY29uc3QgeCA9IHNjYWxlZFBhZGRpbmcgKyBpICogc3BhY2U7XHJcbiAgICAgICAgY29uc3QgeSA9IHNjYWxlZFBhZGRpbmcgKyBqICogc3BhY2U7XHJcbiAgICAgICAgY29uc3Qgc3F1YXJlU2l6ZSA9IHNwYWNlICogMC4zO1xyXG5cclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGNvbnN0IG1pbk9wYWNpdHkgPSAwLjE1O1xyXG4gICAgICAgIGNvbnN0IHJhd09wYWNpdHkgPSBNYXRoLm1pbihNYXRoLmFicyhvd25lcnNoaXBWYWx1ZSksIDEpO1xyXG4gICAgICAgIGNvbnN0IG9wYWNpdHkgPSBtaW5PcGFjaXR5ICsgcmF3T3BhY2l0eSAqICgxIC0gbWluT3BhY2l0eSk7XHJcbiAgICAgICAgaWYgKG93bmVyc2hpcFZhbHVlID4gMCkge1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGByZ2JhKDAsIDAsIDAsICR7b3BhY2l0eX0pYDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGByZ2JhKDI1NSwgMjU1LCAyNTUsICR7b3BhY2l0eX0pYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KFxyXG4gICAgICAgICAgeCAtIHNxdWFyZVNpemUgLyAyLFxyXG4gICAgICAgICAgeSAtIHNxdWFyZVNpemUgLyAyLFxyXG4gICAgICAgICAgc3F1YXJlU2l6ZSxcclxuICAgICAgICAgIHNxdWFyZVNpemVcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZHJhd01hcmt1cCA9IChcclxuICAgIG1hdCA9IHRoaXMubWF0LFxyXG4gICAgbWFya3VwID0gdGhpcy5tYXJrdXAsXHJcbiAgICBtYXJrdXBDYW52YXMgPSB0aGlzLm1hcmt1cENhbnZhcyxcclxuICAgIGNsZWFyID0gdHJ1ZVxyXG4gICkgPT4ge1xyXG4gICAgY29uc3QgY2FudmFzID0gbWFya3VwQ2FudmFzO1xyXG4gICAgY29uc3Qge3RoZW1lfSA9IHRoaXMub3B0aW9ucztcclxuICAgIGlmIChjYW52YXMpIHtcclxuICAgICAgaWYgKGNsZWFyKSB0aGlzLmNsZWFyQ2FudmFzKGNhbnZhcyk7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWFya3VwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBtYXJrdXBbaV0ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IG1hcmt1cFtpXVtqXTtcclxuICAgICAgICAgIHZhbHVlcz8uc3BsaXQoJ3wnKS5mb3JFYWNoKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJykge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHtzcGFjZSwgc2NhbGVkUGFkZGluZ30gPSB0aGlzLmNhbGNTcGFjZUFuZFBhZGRpbmcoKTtcclxuICAgICAgICAgICAgICBjb25zdCB4ID0gc2NhbGVkUGFkZGluZyArIGkgKiBzcGFjZTtcclxuICAgICAgICAgICAgICBjb25zdCB5ID0gc2NhbGVkUGFkZGluZyArIGogKiBzcGFjZTtcclxuICAgICAgICAgICAgICBjb25zdCBraSA9IG1hdFtpXVtqXTtcclxuICAgICAgICAgICAgICBsZXQgbWFya3VwO1xyXG4gICAgICAgICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoY3R4KSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLkNpcmNsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmt1cCA9IG5ldyBDaXJjbGVNYXJrdXAoXHJcbiAgICAgICAgICAgICAgICAgICAgICBjdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeSxcclxuICAgICAgICAgICAgICAgICAgICAgIHNwYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAga2ksXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5DdXJyZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya3VwID0gbmV3IENpcmNsZVNvbGlkTWFya3VwKFxyXG4gICAgICAgICAgICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeCxcclxuICAgICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGtpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuUG9zaXRpdmVBY3RpdmVOb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5Qb3NpdGl2ZURhc2hlZEFjdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLlBvc2l0aXZlRG90dGVkQWN0aXZlTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuTmVnYXRpdmVBY3RpdmVOb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5OZWdhdGl2ZURhc2hlZEFjdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLk5lZ2F0aXZlRG90dGVkQWN0aXZlTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuTmV1dHJhbEFjdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLk5ldXRyYWxEYXNoZWRBY3RpdmVOb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5OZXV0cmFsRG90dGVkQWN0aXZlTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuV2FybmluZ0FjdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLldhcm5pbmdEYXNoZWRBY3RpdmVOb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5XYXJuaW5nRG90dGVkQWN0aXZlTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuRGVmYXVsdEFjdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLkRlZmF1bHREYXNoZWRBY3RpdmVOb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5EZWZhdWx0RG90dGVkQWN0aXZlTm9kZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB7Y29sb3IsIGxpbmVEYXNofSA9IHRoaXMubm9kZU1hcmt1cFN0eWxlc1t2YWx1ZV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG1hcmt1cCA9IG5ldyBBY3RpdmVOb2RlTWFya3VwKFxyXG4gICAgICAgICAgICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeCxcclxuICAgICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGtpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgIE1hcmt1cC5DaXJjbGVcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmt1cC5zZXRDb2xvcihjb2xvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya3VwLnNldExpbmVEYXNoKGxpbmVEYXNoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5Qb3NpdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLlBvc2l0aXZlRGFzaGVkTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuUG9zaXRpdmVEb3R0ZWROb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5OZWdhdGl2ZU5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLk5lZ2F0aXZlRGFzaGVkTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuTmVnYXRpdmVEb3R0ZWROb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5OZXV0cmFsTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuTmV1dHJhbERhc2hlZE5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLk5ldXRyYWxEb3R0ZWROb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5XYXJuaW5nTm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuV2FybmluZ0Rhc2hlZE5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLldhcm5pbmdEb3R0ZWROb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5EZWZhdWx0Tm9kZTpcclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuRGVmYXVsdERhc2hlZE5vZGU6XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLkRlZmF1bHREb3R0ZWROb2RlOlxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5Ob2RlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHtjb2xvciwgbGluZURhc2h9ID0gdGhpcy5ub2RlTWFya3VwU3R5bGVzW3ZhbHVlXTtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrdXAgPSBuZXcgTm9kZU1hcmt1cChcclxuICAgICAgICAgICAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICB5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgc3BhY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBraSxcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVGhlbWVDb250ZXh0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICBNYXJrdXAuQ2lyY2xlXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrdXAuc2V0Q29sb3IoY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmt1cC5zZXRMaW5lRGFzaChsaW5lRGFzaCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuU3F1YXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya3VwID0gbmV3IFNxdWFyZU1hcmt1cChcclxuICAgICAgICAgICAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICB5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgc3BhY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBraSxcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVGhlbWVDb250ZXh0KClcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgTWFya3VwLlRyaWFuZ2xlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya3VwID0gbmV3IFRyaWFuZ2xlTWFya3VwKFxyXG4gICAgICAgICAgICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeCxcclxuICAgICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGtpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY2FzZSBNYXJrdXAuQ3Jvc3M6IHtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrdXAgPSBuZXcgQ3Jvc3NNYXJrdXAoXHJcbiAgICAgICAgICAgICAgICAgICAgICBjdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeSxcclxuICAgICAgICAgICAgICAgICAgICAgIHNwYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAga2ksXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjYXNlIE1hcmt1cC5IaWdobGlnaHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrdXAgPSBuZXcgSGlnaGxpZ2h0TWFya3VwKFxyXG4gICAgICAgICAgICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgeCxcclxuICAgICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGtpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIG1hcmt1cCA9IG5ldyBUZXh0TWFya3VwKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBraSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBtYXJrdXA/LmRyYXcoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGRyYXdCb2FyZCA9IChib2FyZCA9IHRoaXMuYm9hcmQsIGNsZWFyID0gdHJ1ZSkgPT4ge1xyXG4gICAgaWYgKGNsZWFyKSB0aGlzLmNsZWFyQ2FudmFzKGJvYXJkKTtcclxuICAgIHRoaXMuZHJhd0Jhbihib2FyZCk7XHJcbiAgICB0aGlzLmRyYXdCb2FyZExpbmUoYm9hcmQpO1xyXG4gICAgdGhpcy5kcmF3U3RhcnMoYm9hcmQpO1xyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb29yZGluYXRlKSB7XHJcbiAgICAgIHRoaXMuZHJhd0Nvb3JkaW5hdGUoKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBkcmF3QmFuID0gKGJvYXJkID0gdGhpcy5ib2FyZCkgPT4ge1xyXG4gICAgY29uc3Qge3RoZW1lLCB0aGVtZVJlc291cmNlcywgcGFkZGluZ30gPSB0aGlzLm9wdGlvbnM7XHJcbiAgICBpZiAoYm9hcmQpIHtcclxuICAgICAgYm9hcmQuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzJweCc7XHJcbiAgICAgIGNvbnN0IGN0eCA9IGJvYXJkLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgIGlmIChjdHgpIHtcclxuICAgICAgICBzZXRJbWFnZVNtb290aGluZ1F1YWxpdHkoY3R4KTtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICB0aGVtZSA9PT0gVGhlbWUuQmxhY2tBbmRXaGl0ZSB8fFxyXG4gICAgICAgICAgdGhlbWUgPT09IFRoZW1lLkZsYXQgfHxcclxuICAgICAgICAgIHRoZW1lID09PSBUaGVtZS5XYXJtIHx8XHJcbiAgICAgICAgICB0aGVtZSA9PT0gVGhlbWUuRGFyayB8fFxyXG4gICAgICAgICAgdGhlbWUgPT09IFRoZW1lLkhpZ2hDb250cmFzdFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgYm9hcmQuc3R5bGUuYm94U2hhZG93ID1cclxuICAgICAgICAgICAgdGhlbWUgPT09IFRoZW1lLkJsYWNrQW5kV2hpdGUgPyAnMHB4IDBweCAwcHggIzAwMDAwMCcgOiAnJztcclxuXHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KFxyXG4gICAgICAgICAgICBUaGVtZVByb3BlcnR5S2V5LkJvYXJkQmFja2dyb3VuZENvbG9yXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgLy8gY3R4LmZpbGxSZWN0KFxyXG4gICAgICAgICAgLy8gICAtcGFkZGluZyxcclxuICAgICAgICAgIC8vICAgLXBhZGRpbmcsXHJcbiAgICAgICAgICAvLyAgIGJvYXJkLndpZHRoICsgcGFkZGluZyxcclxuICAgICAgICAgIC8vICAgYm9hcmQuaGVpZ2h0ICsgcGFkZGluZ1xyXG4gICAgICAgICAgLy8gKTtcclxuICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBib2FyZC53aWR0aCwgYm9hcmQuaGVpZ2h0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY29uc3QgYm9hcmRQaXhlbFNpemUgPSBib2FyZC53aWR0aDtcclxuICAgICAgICAgIGNvbnN0IHJlc291cmNlcyA9IGdldFRoZW1lUmVzb3VyY2VzKFxyXG4gICAgICAgICAgICB0aGVtZSxcclxuICAgICAgICAgICAgdGhlbWVSZXNvdXJjZXMsXHJcbiAgICAgICAgICAgIGJvYXJkUGl4ZWxTaXplXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgaWYgKHJlc291cmNlcyAmJiByZXNvdXJjZXMuYm9hcmQpIHtcclxuICAgICAgICAgICAgY29uc3QgYm9hcmRVcmwgPSByZXNvdXJjZXMuYm9hcmQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvYXJkUmVzID0gaW1hZ2VzW2JvYXJkVXJsXTtcclxuICAgICAgICAgICAgaWYgKGJvYXJkUmVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHRoZW1lID09PSBUaGVtZS5XYWxudXQgfHwgdGhlbWUgPT09IFRoZW1lLll1bnppTW9ua2V5RGFyaykge1xyXG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShib2FyZFJlcywgMCwgMCwgYm9hcmQud2lkdGgsIGJvYXJkLmhlaWdodCk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdHRlcm4gPSBjdHguY3JlYXRlUGF0dGVybihib2FyZFJlcywgJ3JlcGVhdCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhdHRlcm4pIHtcclxuICAgICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHBhdHRlcm47XHJcbiAgICAgICAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBib2FyZC53aWR0aCwgYm9hcmQuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICBkcmF3Qm9hcmRMaW5lID0gKGJvYXJkID0gdGhpcy5ib2FyZCkgPT4ge1xyXG4gICAgaWYgKCFib2FyZCkgcmV0dXJuO1xyXG4gICAgY29uc3Qge3Zpc2libGVBcmVhLCBvcHRpb25zLCBtYXQsIHByZXZlbnRNb3ZlTWF0LCBjdXJzb3JQb3NpdGlvbn0gPSB0aGlzO1xyXG4gICAgY29uc3Qge3pvb20sIGJvYXJkU2l6ZSwgYWRhcHRpdmVCb2FyZExpbmUsIHRoZW1lfSA9IG9wdGlvbnM7XHJcbiAgICBjb25zdCBib2FyZExpbmVXaWR0aCA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShcclxuICAgICAgVGhlbWVQcm9wZXJ0eUtleS5Cb2FyZExpbmVXaWR0aFxyXG4gICAgKTtcclxuICAgIGNvbnN0IGJvYXJkRWRnZUxpbmVXaWR0aCA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eShcclxuICAgICAgVGhlbWVQcm9wZXJ0eUtleS5Cb2FyZEVkZ2VMaW5lV2lkdGhcclxuICAgICk7XHJcbiAgICBjb25zdCBib2FyZExpbmVFeHRlbnQgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoXHJcbiAgICAgIFRoZW1lUHJvcGVydHlLZXkuQm9hcmRMaW5lRXh0ZW50XHJcbiAgICApO1xyXG4gICAgY29uc3QgY3R4ID0gYm9hcmQuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIGlmIChjdHgpIHtcclxuICAgICAgY29uc3Qge3NwYWNlLCBzY2FsZWRQYWRkaW5nfSA9IHRoaXMuY2FsY1NwYWNlQW5kUGFkZGluZygpO1xyXG5cclxuICAgICAgY29uc3QgZXh0ZW5kU3BhY2UgPSB6b29tID8gYm9hcmRMaW5lRXh0ZW50ICogc3BhY2UgOiAwO1xyXG4gICAgICBsZXQgYWN0aXZlQ29sb3IgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoVGhlbWVQcm9wZXJ0eUtleS5BY3RpdmVDb2xvcik7XHJcbiAgICAgIGxldCBpbmFjdGl2ZUNvbG9yID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuSW5hY3RpdmVDb2xvcik7XHJcblxyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuQm9hcmRMaW5lQ29sb3IpO1xyXG5cclxuICAgICAgY29uc3QgYWRhcHRpdmVGYWN0b3IgPSAwLjAwMTtcclxuICAgICAgY29uc3QgdG91Y2hpbmdGYWN0b3IgPSAyLjU7XHJcbiAgICAgIGxldCBlZGdlTGluZVdpZHRoID0gYWRhcHRpdmVCb2FyZExpbmVcclxuICAgICAgICA/IGJvYXJkLndpZHRoICogYWRhcHRpdmVGYWN0b3IgKiAyXHJcbiAgICAgICAgOiBib2FyZEVkZ2VMaW5lV2lkdGg7XHJcblxyXG4gICAgICBsZXQgbGluZVdpZHRoID0gYWRhcHRpdmVCb2FyZExpbmVcclxuICAgICAgICA/IGJvYXJkLndpZHRoICogYWRhcHRpdmVGYWN0b3JcclxuICAgICAgICA6IGJvYXJkTGluZVdpZHRoO1xyXG5cclxuICAgICAgY29uc3QgYWxsb3dNb3ZlID1cclxuICAgICAgICBjYW5Nb3ZlKFxyXG4gICAgICAgICAgbWF0LFxyXG4gICAgICAgICAgY3Vyc29yUG9zaXRpb25bMF0sXHJcbiAgICAgICAgICBjdXJzb3JQb3NpdGlvblsxXSxcclxuICAgICAgICAgIHRoaXMudHVybixcclxuICAgICAgICAgIHRoaXMucHJldmlvdXNCb2FyZFN0YXRlXHJcbiAgICAgICAgKSAmJiBwcmV2ZW50TW92ZU1hdFtjdXJzb3JQb3NpdGlvblswXV1bY3Vyc29yUG9zaXRpb25bMV1dID09PSAwO1xyXG5cclxuICAgICAgZm9yIChsZXQgaSA9IHZpc2libGVBcmVhWzBdWzBdOyBpIDw9IHZpc2libGVBcmVhWzBdWzFdOyBpKyspIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgKHZpc2libGVBcmVhWzBdWzBdID09PSAwICYmIGkgPT09IDApIHx8XHJcbiAgICAgICAgICAodmlzaWJsZUFyZWFbMF1bMV0gPT09IGJvYXJkU2l6ZSAtIDEgJiYgaSA9PT0gYm9hcmRTaXplIC0gMSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBlZGdlTGluZVdpZHRoO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gbGluZVdpZHRoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICBpc01vYmlsZURldmljZSgpICYmXHJcbiAgICAgICAgICBpID09PSB0aGlzLmN1cnNvclBvc2l0aW9uWzBdICYmXHJcbiAgICAgICAgICB0aGlzLnRvdWNoTW92aW5nXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gY3R4LmxpbmVXaWR0aCAqIHRvdWNoaW5nRmFjdG9yO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gYWxsb3dNb3ZlID8gYWN0aXZlQ29sb3IgOiBpbmFjdGl2ZUNvbG9yO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBhY3RpdmVDb2xvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHN0YXJ0UG9pbnRZID1cclxuICAgICAgICAgIGkgPT09IDAgfHwgaSA9PT0gYm9hcmRTaXplIC0gMVxyXG4gICAgICAgICAgICA/IHNjYWxlZFBhZGRpbmcgKyB2aXNpYmxlQXJlYVsxXVswXSAqIHNwYWNlIC0gZWRnZUxpbmVXaWR0aCAvIDJcclxuICAgICAgICAgICAgOiBzY2FsZWRQYWRkaW5nICsgdmlzaWJsZUFyZWFbMV1bMF0gKiBzcGFjZTtcclxuICAgICAgICBpZiAoaXNNb2JpbGVEZXZpY2UoKSkge1xyXG4gICAgICAgICAgc3RhcnRQb2ludFkgKz0gZHByIC8gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGVuZFBvaW50WSA9XHJcbiAgICAgICAgICBpID09PSAwIHx8IGkgPT09IGJvYXJkU2l6ZSAtIDFcclxuICAgICAgICAgICAgPyBzcGFjZSAqIHZpc2libGVBcmVhWzFdWzFdICsgc2NhbGVkUGFkZGluZyArIGVkZ2VMaW5lV2lkdGggLyAyXHJcbiAgICAgICAgICAgIDogc3BhY2UgKiB2aXNpYmxlQXJlYVsxXVsxXSArIHNjYWxlZFBhZGRpbmc7XHJcbiAgICAgICAgaWYgKGlzTW9iaWxlRGV2aWNlKCkpIHtcclxuICAgICAgICAgIGVuZFBvaW50WSAtPSBkcHIgLyAyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodmlzaWJsZUFyZWFbMV1bMF0gPiAwKSBzdGFydFBvaW50WSAtPSBleHRlbmRTcGFjZTtcclxuICAgICAgICBpZiAodmlzaWJsZUFyZWFbMV1bMV0gPCBib2FyZFNpemUgLSAxKSBlbmRQb2ludFkgKz0gZXh0ZW5kU3BhY2U7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyhpICogc3BhY2UgKyBzY2FsZWRQYWRkaW5nLCBzdGFydFBvaW50WSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhpICogc3BhY2UgKyBzY2FsZWRQYWRkaW5nLCBlbmRQb2ludFkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yIChsZXQgaSA9IHZpc2libGVBcmVhWzFdWzBdOyBpIDw9IHZpc2libGVBcmVhWzFdWzFdOyBpKyspIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgKHZpc2libGVBcmVhWzFdWzBdID09PSAwICYmIGkgPT09IDApIHx8XHJcbiAgICAgICAgICAodmlzaWJsZUFyZWFbMV1bMV0gPT09IGJvYXJkU2l6ZSAtIDEgJiYgaSA9PT0gYm9hcmRTaXplIC0gMSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBlZGdlTGluZVdpZHRoO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gbGluZVdpZHRoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICBpc01vYmlsZURldmljZSgpICYmXHJcbiAgICAgICAgICBpID09PSB0aGlzLmN1cnNvclBvc2l0aW9uWzFdICYmXHJcbiAgICAgICAgICB0aGlzLnRvdWNoTW92aW5nXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBjdHgubGluZVdpZHRoID0gY3R4LmxpbmVXaWR0aCAqIHRvdWNoaW5nRmFjdG9yO1xyXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gYWxsb3dNb3ZlID8gYWN0aXZlQ29sb3IgOiBpbmFjdGl2ZUNvbG9yO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBhY3RpdmVDb2xvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHN0YXJ0UG9pbnRYID1cclxuICAgICAgICAgIGkgPT09IDAgfHwgaSA9PT0gYm9hcmRTaXplIC0gMVxyXG4gICAgICAgICAgICA/IHNjYWxlZFBhZGRpbmcgKyB2aXNpYmxlQXJlYVswXVswXSAqIHNwYWNlIC0gZWRnZUxpbmVXaWR0aCAvIDJcclxuICAgICAgICAgICAgOiBzY2FsZWRQYWRkaW5nICsgdmlzaWJsZUFyZWFbMF1bMF0gKiBzcGFjZTtcclxuICAgICAgICBsZXQgZW5kUG9pbnRYID1cclxuICAgICAgICAgIGkgPT09IDAgfHwgaSA9PT0gYm9hcmRTaXplIC0gMVxyXG4gICAgICAgICAgICA/IHNwYWNlICogdmlzaWJsZUFyZWFbMF1bMV0gKyBzY2FsZWRQYWRkaW5nICsgZWRnZUxpbmVXaWR0aCAvIDJcclxuICAgICAgICAgICAgOiBzcGFjZSAqIHZpc2libGVBcmVhWzBdWzFdICsgc2NhbGVkUGFkZGluZztcclxuICAgICAgICBpZiAoaXNNb2JpbGVEZXZpY2UoKSkge1xyXG4gICAgICAgICAgc3RhcnRQb2ludFggKz0gZHByIC8gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlzTW9iaWxlRGV2aWNlKCkpIHtcclxuICAgICAgICAgIGVuZFBvaW50WCAtPSBkcHIgLyAyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHZpc2libGVBcmVhWzBdWzBdID4gMCkgc3RhcnRQb2ludFggLT0gZXh0ZW5kU3BhY2U7XHJcbiAgICAgICAgaWYgKHZpc2libGVBcmVhWzBdWzFdIDwgYm9hcmRTaXplIC0gMSkgZW5kUG9pbnRYICs9IGV4dGVuZFNwYWNlO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8oc3RhcnRQb2ludFgsIGkgKiBzcGFjZSArIHNjYWxlZFBhZGRpbmcpO1xyXG4gICAgICAgIGN0eC5saW5lVG8oZW5kUG9pbnRYLCBpICogc3BhY2UgKyBzY2FsZWRQYWRkaW5nKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICBkcmF3U3RhcnMgPSAoYm9hcmQgPSB0aGlzLmJvYXJkKSA9PiB7XHJcbiAgICBpZiAoIWJvYXJkKSByZXR1cm47XHJcbiAgICBpZiAodGhpcy5vcHRpb25zLmJvYXJkU2l6ZSAhPT0gMTkpIHJldHVybjtcclxuXHJcbiAgICBsZXQge2FkYXB0aXZlU3RhclNpemV9ID0gdGhpcy5vcHRpb25zO1xyXG4gICAgY29uc3Qgc3RhclNpemVPcHRpb25zID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KFRoZW1lUHJvcGVydHlLZXkuU3RhclNpemUpO1xyXG5cclxuICAgIGNvbnN0IHZpc2libGVBcmVhID0gdGhpcy52aXNpYmxlQXJlYTtcclxuICAgIGNvbnN0IGN0eCA9IGJvYXJkLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBsZXQgc3RhclNpemUgPSBhZGFwdGl2ZVN0YXJTaXplID8gYm9hcmQud2lkdGggKiAwLjAwMzUgOiBzdGFyU2l6ZU9wdGlvbnM7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGNvbnN0IHtzcGFjZSwgc2NhbGVkUGFkZGluZ30gPSB0aGlzLmNhbGNTcGFjZUFuZFBhZGRpbmcoKTtcclxuICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICBbMywgOSwgMTVdLmZvckVhY2goaSA9PiB7XHJcbiAgICAgICAgWzMsIDksIDE1XS5mb3JFYWNoKGogPT4ge1xyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBpID49IHZpc2libGVBcmVhWzBdWzBdICYmXHJcbiAgICAgICAgICAgIGkgPD0gdmlzaWJsZUFyZWFbMF1bMV0gJiZcclxuICAgICAgICAgICAgaiA+PSB2aXNpYmxlQXJlYVsxXVswXSAmJlxyXG4gICAgICAgICAgICBqIDw9IHZpc2libGVBcmVhWzFdWzFdXHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHguYXJjKFxyXG4gICAgICAgICAgICAgIGkgKiBzcGFjZSArIHNjYWxlZFBhZGRpbmcsXHJcbiAgICAgICAgICAgICAgaiAqIHNwYWNlICsgc2NhbGVkUGFkZGluZyxcclxuICAgICAgICAgICAgICBzdGFyU2l6ZSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIDIgKiBNYXRoLlBJLFxyXG4gICAgICAgICAgICAgIHRydWVcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZ2V0VGhlbWVQcm9wZXJ0eSgnYm9hcmRMaW5lQ29sb3InKTtcclxuICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZHJhd0Nvb3JkaW5hdGUgPSAoKSA9PiB7XHJcbiAgICBjb25zdCB7Ym9hcmQsIG9wdGlvbnMsIHZpc2libGVBcmVhfSA9IHRoaXM7XHJcbiAgICBpZiAoIWJvYXJkKSByZXR1cm47XHJcbiAgICBjb25zdCB7Ym9hcmRTaXplLCB6b29tLCBwYWRkaW5nLCB0aGVtZX0gPSBvcHRpb25zO1xyXG4gICAgY29uc3QgYm9hcmRMaW5lRXh0ZW50ID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdib2FyZExpbmVFeHRlbnQnKTtcclxuICAgIGxldCB6b29tZWRCb2FyZFNpemUgPSB2aXNpYmxlQXJlYVswXVsxXSAtIHZpc2libGVBcmVhWzBdWzBdICsgMTtcclxuICAgIGNvbnN0IGN0eCA9IGJvYXJkLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICBjb25zdCB7c3BhY2UsIHNjYWxlZFBhZGRpbmd9ID0gdGhpcy5jYWxjU3BhY2VBbmRQYWRkaW5nKCk7XHJcbiAgICBpZiAoY3R4KSB7XHJcbiAgICAgIGN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJztcclxuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdib2FyZExpbmVDb2xvcicpO1xyXG5cclxuICAgICAgY3R4LmZvbnQgPSBgYm9sZCAke3NwYWNlIC8gM31weCBIZWx2ZXRpY2FgO1xyXG5cclxuICAgICAgY29uc3QgY2VudGVyID0gdGhpcy5jYWxjQ2VudGVyKCk7XHJcbiAgICAgIGxldCBvZmZzZXQgPSBzcGFjZSAvIDEuNTtcclxuXHJcbiAgICAgIGlmIChcclxuICAgICAgICBjZW50ZXIgPT09IENlbnRlci5DZW50ZXIgJiZcclxuICAgICAgICB2aXNpYmxlQXJlYVswXVswXSA9PT0gMCAmJlxyXG4gICAgICAgIHZpc2libGVBcmVhWzBdWzFdID09PSBib2FyZFNpemUgLSAxXHJcbiAgICAgICkge1xyXG4gICAgICAgIG9mZnNldCAtPSBzY2FsZWRQYWRkaW5nIC8gMjtcclxuICAgICAgfVxyXG5cclxuICAgICAgQTFfTEVUVEVSUy5mb3JFYWNoKChsLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHggPSBzcGFjZSAqIGluZGV4ICsgc2NhbGVkUGFkZGluZztcclxuICAgICAgICBsZXQgb2Zmc2V0VG9wID0gb2Zmc2V0O1xyXG4gICAgICAgIGxldCBvZmZzZXRCb3R0b20gPSBvZmZzZXQ7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgY2VudGVyID09PSBDZW50ZXIuVG9wTGVmdCB8fFxyXG4gICAgICAgICAgY2VudGVyID09PSBDZW50ZXIuVG9wUmlnaHQgfHxcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLlRvcFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgb2Zmc2V0VG9wIC09IHNwYWNlICogYm9hcmRMaW5lRXh0ZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Cb3R0b21MZWZ0IHx8XHJcbiAgICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Cb3R0b21SaWdodCB8fFxyXG4gICAgICAgICAgY2VudGVyID09PSBDZW50ZXIuQm90dG9tXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBvZmZzZXRCb3R0b20gLT0gKHNwYWNlICogYm9hcmRMaW5lRXh0ZW50KSAvIDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCB5MSA9IHZpc2libGVBcmVhWzFdWzBdICogc3BhY2UgKyBwYWRkaW5nIC0gb2Zmc2V0VG9wO1xyXG4gICAgICAgIGxldCB5MiA9IHkxICsgem9vbWVkQm9hcmRTaXplICogc3BhY2UgKyBvZmZzZXRCb3R0b20gKiAyO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSB2aXNpYmxlQXJlYVswXVswXSAmJiBpbmRleCA8PSB2aXNpYmxlQXJlYVswXVsxXSkge1xyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBjZW50ZXIgIT09IENlbnRlci5Cb3R0b21MZWZ0ICYmXHJcbiAgICAgICAgICAgIGNlbnRlciAhPT0gQ2VudGVyLkJvdHRvbVJpZ2h0ICYmXHJcbiAgICAgICAgICAgIGNlbnRlciAhPT0gQ2VudGVyLkJvdHRvbVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsLCB4LCB5MSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBjZW50ZXIgIT09IENlbnRlci5Ub3BMZWZ0ICYmXHJcbiAgICAgICAgICAgIGNlbnRlciAhPT0gQ2VudGVyLlRvcFJpZ2h0ICYmXHJcbiAgICAgICAgICAgIGNlbnRlciAhPT0gQ2VudGVyLlRvcFxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChsLCB4LCB5Mik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIEExX05VTUJFUlMuc2xpY2UoLXRoaXMub3B0aW9ucy5ib2FyZFNpemUpLmZvckVhY2goKGw6IG51bWJlciwgaW5kZXgpID0+IHtcclxuICAgICAgICBjb25zdCB5ID0gc3BhY2UgKiBpbmRleCArIHNjYWxlZFBhZGRpbmc7XHJcbiAgICAgICAgbGV0IG9mZnNldExlZnQgPSBvZmZzZXQ7XHJcbiAgICAgICAgbGV0IG9mZnNldFJpZ2h0ID0gb2Zmc2V0O1xyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLlRvcExlZnQgfHxcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLkJvdHRvbUxlZnQgfHxcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLkxlZnRcclxuICAgICAgICApIHtcclxuICAgICAgICAgIG9mZnNldExlZnQgLT0gc3BhY2UgKiBib2FyZExpbmVFeHRlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIGNlbnRlciA9PT0gQ2VudGVyLlRvcFJpZ2h0IHx8XHJcbiAgICAgICAgICBjZW50ZXIgPT09IENlbnRlci5Cb3R0b21SaWdodCB8fFxyXG4gICAgICAgICAgY2VudGVyID09PSBDZW50ZXIuUmlnaHRcclxuICAgICAgICApIHtcclxuICAgICAgICAgIG9mZnNldFJpZ2h0IC09IChzcGFjZSAqIGJvYXJkTGluZUV4dGVudCkgLyAyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgeDEgPSB2aXNpYmxlQXJlYVswXVswXSAqIHNwYWNlICsgcGFkZGluZyAtIG9mZnNldExlZnQ7XHJcbiAgICAgICAgbGV0IHgyID0geDEgKyB6b29tZWRCb2FyZFNpemUgKiBzcGFjZSArIDIgKiBvZmZzZXRSaWdodDtcclxuICAgICAgICBpZiAoaW5kZXggPj0gdmlzaWJsZUFyZWFbMV1bMF0gJiYgaW5kZXggPD0gdmlzaWJsZUFyZWFbMV1bMV0pIHtcclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgY2VudGVyICE9PSBDZW50ZXIuVG9wUmlnaHQgJiZcclxuICAgICAgICAgICAgY2VudGVyICE9PSBDZW50ZXIuQm90dG9tUmlnaHQgJiZcclxuICAgICAgICAgICAgY2VudGVyICE9PSBDZW50ZXIuUmlnaHRcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQobC50b1N0cmluZygpLCB4MSwgeSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGNlbnRlciAhPT0gQ2VudGVyLlRvcExlZnQgJiZcclxuICAgICAgICAgICAgY2VudGVyICE9PSBDZW50ZXIuQm90dG9tTGVmdCAmJlxyXG4gICAgICAgICAgICBjZW50ZXIgIT09IENlbnRlci5MZWZ0XHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGwudG9TdHJpbmcoKSwgeDIsIHkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY2FsY1NwYWNlQW5kUGFkZGluZyA9IChjYW52YXMgPSB0aGlzLmNhbnZhcykgPT4ge1xyXG4gICAgbGV0IHNwYWNlID0gMDtcclxuICAgIGxldCBzY2FsZWRQYWRkaW5nID0gMDtcclxuICAgIGxldCBzY2FsZWRCb2FyZEV4dGVudCA9IDA7XHJcbiAgICBpZiAoY2FudmFzKSB7XHJcbiAgICAgIGNvbnN0IHtwYWRkaW5nLCBib2FyZFNpemUsIHpvb219ID0gdGhpcy5vcHRpb25zO1xyXG4gICAgICBjb25zdCBib2FyZExpbmVFeHRlbnQgPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ2JvYXJkTGluZUV4dGVudCcpO1xyXG4gICAgICBjb25zdCB7dmlzaWJsZUFyZWF9ID0gdGhpcztcclxuXHJcbiAgICAgIGlmIChcclxuICAgICAgICAodmlzaWJsZUFyZWFbMF1bMF0gIT09IDAgJiYgdmlzaWJsZUFyZWFbMF1bMV0gPT09IGJvYXJkU2l6ZSAtIDEpIHx8XHJcbiAgICAgICAgKHZpc2libGVBcmVhWzFdWzBdICE9PSAwICYmIHZpc2libGVBcmVhWzFdWzFdID09PSBib2FyZFNpemUgLSAxKVxyXG4gICAgICApIHtcclxuICAgICAgICBzY2FsZWRCb2FyZEV4dGVudCA9IGJvYXJkTGluZUV4dGVudDtcclxuICAgICAgfVxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgKHZpc2libGVBcmVhWzBdWzBdICE9PSAwICYmIHZpc2libGVBcmVhWzBdWzFdICE9PSBib2FyZFNpemUgLSAxKSB8fFxyXG4gICAgICAgICh2aXNpYmxlQXJlYVsxXVswXSAhPT0gMCAmJiB2aXNpYmxlQXJlYVsxXVsxXSAhPT0gYm9hcmRTaXplIC0gMSlcclxuICAgICAgKSB7XHJcbiAgICAgICAgc2NhbGVkQm9hcmRFeHRlbnQgPSBib2FyZExpbmVFeHRlbnQgKiAyO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBkaXZpc29yID0gem9vbSA/IGJvYXJkU2l6ZSArIHNjYWxlZEJvYXJkRXh0ZW50IDogYm9hcmRTaXplO1xyXG4gICAgICBzcGFjZSA9IChjYW52YXMud2lkdGggLSBwYWRkaW5nICogMikgLyBNYXRoLmNlaWwoZGl2aXNvcik7XHJcbiAgICAgIHNjYWxlZFBhZGRpbmcgPSBwYWRkaW5nICsgc3BhY2UgLyAyO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtzcGFjZSwgc2NhbGVkUGFkZGluZywgc2NhbGVkQm9hcmRFeHRlbnR9O1xyXG4gIH07XHJcblxyXG4gIHBsYXlFZmZlY3QgPSAobWF0ID0gdGhpcy5tYXQsIGVmZmVjdE1hdCA9IHRoaXMuZWZmZWN0TWF0LCBjbGVhciA9IHRydWUpID0+IHtcclxuICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMuZWZmZWN0Q2FudmFzO1xyXG5cclxuICAgIGlmIChjYW52YXMpIHtcclxuICAgICAgaWYgKGNsZWFyKSB0aGlzLmNsZWFyQ2FudmFzKGNhbnZhcyk7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWZmZWN0TWF0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBlZmZlY3RNYXRbaV0ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHZhbHVlID0gZWZmZWN0TWF0W2ldW2pdO1xyXG4gICAgICAgICAgY29uc3Qge3NwYWNlLCBzY2FsZWRQYWRkaW5nfSA9IHRoaXMuY2FsY1NwYWNlQW5kUGFkZGluZygpO1xyXG4gICAgICAgICAgY29uc3QgeCA9IHNjYWxlZFBhZGRpbmcgKyBpICogc3BhY2U7XHJcbiAgICAgICAgICBjb25zdCB5ID0gc2NhbGVkUGFkZGluZyArIGogKiBzcGFjZTtcclxuICAgICAgICAgIGNvbnN0IGtpID0gbWF0W2ldW2pdO1xyXG4gICAgICAgICAgbGV0IGVmZmVjdDtcclxuICAgICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgIGlmIChjdHgpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgIGNhc2UgRWZmZWN0LkJhbjoge1xyXG4gICAgICAgICAgICAgICAgZWZmZWN0ID0gbmV3IEJhbkVmZmVjdChjdHgsIHgsIHksIHNwYWNlLCBraSk7XHJcbiAgICAgICAgICAgICAgICBlZmZlY3QucGxheSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVmZmVjdE1hdFtpXVtqXSA9IEVmZmVjdC5Ob25lO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBjb25zdCB7Ym9hcmRTaXplfSA9IHRoaXMub3B0aW9ucztcclxuICAgICAgdGhpcy5zZXRFZmZlY3RNYXQoZW1wdHkoW2JvYXJkU2l6ZSwgYm9hcmRTaXplXSkpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGRyYXdDdXJzb3IgPSAoKSA9PiB7XHJcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLmN1cnNvckNhbnZhcztcclxuICAgIGlmIChjYW52YXMpIHtcclxuICAgICAgdGhpcy5jbGVhckN1cnNvckNhbnZhcygpO1xyXG4gICAgICBpZiAodGhpcy5jdXJzb3IgPT09IEN1cnNvci5Ob25lKSByZXR1cm47XHJcbiAgICAgIGlmIChpc01vYmlsZURldmljZSgpICYmICF0aGlzLnRvdWNoTW92aW5nKSByZXR1cm47XHJcblxyXG4gICAgICBjb25zdCB7cGFkZGluZywgdGhlbWV9ID0gdGhpcy5vcHRpb25zO1xyXG4gICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgY29uc3Qge3NwYWNlfSA9IHRoaXMuY2FsY1NwYWNlQW5kUGFkZGluZygpO1xyXG4gICAgICBjb25zdCB7dmlzaWJsZUFyZWEsIGN1cnNvciwgY3Vyc29yVmFsdWV9ID0gdGhpcztcclxuXHJcbiAgICAgIGNvbnN0IFtpZHgsIGlkeV0gPSB0aGlzLmN1cnNvclBvc2l0aW9uO1xyXG4gICAgICBpZiAoaWR4IDwgdmlzaWJsZUFyZWFbMF1bMF0gfHwgaWR4ID4gdmlzaWJsZUFyZWFbMF1bMV0pIHJldHVybjtcclxuICAgICAgaWYgKGlkeSA8IHZpc2libGVBcmVhWzFdWzBdIHx8IGlkeSA+IHZpc2libGVBcmVhWzFdWzFdKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IHggPSBpZHggKiBzcGFjZSArIHNwYWNlIC8gMiArIHBhZGRpbmc7XHJcbiAgICAgIGNvbnN0IHkgPSBpZHkgKiBzcGFjZSArIHNwYWNlIC8gMiArIHBhZGRpbmc7XHJcbiAgICAgIGNvbnN0IGtpID0gdGhpcy5tYXQ/LltpZHhdPy5baWR5XSB8fCBLaS5FbXB0eTtcclxuXHJcbiAgICAgIGlmIChjdHgpIHtcclxuICAgICAgICBsZXQgY3VyO1xyXG4gICAgICAgIGNvbnN0IHNpemUgPSBzcGFjZSAqIDAuODtcclxuICAgICAgICBpZiAoY3Vyc29yID09PSBDdXJzb3IuQ2lyY2xlKSB7XHJcbiAgICAgICAgICBjdXIgPSBuZXcgQ2lyY2xlTWFya3VwKFxyXG4gICAgICAgICAgICBjdHgsXHJcbiAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgIHNwYWNlLFxyXG4gICAgICAgICAgICBraSxcclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGN1ci5zZXRHbG9iYWxBbHBoYSgwLjgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY3Vyc29yID09PSBDdXJzb3IuU3F1YXJlKSB7XHJcbiAgICAgICAgICBjdXIgPSBuZXcgU3F1YXJlTWFya3VwKFxyXG4gICAgICAgICAgICBjdHgsXHJcbiAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgIHNwYWNlLFxyXG4gICAgICAgICAgICBraSxcclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGN1ci5zZXRHbG9iYWxBbHBoYSgwLjgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY3Vyc29yID09PSBDdXJzb3IuVHJpYW5nbGUpIHtcclxuICAgICAgICAgIGN1ciA9IG5ldyBUcmlhbmdsZU1hcmt1cChcclxuICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICB5LFxyXG4gICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAga2ksXHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlVGhlbWVDb250ZXh0KClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBjdXIuc2V0R2xvYmFsQWxwaGEoMC44KTtcclxuICAgICAgICB9IGVsc2UgaWYgKGN1cnNvciA9PT0gQ3Vyc29yLkNyb3NzKSB7XHJcbiAgICAgICAgICBjdXIgPSBuZXcgQ3Jvc3NNYXJrdXAoXHJcbiAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgeCxcclxuICAgICAgICAgICAgeSxcclxuICAgICAgICAgICAgc3BhY2UsXHJcbiAgICAgICAgICAgIGtpLFxyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgY3VyLnNldEdsb2JhbEFscGhhKDAuOCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjdXJzb3IgPT09IEN1cnNvci5UZXh0KSB7XHJcbiAgICAgICAgICBjdXIgPSBuZXcgVGV4dE1hcmt1cChcclxuICAgICAgICAgICAgY3R4LFxyXG4gICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICB5LFxyXG4gICAgICAgICAgICBzcGFjZSxcclxuICAgICAgICAgICAga2ksXHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlVGhlbWVDb250ZXh0KCksXHJcbiAgICAgICAgICAgIGN1cnNvclZhbHVlXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgY3VyLnNldEdsb2JhbEFscGhhKDAuOCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChraSA9PT0gS2kuRW1wdHkgJiYgY3Vyc29yID09PSBDdXJzb3IuQmxhY2tTdG9uZSkge1xyXG4gICAgICAgICAgY3VyID0gbmV3IEZsYXRTdG9uZShjdHgsIHgsIHksIEtpLkJsYWNrLCB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpKTtcclxuICAgICAgICAgIGN1ci5zZXRTaXplKHNpemUpO1xyXG4gICAgICAgICAgY3VyLnNldEdsb2JhbEFscGhhKDAuNSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChraSA9PT0gS2kuRW1wdHkgJiYgY3Vyc29yID09PSBDdXJzb3IuV2hpdGVTdG9uZSkge1xyXG4gICAgICAgICAgY3VyID0gbmV3IEZsYXRTdG9uZShjdHgsIHgsIHksIEtpLldoaXRlLCB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpKTtcclxuICAgICAgICAgIGN1ci5zZXRTaXplKHNpemUpO1xyXG4gICAgICAgICAgY3VyLnNldEdsb2JhbEFscGhhKDAuNSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjdXJzb3IgPT09IEN1cnNvci5DbGVhcikge1xyXG4gICAgICAgICAgY3VyID0gbmV3IEZsYXRTdG9uZShjdHgsIHgsIHksIEtpLkVtcHR5LCB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpKTtcclxuICAgICAgICAgIGN1ci5zZXRTaXplKHNpemUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdXI/LmRyYXcoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGRyYXdTdG9uZXMgPSAoXHJcbiAgICBtYXQ6IG51bWJlcltdW10gPSB0aGlzLm1hdCxcclxuICAgIGNhbnZhcyA9IHRoaXMuY2FudmFzLFxyXG4gICAgY2xlYXIgPSB0cnVlXHJcbiAgKSA9PiB7XHJcbiAgICBjb25zdCB7dGhlbWUgPSBUaGVtZS5CbGFja0FuZFdoaXRlLCB0aGVtZVJlc291cmNlc30gPSB0aGlzLm9wdGlvbnM7XHJcbiAgICBpZiAoY2xlYXIpIHRoaXMuY2xlYXJDYW52YXMoKTtcclxuICAgIGlmIChjYW52YXMpIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG1hdFtpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBtYXRbaV1bal07XHJcbiAgICAgICAgICBpZiAodmFsdWUgIT09IDApIHtcclxuICAgICAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICAgICAgIGlmIChjdHgpIHtcclxuICAgICAgICAgICAgICBzZXRJbWFnZVNtb290aGluZ1F1YWxpdHkoY3R4KTtcclxuICAgICAgICAgICAgICBjb25zdCB7c3BhY2UsIHNjYWxlZFBhZGRpbmd9ID0gdGhpcy5jYWxjU3BhY2VBbmRQYWRkaW5nKCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgeCA9IHNjYWxlZFBhZGRpbmcgKyBpICogc3BhY2U7XHJcbiAgICAgICAgICAgICAgY29uc3QgeSA9IHNjYWxlZFBhZGRpbmcgKyBqICogc3BhY2U7XHJcbiAgICAgICAgICAgICAgY29uc3QgcmF0aW8gPSB0aGlzLmdldFRoZW1lUHJvcGVydHkoJ3N0b25lUmF0aW8nKTtcclxuICAgICAgICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgIHRoZW1lICE9PSBUaGVtZS5TdWJkdWVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGVtZSAhPT0gVGhlbWUuQmxhY2tBbmRXaGl0ZSAmJlxyXG4gICAgICAgICAgICAgICAgdGhlbWUgIT09IFRoZW1lLkZsYXQgJiZcclxuICAgICAgICAgICAgICAgIHRoZW1lICE9PSBUaGVtZS5XYXJtICYmXHJcbiAgICAgICAgICAgICAgICB0aGVtZSAhPT0gVGhlbWUuRGFyayAmJlxyXG4gICAgICAgICAgICAgICAgdGhlbWUgIT09IFRoZW1lLkhpZ2hDb250cmFzdFxyXG4gICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSAzO1xyXG4gICAgICAgICAgICAgICAgY3R4LnNoYWRvd09mZnNldFkgPSAzO1xyXG4gICAgICAgICAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gdGhpcy5nZXRUaGVtZVByb3BlcnR5KCdzaGFkb3dDb2xvcicpO1xyXG4gICAgICAgICAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSA4O1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjdHguc2hhZG93T2Zmc2V0WCA9IDA7XHJcbiAgICAgICAgICAgICAgICBjdHguc2hhZG93T2Zmc2V0WSA9IDA7XHJcbiAgICAgICAgICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDA7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGxldCBzdG9uZTtcclxuXHJcbiAgICAgICAgICAgICAgc3dpdGNoICh0aGVtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUaGVtZS5CbGFja0FuZFdoaXRlOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBUaGVtZS5GbGF0OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBUaGVtZS5XYXJtOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBUaGVtZS5IaWdoQ29udHJhc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgc3RvbmUgPSBuZXcgRmxhdFN0b25lKFxyXG4gICAgICAgICAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICBzdG9uZS5zZXRTaXplKHNwYWNlICogcmF0aW8gKiAyKTtcclxuICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRoZW1lLkRhcms6IHtcclxuICAgICAgICAgICAgICAgICAgc3RvbmUgPSBuZXcgRmxhdFN0b25lKFxyXG4gICAgICAgICAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICAgICAgICAgIHksXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUaGVtZUNvbnRleHQoKVxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICBzdG9uZS5zZXRTaXplKHNwYWNlICogcmF0aW8gKiAyKTtcclxuICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvYXJkUGl4ZWxTaXplID0gY2FudmFzPy53aWR0aCB8fCA1MTI7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc291cmNlcyA9IGdldFRoZW1lUmVzb3VyY2VzKFxyXG4gICAgICAgICAgICAgICAgICAgIHRoZW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHRoZW1lUmVzb3VyY2VzLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvYXJkUGl4ZWxTaXplXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBibGFja3MgPSByZXNvdXJjZXMuYmxhY2tzLm1hcChcclxuICAgICAgICAgICAgICAgICAgICAgIChpOiBzdHJpbmcpID0+IGltYWdlc1tpXVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2hpdGVzID0gcmVzb3VyY2VzLndoaXRlcy5tYXAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAoaTogc3RyaW5nKSA9PiBpbWFnZXNbaV1cclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZCA9IGkgKyAxMCArIGo7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RvbmUgPSBuZXcgSW1hZ2VTdG9uZShcclxuICAgICAgICAgICAgICAgICAgICAgIGN0eCxcclxuICAgICAgICAgICAgICAgICAgICAgIHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICB5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtb2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICBibGFja3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICB3aGl0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVRoZW1lQ29udGV4dCgpXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBzdG9uZS5zZXRTaXplKHNwYWNlICogcmF0aW8gKiAyKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBzdG9uZT8uZHJhdygpO1xyXG4gICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG59XHJcbiJdLCJuYW1lcyI6WyJfX3NwcmVhZEFycmF5IiwiX19yZWFkIiwiX192YWx1ZXMiLCJmaWx0ZXIiLCJmaW5kTGFzdEluZGV4IiwiVGhlbWVQcm9wZXJ0eUtleSIsIktpIiwiVGhlbWUiLCJBbmFseXNpc1BvaW50VGhlbWUiLCJDZW50ZXIiLCJFZmZlY3QiLCJNYXJrdXAiLCJDdXJzb3IiLCJQcm9ibGVtQW5zd2VyVHlwZSIsIlBhdGhEZXRlY3Rpb25TdHJhdGVneSIsIl9hIiwiX19leHRlbmRzIiwiY2xvbmVEZWVwIiwicmVwbGFjZSIsImNvbXBhY3QiLCJmbGF0dGVuRGVwdGgiLCJzdW0iLCJjbG9uZSIsInNhbXBsZSIsImVuY29kZSIsIl9fYXNzaWduIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQTs7Ozs7O0FBTUc7QUFDSCxTQUFTLFNBQVMsQ0FBSSxZQUEyQixFQUFFLEdBQVEsRUFBQTtBQUN6RCxJQUFBLElBQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDdkIsSUFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7QUFDWixRQUFBLElBQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN4QyxRQUFBLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMzQyxRQUFBLE9BQU8sS0FBSyxDQUNWLFlBQVksRUFDWixTQUFTLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxFQUNsQyxTQUFTLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUNwQyxDQUFDO0tBQ0g7U0FBTTtBQUNMLFFBQUEsT0FBTyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDcEI7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILFNBQVMsS0FBSyxDQUFJLFlBQTJCLEVBQUUsSUFBUyxFQUFFLElBQVMsRUFBQTtJQUNqRSxJQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7QUFDdkIsSUFBQSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMs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LEVBQUU7UUFDbkIsT0FBTztZQUNMLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztZQUN6RCxHQUFHLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7WUFDeEQsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO1lBQ3pELEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBQztBQUMxRCxZQUFBLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztBQUN0RCxZQUFBLEtBQUssRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7U0FDcEQsQ0FBQztLQUNIOztJQUVELElBQUksU0FBUyxJQUFJLEVBQUUsSUFBSSxTQUFTLEdBQUcsRUFBRSxFQUFFO1FBQ3JDLE9BQU87WUFDTCxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7WUFDeEQsR0FBRyxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO1lBQ3hELElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztZQUMxRCxFQUFFLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDeEQsWUFBQSxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7QUFDdEQsWUFBQSxLQUFLLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFDO1NBQ3BELENBQUM7S0FDSDs7SUFHRCxJQUFJLFNBQVMsSUFBSSxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtRQUNyQyxPQUFPO1lBQ0wsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1lBQzFELEdBQUcsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztZQUN6RCxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7WUFDekQsRUFBRSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ3hELFlBQUEsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFDO0FBQ3RELFlBQUEsS0FBSyxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztTQUNwRCxDQUFDO0tBQ0g7O0lBRUQsSUFBSSxTQUFTLElBQUksRUFBRSxJQUFJLFNBQVMsR0FBRyxFQUFFLEVBQUU7UUFDckMsT0FBTztZQUNMLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztZQUN6RCxHQUFHLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7WUFDeEQsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO1lBQ3pELEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUN4RCxZQUFBLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztBQUN0RCxZQUFBLEtBQUssRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7U0FDcEQsQ0FBQztLQUNIOztJQUVELElBQUksU0FBUyxJQUFJLEVBQUUsSUFBSSxTQUFTLEdBQUcsRUFBRSxFQUFFO1FBQ3JDLE9BQU87WUFDTCxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7WUFDMUQsR0FBRyxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1lBQzNELElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztZQUMzRCxFQUFFLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDeEQsWUFBQSxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7QUFDdEQsWUFBQSxLQUFLLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFDO1NBQ3BELENBQUM7S0FDSDs7SUFFRCxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtRQUNwQyxPQUFPO1lBQ0wsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1lBQ3pELEdBQUcsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztZQUMxRCxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUM7WUFDMUQsRUFBRSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ3ZELFlBQUEsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFDO0FBQ3RELFlBQUEsS0FBSyxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztTQUNwRCxDQUFDO0tBQ0g7O0lBRUQsSUFBSSxTQUFTLElBQUksQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUU7UUFDbkMsT0FBTztZQUNMLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztZQUMxRCxHQUFHLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7WUFDMUQsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1lBQzFELEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUN4RCxZQUFBLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztBQUN0RCxZQUFBLEtBQUssRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7U0FDcEQsQ0FBQztLQUNIO0lBQ0QsT0FBTztRQUNMLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztRQUN6RCxHQUFHLEVBQUUsRUFBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7UUFDekQsSUFBSSxFQUFFLEVBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDO1FBQzFELEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUN4RCxRQUFBLElBQUksRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBQztBQUN0RCxRQUFBLEtBQUssRUFBRSxFQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUM7S0FDcEQsQ0FBQztBQUNKLEVBQUU7SUFFVyxNQUFNLEdBQUcsVUFBQyxDQUFTLEVBQUUsS0FBUyxFQUFFLEtBQVMsRUFBQTtBQUFwQixJQUFBLElBQUEsS0FBQSxLQUFBLEtBQUEsQ0FBQSxFQUFBLEVBQUEsS0FBUyxHQUFBLENBQUEsQ0FBQSxFQUFBO0FBQUUsSUFBQSxJQUFBLEtBQUEsS0FBQSxLQUFBLENBQUEsRUFBQSxFQUFBLEtB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QUFBLFNBQVMsR0FBRyxVQUFDLEdBQVEsRUFBRSxNQUFVLEVBQUE7QUFBVixJQUFBLElBQUEsTUFBQSxLQUFBLEtBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBVSxHQUFBLENBQUEsQ0FBQSxFQUFBO0lBQzVDLElBQUksTUFBTSxLQUFLLENBQUM7QUFBRSxRQUFBLE9BQU8sR0FBRyxDQUFDO0FBQzdCLElBQUEsSUFBTSxHQUFHLEdBQUdDLFlBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN2QixJQUFBLElBQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQ3ZELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLEVBQUU7QUFFVyxJQUFBLE9BQU8sR0FBRyxVQUFDLEdBQVEsRUFBRSxJQUFVLEVBQUUsT0FBVyxFQUFFLE9BQVcsRUFBQTtBQUFwQyxJQUFBLElBQUEsSUFBQSxLQUFBLEtBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBVSxHQUFBLEdBQUEsQ0FBQSxFQUFBO0FBQUUsSUFBQSxJQUFBLE9BQUEsS0FBQSxLQUFBLENBQUEsRUFBQSxFQUFBLE9BQVcsR0FBQSxDQUFBLENBQUEsRUFBQTtBQUFFLElBQUEsSUFBQSxPQUFBLEtBQUEsS0FBQSxDQUFBLEVBQUEsRUFBQSxPQUFXLEdBQUEsQ0FBQSxDQUFBLEVBQUE7SUFDcEUsSUFBSSxHQUFHLEtBQUssTUFBTTtRQUFFLE9BQU8sRUFBQSxDQUFBLE1BQUEsQ0FBRyxJQUFJLEVBQUEsSUFBQSxDQUFJLENBQUM7QUFDdkMsSUFBQSxJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztJQUNqRCxJQUFNLEdBQUcsR0FBRyxV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RyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNuRSxRQUFBLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RELFFBQUEsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUV0RSxRQUFBLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3ZCLGdCQUFnQixHQUFHLGdCQUFnQixFQUNuQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FDcEMsQ0FBQztRQUVGLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQztBQUMxQixRQUFBLE1BQU0sR0FBRyxNQUFNLEdBQUcsUUFBUSxDQUFDO0FBRTNCLFFBQUEsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtBQUN4QixZQUFBLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN4QixZQUFBLE1BQU0sR0FBRyxNQUFNLEdBQUcsUUFBUSxDQUFDO1NBQzVCO1FBRUQsTUFBTSxHQUFHLGdCQUFnQixDQUFDO0FBQzFCLFFBQUEsTUFBTSxHQUFHLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDM0IsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtZQUMzQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDM0IsWUFBQSxNQUFNLEdBQUcsTUFBTSxHQUFHLFFBQVEsQ0FBQztTQUM1QjtLQUNGO1NBQU07UUFDTCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxD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O1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsa0JBQWtCLENBQUcsR0FBQTtnQkFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsa0JBQWtCLENBQUcsR0FBQTtnQkFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsa0JBQWtCLENBQUcsR0FBQTtnQkFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLEVBQUU7QUFDYixhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsa0JBQWtCLENBQUcsR0FBQTtnQkFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLEVBQUU7QUFDYixhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLEVBQUU7QUFDYixhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLEVBQUU7QUFDYixhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsaUJBQWlCLENBQUcsR0FBQTtnQkFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLEVBQUU7QUFDYixhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsd0JBQXdCLENBQUcsR0FBQTtnQkFDakMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsd0JBQXdCLENBQUcsR0FBQTtnQkFDakMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsdUJBQXVCLENBQUcsR0FBQTtnQkFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsdUJBQXVCLENBQUcsR0FBQTtnQkFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsdUJBQXVCLENBQUcsR0FBQTtnQkFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsd0JBQXdCLENBQUcsR0FBQTtnQkFDakMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsd0JBQXdCLENBQUcsR0FBQTtnQkFDakMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsaUJBQWlCLENBQUM7QUFDaEUsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsdUJBQXVCLENBQUcsR0FBQTtnQkFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQ04sd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7QUFDL0QsZ0JBQUEsUUFBUSxFQUFFLHFCQUFxQjtBQUNoQyxhQUFBO1lBQ0QsRUFBQyxDQUFBTSxjQUFNLENBQUMsdUJBQXVCLENBQUcsR0FBQTtnQkFDaEMsS0FBSyxFQUFFLElBQUksQ0FB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

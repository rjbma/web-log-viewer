"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIndexMatch = exports.extractIndexTokens = void 0;
var extractIndexTokens = function (cfg) { return function (obj, tokens) {
    if (tokens === void 0) { tokens = []; }
    var newTokens = __spreadArrays(tokens);
    if (cfg.includeObjectKeys) {
        newTokens = __spreadArrays(newTokens, Object.keys(obj));
    }
    return Object.values(obj).reduce(function (acc, val) {
        if (!val) {
            return acc;
        }
        else if (typeof val !== 'object') {
            return __spreadArrays(acc, [removeDiacritics(val.toString())]);
        }
        else {
            return extractIndexTokens(cfg)(val, acc);
        }
    }, newTokens);
}; };
exports.extractIndexTokens = extractIndexTokens;
// see: https://github.com/esamattis/underscore.string
var removeDiacritics = function (str) {
    var accents = 'ąàáäâãåæăćčĉęèéëêĝĥìíïîĵłľńňòóöőôõðøśșşšŝťțţŭùúüűûñÿýçżźž';
    var result = 'aaaaaaaaaccceeeeeghiiiijllnnoooooooossssstttuuuuuunyyczzz';
    return str.toLowerCase().replace(/.{1}/g, function (c) {
        var index = accents.indexOf(c);
        return index === -1 ? c : result[index];
    });
};
var isIndexMatch = function (filter) {
    if (!filter) {
        return function () { return true; };
    }
    var tokens = removeDiacritics(filter).split(/\s+/);
    return function (index) { return tokens.every(function (token) { return index.find(isSingleMatch(token)); }); };
};
exports.isIndexMatch = isIndexMatch;
var isSingleMatch = function (tokenToSearch) { return function (data) { return data.indexOf(tokenToSearch) != -1; }; };

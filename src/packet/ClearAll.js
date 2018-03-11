'use strict';
function ClearAll() {}

module.exports = ClearAll;

ClearAll.prototype.build = function() {
    var buffer = new Buffer(1);
    buffer.writeUInt8(18, 0, 1);
    return buffer;
};
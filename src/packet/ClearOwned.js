'use strict';
function ClearOwned() {}

module.exports = ClearOwned;

ClearOwned.prototype.build = function(a) {
    var buffer = new Buffer(1);
    buffer.writeUInt8(20, 0, 1);
    return buffer;
};
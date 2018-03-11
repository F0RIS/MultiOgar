'use strict';
const BinaryWriter = require("./BinaryWriter");

function LeaderboardPos(place) {
    this.place = place;
}

module.exports = LeaderboardPos;

LeaderboardPos.prototype.build = function() {
    var writer = new BinaryWriter();
    writer.writeUInt8(0x30);
    writer.writeUInt16(this.place);
    return writer.toBuffer();
};
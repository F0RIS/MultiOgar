'use strict';
const Mode = require("./Mode");

function FFA() {
    Mode.apply(this, Array.prototype.slice.call(arguments));
    this.ID = 0;
    this.decayMod = 1;
    this.name = "Free For All";
    this.specByLeaderboard = 1;
}

module.exports = FFA;
FFA.prototype = new Mode;

FFA.prototype.onPlayerSpawn = function(gameServer, player) {
    player.color = gameServer.randomColor();
    gameServer.spawnPlayer(player, gameServer.randomPosition());
};

FFA.prototype._updateLB = function(gameServer, lb) {
    gameServer.leaderboardType = this.packetLB;
    for (var i = 0, pos = 0; i < gameServer.clients.length; i++) {
        var player = gameServer.clients[i].playerTracker;
        if (player.isRemoved || !player.cells.length || player.socket.connected === 0 ||
            (!gameServer.config.minionsOnLB && player.isMi)) continue;
        for (var j = 0; j < pos; j++) if (lb[j]._score < player._score) break;
        lb.splice(j, 0, player);
        pos++;
    }
    this.rankOne = lb[0];
};
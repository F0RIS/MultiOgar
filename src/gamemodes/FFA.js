'use strict';
const Mode = require("./Mode");

function FFA() {
    Mode.apply(this, Array.prototype.slice.call(arguments));
    this.ID = 0;
    this.decayMod = 1;
    this.name = "Free For All";
}

module.exports = FFA;
FFA.prototype = new Mode;

FFA.prototype.onPlayerSpawn = function(gameServer, player) {
    player.color = gameServer.randomColor();
    gameServer.spawnPlayer(player, gameServer.randomPosition());
};

FFA.prototype.updateLB = function(gameServer, lb) {
    gameServer.leaderboardType = this.packetLB;
    for (var i = 0, pos = 0; i < gameServer.clients.length; i++) {
        var player = gameServer.clients[i].playerTracker;
        if (player.isRemoved || !player.cells.length || player.socket.connected == 0) continue;
        for (var j = 0; j < pos; j++) if (lb[j]._score < player._score) break;
        lb.splice(j, 0, player);
        pos++;
    }
    var clients = gameServer.clients.valueOf();
    clients.sort(function(a, b) {
        return b.playerTracker._score - a.playerTracker._score;
    });
    if (clients[0] && clients[0].playerTracker.connected != 0) this.rankOne = clients[0].playerTracker;
};

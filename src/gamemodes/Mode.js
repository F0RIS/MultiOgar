'use strict';
function Mode() {
    this.ID = -1;
    this.name = "Null";
    this.decayMod = 1;
    this.packetLB = 49;
    this.haveTeams = 0;
    this.isTournament = 0;
}

module.exports = Mode;

Mode.prototype.onServerInit = function(gameServer) {
    gameServer.running = 1;
};

Mode.prototype.onTick = function(gameServer) {};

Mode.prototype.onPlayerInit = function(player) {};

Mode.prototype.onPlayerSpawn = function(gameServer, player) {
    player.color = gameServer.randomColor();
    gameServer.spawnPlayer(player);
};

Mode.prototype.onCellAdd = function(cell) {};

Mode.prototype.onCellRemove = function(cell) {};

Mode.prototype.onCellMove = function(cell, gameServer) {};

Mode.prototype._updateLB = function(gameServer) {
    gameServer.leaderboardType = this.packetLB;
};

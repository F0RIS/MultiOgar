'use strict';
const Mode = require('./Mode');
const Log = require('../modules/Logger');

function Tournament() {
    Mode.apply(this, Array.prototype.slice.call(arguments));
    this.ID = 4;
    this.name = "Tournament";
    this.packetLB = 48;
    this.isTournament = 1;
    this.prepTime = 5;
    this.endTime = 15;
    this.autoFill = 0;
    this.autoFillPlayers = 1;
    this.dcTime = 0;
    this.gamePhase = 0;
    this.contenders = [];
    this.maxContenders = 12;
    this.winner;
    this.timer;
    this.timeLimit = 3600;
    this.isPlayerLB = 0;
    //this.specByLeaderboard = 0;
}

module.exports = Tournament;
Tournament.prototype = new Mode();

Tournament.prototype.startGamePrep = function (gameServer) {
    this.gamePhase = 1;
    this.timer = this.prepTime;
};

Tournament.prototype.startGame = function (gameServer) {
    gameServer.disableSpawn = 0;
    this.gamePhase = 2;
    this.getSpectate();
    gameServer.config.playerDisconnectTime = this.dcTime;
};

Tournament.prototype.endGame = function (gameServer) {
    this.winner = this.contenders[0];
    this.gamePhase = 3;
    this.timer = this.endTime;
};

Tournament.prototype.endGameTimeout = function (gameServer) {
    gameServer.disableSpawn = 1;
    this.gamePhase = 4;
    this.timer = this.endTime;
};

Tournament.prototype.fillBots = function (gameServer) {
    var fill = this.maxContenders - this.contenders.length;
    for (var i = 0; i < fill; i++)
        gameServer.bots.addBot();
};

Tournament.prototype.getSpectate = function () {
    var index = Math.floor(Math.random() * this.contenders.length);
    this.rankOne = this.contenders[index];
};

Tournament.prototype.prepare = function (gameServer) {
    var len = gameServer.nodes.all.length;
    for (var i = 0; i < len; i++) {
        var node = gameServer.nodes.all[0];
        if (!node) continue;
        gameServer.removeNode(node);
    }
    for (var i = 0; i < gameServer.clients.length; i++) {
        if (gameServer.clients[i].connected != null) continue;
        gameServer.clients[i].close();
    }
    gameServer.bots.loadNames();
    this.gamePhase = 0;
    if (gameServer.config.tourneyAutoFill > 0) {
        this.timer = gameServer.config.tourneyAutoFill;
        this.autoFill = 1;
        this.autoFillPlayers = gameServer.config.tourneyAutoFillTime;
    }
    this.dcTime = gameServer.config.playerDisconnectTime;
    gameServer.config.playerDisconnectTime = 0;
    this.prepTime = gameServer.config.tourneyPrepTime;
    this.endTime = gameServer.config.tourneyEndTime;
    this.maxContenders = gameServer.config.tourneyMaxPlayers;
    this.timeLimit = gameServer.config.tourneyTimeLimit * 60;
};

Tournament.prototype.onPlayerDeath = function (gameServer) {};

Tournament.prototype.formatTime = function (time) {
    if (time < 0) return "0:00";
    var min = Math.floor(this.timeLimit / 60);
    var sec = this.timeLimit % 60;
    sec = (sec > 9) ? sec : "0" + sec.toString();
    return min + ":" + sec;
};

Tournament.prototype.onServerInit = function (gameServer) {
    Log.warn("Since the gamemode is Tournament, it is highly recommended that you don't use the reload command.");
    Log.warn("This is because configs set by the gamemode will be reset to the config.ini values.");
    gameServer.config.playerStartSize = 100;
    gameServer.config.botStartSize = 100;
    gameServer.config.minionStartSize = 100;
    this.prepare(gameServer);
};

Tournament.prototype.onCellAdd = function (gameServer) {};

Tournament.prototype.onPlayerSpawn = function (gameServer, player) {
    if (this.gamePhase == 0 && this.contenders.length < this.maxContenders) {
        player.color = gameServer.randomColor();
        this.contenders.push(player);
        gameServer.spawnPlayer(player, gameServer.randomPosition());
        if (this.contenders.length == this.maxContenders)
            this.startGamePrep(gameServer);
    }
};

Tournament.prototype.onCellRemove = function (cell) {
    var owner = cell.owner;
    var client_dead = 0;
    if (owner.cells.length <= 0) {
        var index = this.contenders.indexOf(owner);
        if (index != -1) {
            if ('_socket' in this.contenders[index].socket) client_dead = 1;
            this.contenders.splice(index, 1);
        }
        var humans = 0;
        for (var i = 0; i < this.contenders.length; i++)
            if ('_socket' in this.contenders[i].socket) humans++;
        if ((this.contenders.length == 1 || humans == 0 || (humans == 1 && client_dead)) && this.gamePhase == 2)
            this.endGame(cell.owner.gameServer);
        else this.onPlayerDeath(cell.owner.gameServer);
    }
};

Tournament.prototype._updateLB = function (gameServer, lb) {
    gameServer.leaderboardType = this.packetLB;
    switch (this.gamePhase) {
        case 0: // Waiting for players
            gameServer.config.ejectCooldown = 1e99;
            gameServer.config.playerSpeed = 0;
            gameServer.config.playerMaxCells = 1;
            lb[0] = "Waiting for";
            lb[1] = "players: ";
            lb[2] = this.contenders.length + "/" + this.maxContenders;
            if (this.autoFill) {
                if (this.timer <= 0) this.fillBots(gameServer);
                else if (this.contenders.length >= this.autoFillPlayers) this.timer--;
            }
            break;
        case 1: // Game about to start
            gameServer.config.ejectCooldown = 1e99;
            gameServer.config.playerSpeed = 0;
            gameServer.config.playerMaxCells = 1;
            lb[0] = "Game starting in";
            lb[1] = this.timer.toString();
            lb[2] = "Good luck!";
            if (this.timer <= 0) this.startGame(gameServer);
            else this.timer--;
            break;
        case 2: // Game in progress
            gameServer.config.ejectCooldown = 0;
            gameServer.config.playerSpeed = 30;
            gameServer.config.playerMaxCells = 16;
            if (!this.isPlayerLB) {
                gameServer.leaderboardType = this.packetLB;
                lb[0] = "Players Remaining";
                lb[1] = this.contenders.length + "/" + this.maxContenders;
                lb[2] = "Time Limit:";
                lb[3] = this.formatTime(this.timeLimit);
            } else this.updateLB_FFA(gameServer, lb);
            if (this.timeLimit < 0) this.endGameTimeout(gameServer);
            else this.timeLimit--;
            break;
        case 3: // Winner declared
            gameServer.config.ejectCooldown = 0;
            gameServer.config.playerSpeed = 30;
            gameServer.config.playerMaxCells = 16;
            lb[0] = "Congratulations";
            lb[1] = this.winner._name;
            lb[2] = "for winning!";
            if (this.timer <= 0) {
                for (; gameServer.nodes.all.length;) gameServer.removeNode(gameServer.nodes.all[0]);
                for (; gameServer.nodes.player.length;) gameServer.removeNode(gameServer.nodes.player[0]);
                for (; gameServer.nodes.eject.length;) gameServer.removeNode(gameServer.nodes.eject[0]);
                for (; gameServer.nodes.food.length;) gameServer.removeNode(gameServer.nodes.food[0]);
                for (; gameServer.nodes.virus.length;) gameServer.removeNode(gameServer.nodes.virus[0]);
                return this.gamePhase = 0;
            } else {
                lb[3] = "-----------------";
                lb[4] = "Game restarting in";
                lb[5] = this.timer.toString();
                this.timer--;
            }
            break;
        case 4: // Time limit reached
            gameServer.config.ejectCooldown = 1e99;
            gameServer.config.playerSpeed = 0;
            gameServer.config.playerMaxCells = 1;
            lb[0] = "Time Limit";
            lb[1] = "Reached!";
            if (this.timer <= 0) {
                for (; gameServer.nodes.all.length;) gameServer.removeNode(gameServer.nodes.all[0]);
                for (; gameServer.nodes.player.length;) gameServer.removeNode(gameServer.nodes.player[0]);
                for (; gameServer.nodes.eject.length;) gameServer.removeNode(gameServer.nodes.eject[0]);
                for (; gameServer.nodes.food.length;) gameServer.removeNode(gameServer.nodes.food[0]);
                for (; gameServer.nodes.virus.length;) gameServer.removeNode(gameServer.nodes.virus[0]);
                return this.gamePhase = 0;
            } else {
                lb[2] = "Game restarting in";
                lb[3] = this.timer.toString();
                this.timer--;
            }
        default: break;
    }
};
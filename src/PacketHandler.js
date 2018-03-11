'use strict';
const Packet = require("./packet");
const BinaryReader = require("./packet/BinaryReader");
const Entity = require("./entity");
//const Vector = require("./modules/Vec2");

function PacketHandler(gameServer, socket) {
    this.gameServer = gameServer;
    this.socket = socket;
    this.foodColor = {r: 0, g: 0, b: 0};
    this.protocol = 0;
    this.handshakeProtocol = null;
    this.handshakeKey = null;
    this.lastChatTick = 0;
    this.lastStatTick = 0;
    this.pressQ = 0;
    this.pressW = 0;
    this.pressSpace = 0;
    this.mouseData = null;
    this.handler = {
        254: this.onProtocol.bind(this)
    };
}

module.exports = PacketHandler;

PacketHandler.prototype.handleMSG = function(message) {
    if (this.handler.hasOwnProperty(message[0])) {
        this.handler[message[0]](message);
        this.socket.lastAliveTime = this.gameServer.stepDateTime;
    }
};

PacketHandler.prototype.onProtocol = function(message) {
    if (message.length === 5) {
        this.handshakeProtocol = message[1] | (message[2] << 8) | (message[3] << 16) | (message[4] << 24);
        if (this.handshakeProtocol < 1 || this.handshakeProtocol > 17)
            return this.socket.close(1002, this.handshakeProtocol + " is a non-supported protocol!");
        this.handler = {
            255: this.onKey.bind(this)
        };
    }
};

PacketHandler.prototype.onKey = function(message) {
    if (message.length === 5) {
        this.handshakeKey = message[1] | (message[2] << 8) | (message[3] << 16) | (message[4] << 24);
        if (this.handshakeProtocol > 6 && this.handshakeKey !== 0)
            return this.socket.close(1002, "This is a non-supported protocol!");
        this.onCompleted(this.handshakeProtocol, this.handshakeKey);
    }
};

PacketHandler.prototype.onCompleted = function(protocol) {
    var gameServer = this.gameServer;
    var client = this.socket.playerTracker;
    this.handler = {
        0: this.onJoin.bind(this),
        1: this.onSpectate.bind(this),
        16: this.onMouse.bind(this),
        17: this.onKeySpace.bind(this),
        18: this.onKeyQ.bind(this),
        21: this.onKeyW.bind(this),
        22: this.onKeyE.bind(this),
        23: this.onKeyR.bind(this),
        24: this.onKeyT.bind(this),
        25: this.onKeyP.bind(this),
        26: this.onKeyO.bind(this),
        27: this.onKeyM.bind(this),
        28: this.onKeyI.bind(this),
        29: this.onKeyK.bind(this),
        30: this.onKeyY.bind(this),
        31: this.onKeyU.bind(this),
        33: this.onKeyL.bind(this),
        34: this.onKeyH.bind(this),
        35: this.onKeyZ.bind(this),
        37: this.onKeyS.bind(this),
        38: this.onKeyC.bind(this),
        39: this.onKeyG.bind(this),
        40: this.onKeyJ.bind(this),
        41: this.onKeyB.bind(this),
        43: this.onKeyN.bind(this),
        99: this.onChat.bind(this),
        254: this.onStat.bind(this),
        42: this.onKeyV.bind(this)
        //36: this.onKeyX.bind(this),
    };
    this.protocol = protocol;
    this.socket.sendPacket(new Packet.ClearAll);
    this.socket.sendPacket(new Packet.SetBorder(client, gameServer.border,
    gameServer.config.serverGamemode, "MultiOgar-Edited " + gameServer.version));
    gameServer.sendChatMSG(null, client, "MultiOgar-Edited " + gameServer.version);
    gameServer.config.serverWelcome1 && gameServer.sendChatMSG(null, client, gameServer.config.serverWelcome1);
    gameServer.config.serverWelcome2 && gameServer.sendChatMSG(null, client, gameServer.config.serverWelcome2);
    gameServer.config.serverChat || gameServer.sendChatMSG(null, client, "This server's chat is disabled!");
};

PacketHandler.prototype.onJoin = function(message) {
    if (!this.socket.playerTracker.cells.length) {
        var reader = new BinaryReader(message);
        reader.skipBytes(1);
        var protocol = null;
        protocol = 6 > this.protocol ? reader.readStringZeroUnicode() : reader.readStringZeroUtf8(), this.nickName(protocol);
    }
};

PacketHandler.prototype.onSpectate = function(message) {
    var client = this.socket.playerTracker;
    if (message.length === 1 && !client.cells.length) client.spectating = 1;
};

PacketHandler.prototype.onMouse = function(message) {
    if (message.length === 13 || message.length === 9 || message.length === 21) this.mouseData = Buffer.concat([message]);
};

PacketHandler.prototype.onKeySpace = function(message) { // Split
    if (message.length === 1) this.pressSpace = 1;
};

PacketHandler.prototype.onKeyQ = function(message) { // Spectate switch, minion follow
    if (message.length === 1) {
        var client = this.socket.playerTracker;
        if (client.cells.length) client.minion.follow = !client.minion.follow;
        this.pressQ = 1;
    }
};

PacketHandler.prototype.onKeyW = function(message) { // Player eject
    if (message.length === 1) this.pressW = 1;
};

PacketHandler.prototype.onKeyE = function() { // Minion split
    this.socket.playerTracker.minion.split = 1;
};

PacketHandler.prototype.onKeyR = function() { // Minion eject
    this.socket.playerTracker.minion.eject = 1;
};

PacketHandler.prototype.onKeyT = function() { // Minion freeze
    this.socket.playerTracker.minion.frozen = !this.socket.playerTracker.minion.frozen;
};

PacketHandler.prototype.onKeyP = function() { // Minion food collection
    this.socket.playerTracker.minion.collect = !this.socket.playerTracker.minion.collect;
};

PacketHandler.prototype.onKeyO = function() { // Player freeze
    // should add cell collision with all cells?
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length)
        client.frozen = !client.frozen;
};

PacketHandler.prototype.onKeyM = function() { //  Player merge
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        if (!client.cells.length) client.mergeOverride = 0;
        else client.mergeOverride = !client.mergeOverride;
    }
};

PacketHandler.prototype.onKeyI = function() { // Player "rec" mode
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length)
        client.recMode = !client.recMode;
};

PacketHandler.prototype.onKeyK = function() { // Player suicide
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) {
        for (;client.cells.length;) {
            var cells = client.cells[0];
            this.gameServer.removeNode(cells);
        }
    }
};

PacketHandler.prototype.onKeyY = function() { // Player mass gain
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) for (var i in client.cells)
        client.cells[i].setSize(client.cells[i]._size + this.gameServer.config.playerSizeIncrement);
};

PacketHandler.prototype.onKeyU = function() { // Player mass loss
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) {
        for (var i in client.cells) {
            if (15 > client.cells[i]._size) return;
            client.cells[i].setSize(client.cells[i]._size - this.gameServer.config.playerSizeIncrement);
        }
    }
};

PacketHandler.prototype.onKeyL = function() { // Clear map nodes
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        var gameServer = this.gameServer, config = gameServer.config;
        for (;gameServer.nodes.food.length;) gameServer.removeNode(gameServer.nodes.food[0]);
        for (;gameServer.nodes.virus.length;) gameServer.removeNode(gameServer.nodes.virus[0]);
        for (;gameServer.nodes.eject.length;) gameServer.removeNode(gameServer.nodes.eject[0]);
        if (config.serverGamemode == 2)
            for (;gameServer.gameMode.nodesMother.length;) gameServer.removeNode(gameServer.gameMode.nodesMother[0]);
    }
};

PacketHandler.prototype.onKeyH = function() { // Explode
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) {
        var gameServer = this.gameServer;
        var config = gameServer.config;
        for (var i in gameServer.clients) {
            for (i = 0; i < client.cells.length; i++) {
                for (var cell = client.cells[i]; 31.63 < cell._size;) {
                    var angle = 6.28 * Math.random();
                    var loss = gameServer.config.ejectMinSize;
                    if (gameServer.config.ejectMaxSize > loss)
                        loss = Math.random() * (gameServer.config.ejectMaxSize - loss) + loss;
                    var size = cell.radius - (loss + 5) * (loss + 5);
                    cell.setSize(Math.sqrt(size));
                    var pos = {
                        x: cell.position.x + angle,
                        y: cell.position.y + angle
                    };
                    var eject = new Entity.EjectedMass(gameServer, null, pos, loss);
                    if (config.ejectRandomColor) eject.color = gameServer.randomColor();
                    else eject.color = client.color;
                    eject.setBoost(config.ejectSpeed * Math.random(), angle);
                    gameServer.addNode(eject);
                }
                cell.setSize(31.63); // 10 Mass
            }
        }
    }
};

PacketHandler.prototype.onKeyZ = function() { // Player color change
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) {
        client.color = this.gameServer.randomColor();
        client.cells.forEach(function(node) {
            node.color = client.color;
        }, this);
    }
};

PacketHandler.prototype.onKeyS = function() { // Spawn virus at mouse
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        var config = this.gameServer.config;
        var virus = new Entity.Virus(this.gameServer, null, client.mouse, config.virusMinSize);
        this.gameServer.addNode(virus);
    }
};

PacketHandler.prototype.onKeyJ = function() { // Spawn food at mouse
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        var food = new Entity.Food(this.gameServer, null, client.mouse, client.OP.foodSize);
        food.color = this.foodColor;
        this.gameServer.addNode(food);
    }
};

PacketHandler.prototype.onKeyC = function() { // Size of J key food
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        client.OP.foodSize += 10;
        if (client.OP.foodSize >= this.gameServer.config.foodBrushLimit + 1) client.OP.foodSize = 10;
    }
};

PacketHandler.prototype.onKeyB = function() { // Color of J key food
    if (this.socket.playerTracker.OP.enabled) this.foodColor = this.gameServer.randomColor();
},

PacketHandler.prototype.onKeyG = function() { // Player teleports to mouse
    var client = this.socket.playerTracker;
    if (client.OP.enabled && client.cells.length) {
        for (var i in client.cells) {
            client.cells[i].position.x = client.mouse.x;
            client.cells[i].position.y = client.mouse.y;
            this.gameServer.updateNodeQuad(client.cells[i]);
        }
    }
};

PacketHandler.prototype.onKeyN = function() {
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        for (var i = 0; i < client.cells.length; i++) {
            var cell = client.cells[i];
            var angle = Math.random() * 2 * Math.PI;
            var size = cell._size;
            var pos = {
                x: cell.position.x + size * Math.sin(angle),
                y: cell.position.y + size * Math.cos(angle)
            };
            var food = new Entity.Food(this.gameServer, null, pos, this.gameServer.config.foodMinSize);
            food.color = this.gameServer.randomColor();
            this.gameServer.addNode(food);
            food.setBoost(200 + 200 * Math.random(), angle);
        }
    }
};

PacketHandler.prototype.onKeyV = function() { // Spawn eject mass at mouse
    var client = this.socket.playerTracker;
    if (client.OP.enabled) {
        var d = client.spectating || !client.cells.length;
        for (var gs = this.gameServer, i = 0, c = client.cells[i]; i < client.cells.length; i++)
            var pos = {x: client.mouse.x - c.position.x, y: client.mouse.y - c.position.y};
        if (d) var angle = 2 * Math.PI * Math.random();
        else angle = Math.atan2(pos.x, pos.y);
        var size = gs.config.ejectMinSize;
        if (gs.config.ejectMaxSize > size) size = Math.random() * (gs.config.ejectMaxSize - size) + size;
        var eject = new Entity.EjectedMass(gs, null, client.mouse, size);
        eject.color = (d || gs.config.ejectRandomColor) ? gs.randomColor() : client.color,
        gs.addNode(eject), eject.setBoost((d ? Math.random() : 1) * gs.config.ejectSpeed, angle);
    }
};

//PacketHandler.prototype.onKeyX = function() {/*nothing*/},

PacketHandler.prototype.onChat = function(message) {
    if (message.length < 3) return;
    var tick = this.gameServer.tickCount;
    var dt = tick - this.lastChatTick;
    this.lastChatTick = tick;
    if (dt < 25) return;
    var flags = message[1];
    var rvLength = (flags & 2 ? 4 : 0) + (flags & 4 ? 8 : 0) + (flags & 8 ? 16 : 0);
    if (message.length < 3 + rvLength) return;
    var reader = new BinaryReader(message);
    reader.skipBytes(2 + rvLength);
    var text = null;
    if (this.protocol < 6) text = reader.readStringZeroUnicode();
    else text = reader.readStringZeroUtf8();
    this.gameServer.onChatMSG(this.socket.playerTracker, null, text);
};

PacketHandler.prototype.onStat = function(message) {
    if (message.length === 1) {
        var tick = this.gameServer.tickCount;
        var dt = tick - this.lastStatTick;
        this.lastStatTick = tick;
        if (dt < 30) return;
        this.socket.sendPacket(new Packet.ServerStat(this.socket.playerTracker));
    }
};

PacketHandler.prototype.mouse = function() {
    if (this.mouseData != null) {
        var reader = new BinaryReader(this.mouseData);
        reader.skipBytes(1);
        var client = this.socket.playerTracker;
        if (this.mouseData.length === 13) {
            client.mouse.x = reader.readInt32() - client.scramble.X;
            client.mouse.y = reader.readInt32() - client.scramble.Y;
        } else if (this.mouseData.length === 9) {
            client.mouse.x = reader.readInt16() - client.scramble.X;
            client.mouse.y = reader.readInt16() - client.scramble.Y;
        } else if (this.mouseData.length === 21) {
            client.mouse.x = ~~reader.readDouble() - client.scramble.X;
            client.mouse.y = ~~reader.readDouble() - client.scramble.Y;
        }
        this.mouseData = null;
    }
};

PacketHandler.prototype.process = function() {
    var client = this.socket.playerTracker;
    if (this.pressSpace) client.pressSpace(), this.pressSpace = 0;
    if (this.pressW) client.pressW(), this.pressW = 0;
    if (this.pressQ) client.pressQ(), this.pressQ = 0;
    if (client.minion.split) client.minion.split = 0;
    if (client.minion.eject) client.minion.eject = 0;
    this.mouse();
};

PacketHandler.prototype.randomSkin = function() {
    var randomSkins = [];
    var fs = require("fs");
    if (fs.existsSync("../src/randomskins.txt")) {
        randomSkins = fs.readFileSync("../src/randomskins.txt", "utf8").split(/[\r\n]+/).filter(function (x) {
            return x != '';
        });
    }
    if (randomSkins.length > 0) {
        var index = (randomSkins.length * Math.random()) >>> 0;
        var skin = randomSkins[index];
    }
    return skin;
};

PacketHandler.prototype.nickName = function(text) {
    var name = "";
    var skin = null;
    if (text != null && text.length > 0) {
        var skinName = null;
        var userName = text;
        var n = -1;
        if (text[0] == '<' && (n = text.indexOf('>', 1)) >= 1) {
            var inner = text.slice(1, n);
            if (n > 1) skinName = (inner == "r") ? this.randomSkin() : inner;
            else skinName = "";
            userName = text.slice(n + 1);
        }
        skin = skinName;
        name = userName;
    }
    if (name.length > this.gameServer.config.playerMaxNick) name = name.substring(0, this.gameServer.config.playerMaxNick);
    if (this.gameServer.checkBadWord(name) && this.gameServer.config.filterBadWords) {
        skin = null;
        name = "bad word name";
    }
    this.socket.playerTracker.joinGame(name, skin);
};
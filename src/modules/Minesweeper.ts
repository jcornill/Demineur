import ModuleGroup from '../utils/ModuleGroup';
import {AsyncModule} from "../utils/Module";
import * as SocketIO from "socket.io";
import SocketIOModule from "./SocketIO";
import Server = SocketIO.Server;
/**
 * Created by Frederic on 16/05/2017.
 */

class MinesweeperModule extends AsyncModule {

    bombs: boolean[][] = [];
    visible: number[][] = [];
    counter: {a: number, b: number}[] = [];
    io: SocketIO.Server;
    length = 1000;

    constructor(moduleGroup: ModuleGroup) {
        super(moduleGroup);
        let self = this;
        this.createWorld();
        moduleGroup.onModuleLoad('SocketIO', function (socketio: SocketIOModule) {
            self.io = socketio.server;
            let io = self.io;
            io.sockets.on('connection', function (socket: any) {
                socket.death = false;
                socket.emit('askUsername');
                socket.on('username', function(value)
                {
                    if (socket.username == undefined)
                    {
                        socket.username = value;
                        socket.emit('printText', "You join the game.");
                        socket.broadcast.emit('printText', value + " has join the game.");
                    }
                });
                socket.emit('load', { pLength: self.length});

                socket.on('finishLoad', function()
                {
                    let spawn = self.getRandomSpawnPoint(socket);
                    socket.emit('moveTo', spawn);
                });

                socket.on('disconnect', function()
                {
                    if (socket.username != undefined)
                        socket.broadcast.emit('printText', socket.username + " has leave the game.");
                });

                socket.on('clic', function(action)
                {
                    if (socket.death)
                        return;
                    self.processAction(action.x, action.y, action.button, socket);
                });

                socket.on('askInfo', function(pos)
                {
                    if (pos.x !== Math.floor(pos.x) || pos.y !== Math.floor(pos.y))
                        return undefined;
                    if (pos.x < 0 || pos.Y < 0)
                        return undefined;
                    if (pos.x < self.visible.length && pos.y < self.visible[0].length)
                        socket.emit('returnInfo', {x:pos.x, y:pos.y, v: self.visible[pos.x][pos.y] });
                });

                socket.on('askTeleport', function(pos)
                {
                    socket.emit('moveTo', pos);
                });
            });
        });
    }

    createWorld() {
        for (let i = 0; i < this.length; i++) {
            let tmp = [];
            for (let j = 0; j < this.length; j++) {
                tmp.push((Math.random() < 0.2));
            }
            this.bombs.push(tmp);
        }
        for (let i = 0; i < this.length; i++) {
            let tmp = [];
            for (let j = 0; j < this.length; j++) {
                tmp.push(-1);
            }
            this.visible.push(tmp);
        }
    }

    processAction(x, y, button, socket) {
        if (this.visible[x][y] >= 0) {
            return;
        }

        if (button === 2) {
            if (this.visible[x][y] === -2) {
                this.visible[x][y] = -1;
            } else if (this.visible[x][y] === -1) {
                this.visible[x][y] = -2;
            }
            this.io.emit('processAction', {x: x, y: y, visibility: this.visible[x][y]});
            return;
        }
        let isBomb = this.bombs[x][y];
        if (isBomb) {
            socket.emit('loose');
            socket.death = true;
            return;
        }
        let nbBomb = this.getNbBomb(x, y);
        this.visible[x][y] = nbBomb;
        if (nbBomb === 0) {
            for (let i = x - 1; i <= x + 1; i++) {
                for (let j = y - 1; j <= y + 1; j++) {
                    if (i === x && j === y) {
                        continue;
                    }
                    if (i < 0 || j < 0 || i >= this.length || j >= this.length) {
                        continue;
                    }
                    this.processAction(i, j, button, socket);
                }
            }
        }
        this.io.emit('processAction', {x: x, y: y, visibility: this.visible[x][y]});
    }

    getNbBomb(x, y) {
        let nbBomb = 0;
        for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
                if (i === x && j === y) {
                    continue;
                }
                if (i < 0 || j < 0 || i >= this.length || j >= this.length) {
                    continue;
                }
                if (this.bombs[i][j]) {
                    nbBomb++;
                }
            }
        }
        return nbBomb;
    }

    getEmptySpaceFromPoint(x, y) {
        let nbEmpty = 1;
        for (let i = 0; i < this.counter.length; i++) {
            if (this.counter[i].a === x && this.counter[i].b === y) {
                return 0;
            }
        }
        let tmp = {a: x, b: y};
        this.counter.push(tmp);
        for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
                if (this.getNbBomb(i, j) === 0) {
                    nbEmpty += this.getEmptySpaceFromPoint(i, j);
                }
            }
        }
        return nbEmpty;
    }

    getRandomSpawnPoint(socket) {
        console.log("Searching spawn point");
        while (true) {
            let r1 = Math.floor(Math.random() * (this.length - 200));
            let r2 = Math.floor(Math.random() * (this.length - 200));
            r1 += 100;
            r2 += 100;
            if (this.visible[r1][r2] === -1 && this.bombs[r1][r2] === false && this.getNbBomb(r1, r2) === 0) {
                let emp = this.getEmptySpaceFromPoint(r1, r2);
                this.counter = [];
                if (emp < 10 || emp > 15) {
                    continue;
                }
                this.processAction(r1, r2, 1, socket);
                let spawnPoint = {x: r1, y: r2};
                console.log("Found spawnPoint at " + r1 + ":" + r2);
                return spawnPoint;
            }
        }
    }
}
export default MinesweeperModule;
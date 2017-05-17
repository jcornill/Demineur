import {Serializable} from "./Serializable";
import * as fs from "fs"
/**
 * Created by Frederic on 17/05/2017.
 */

export class Region extends Serializable {
    private static size = 256;
    private mines: boolean[] = [];
    private x: number;
    private y: number;

    constructor(x: number, y: number, dat: string) {
        this.x = x;
        this.y = y;
        dat = dat.replace("\n", "");
        for (let i = 0; i < Region.size; i++) {
            let x = i * region.size;
            for (let j = 0; j < Region.size; j++) {
                this.mines.push(dat[x + j] == "x");
            }
        }
    }

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        for (let i = 0; i < Region.size; i++) {
            for (let j = 0; j < Region.size; j++) {
                this.mines.push(Math.random() < 0.2);
            }
        }
    }

    getMine(x: number, y: number): boolean {
        return this.mines[x + y * Region.size];
    }

    serialize(): string {
        let res = "";
        for (let i = 0; i < Region.size; i++) {
            let x = i * region.size;
            for (let j = 0; j < Region.size; j++) {
                res += this.mines[x + j] ? "x" : "o";
            }
            res += "\n";
        }
        return res;
    }

    static load(x: number, y: number, callback: (region: Region) => void) {
        let file = "regions/" + x + ":" + y + ".region";
        fs.stat(file, function (err) {
            if (err == null) {
                fs.readFile(file, function (err, data) {
                    if (err) {
                        callback(null);
                    } else {
                        callback(new Region(x, y, data));
                    }
                });
            } else if (err.code == 'ENOENT') {
                callback(new Region(x, y));
            } else {
                callback(null);
            }
        });
    }

    static save(region: Region, callback: (err: boolean) => void) {
        let file = "regions/" + region.x + ":" + region.y + ".region";
        fs.writeFile(file, region.serialize(), function (err) {
            callback(err != null);
        });
    }
}

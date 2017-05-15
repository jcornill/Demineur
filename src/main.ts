/// <reference path="_all.d.ts" />
/**
 * Created by Frederic Nieto on 30/06/2016.
 */
import * as fs from "fs";
import * as path from "path";
import ModuleGroup from "./utils/ModuleGroup";
import {Stats} from "fs";

declare function require(name: string): any;

var main = this;

var shared = new ModuleGroup();

loadModules(__dirname + "/modules");

function loadModules(originalPath: string) {
    fs.readdir(originalPath, function (err: Error, files: Array<string>) {
        if (err != null) {
            console.error(err);
        }else {
            files.forEach(function (path: string) {
                let newPath = originalPath + "/" + path;
                fs.lstat(newPath, function (err: Error, stat: Stats) {
                    if (err != null) {
                        console.error(err);
                    }else {
                        if (stat.isFile()) {
                            loadModule(newPath);
                        }else {
                            loadModules(newPath);
                        }
                    }
                });
            });
        }
    });
}

function loadModule(name: string) {
    let moduleName = path.parse(name).name;
    console.log("loading module: " + moduleName);
    let module: any = require(name).default;
    shared.registerModule(moduleName, new module(shared));
}
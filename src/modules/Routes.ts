/// <reference path="../_all.d.ts" />
/**
 * Created by Frederic Nieto on 30/06/2016.
 */
import * as express from "express";
import * as path from "path";
import ModuleGroup from "../utils/ModuleGroup";
import {Module} from "../utils/Module";
import ExpressModule from "./Express";
import {Request} from "express";
import {Response} from "express";

class Routes extends Module {
    constructor(moduleGroup: ModuleGroup) {
        super(moduleGroup);
        moduleGroup.onModuleLoad('Express', function (module: ExpressModule) {
            module.app.get("/", function (req: Request, res: Response) {
                res.sendFile(path.join(__dirname, '../client', 'index.html'));
            });
            module.app.use('/Assets', express.static('Assets'))
        });
    }
}
export default Routes;
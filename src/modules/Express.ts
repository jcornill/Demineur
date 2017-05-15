/// <reference path="../_all.d.ts" />
/**
 * Created by Frederic Nieto on 30/06/2016.
 */
import * as express from "express";
import {Router} from "express";
import ModuleGroup from "../utils/ModuleGroup";
import {Module} from "../utils/Module";
import {Server} from "http";

class ExpressModule extends Module {
    app: express.Application;
    server: Server;
    private routers: {[s: string]: express.Router};

    constructor(moduleGroup: ModuleGroup) {
        super(moduleGroup);
        let self = this;
        this.app = express();
        let port = /*process.env.PORT ||*/ 8080;
        this.server = this.app.listen(port, function () {
            let host: string = self.server.address().address;
            let port: number = self.server.address().port;
            console.log('Server listening at http://%s:%s', host !== "::" ? host : 'localhost', port);
        });
    }

    getRouter(name: string): Router {
        let router = this.routers[name];
        if (router != null) {
            return router;
        }
        router = this.routers[name] = express.Router();
        this.app.use(name, router);
        return router;
    }
}
export default ExpressModule;

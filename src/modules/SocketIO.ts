/// <reference path="../../typings/index.d.ts" />
/**
 * Created by Frederic Nieto on 29/07/2016.
 */
import ModuleGroup from '../utils/ModuleGroup';
import {AsyncModule} from '../utils/Module';
import * as SocketIO from 'socket.io';
import ExpressModule from './Express';
import Server = SocketIO.Server;

class SocketIOModule extends AsyncModule {
    server: Server;
    constructor(moduleGroup: ModuleGroup) {
        super(moduleGroup);
        let self = this;
        moduleGroup.onModuleLoad('Express', function (express: ExpressModule) {
            self.server = SocketIO(express.server);
            self.doLoad();
        });
    }
}
export default SocketIOModule;

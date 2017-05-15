/**
 * Created by Frederic Nieto on 30/06/2016.
 */
import ModuleGroup from "../utils/ModuleGroup";
class Module {
    protected moduleGroup: ModuleGroup;
    constructor(moduleGroup: ModuleGroup) {
        this.moduleGroup = moduleGroup;
    }
}

export default Module;
/**
 * Created by Frederic Nieto on 30/06/2016.
 */
class ModuleGroup {
    private modules: Object = {};
    private moduleLoadCallbacks: {[s: string]: Array<Function>} = {};
    constructor() {
        console.log("instanciated ModuleGroup");
    }
    /**
     *  registers the module under the name name
     * @param name
     * @param module
     * @returns {boolean} if the registration was sucessfull
     */
    registerModule(name: string, module: Object): boolean {
        let self = this;
        if (this.modules[name] != null) {
            return false;
        }
        this.modules[name] = module;
        let callbacks = this.moduleLoadCallbacks[name];
        if (callbacks != null) {
            callbacks.forEach(function (f: Function) {f(self.modules[name]); });
        }
        return true;
    }

    /**
     *  Executes the callback once the module of name name is loaded
     * @param name
     * @param callback
     */
    onModuleLoad(name: string, callback: Function) {
        let module;
        if ((module = this.modules[name]) == null) {
            if (this.moduleLoadCallbacks[name] == null) {
                this.moduleLoadCallbacks[name] = [];
            }
            this.moduleLoadCallbacks[name].push(callback);
        }else {
            callback(module);
        }
    }
}

export default ModuleGroup;
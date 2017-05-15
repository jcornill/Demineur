/**
 * Created by Frederic Nieto on 30/06/2016.
 */
import ModuleGroup from "../utils/ModuleGroup";
export class Module {
    protected moduleGroup: ModuleGroup;

    constructor(moduleGroup: ModuleGroup) {
        this.moduleGroup = moduleGroup;
    }
}

export class AsyncModule extends Module {
    private callbacks: Function[] = [];
    private didLoad: boolean = false;

    constructor(moduleGroup: ModuleGroup) {
        super(moduleGroup);
    }

    onLoad(callback: Function) {
        if (this.didLoad) {
            callback();
        } else {
            this.callbacks.push(callback);
        }
    }

    doLoad() {
        this.callbacks.forEach(function (elem: () => void) {
            elem();
        });
        this.didLoad = true;
    }
}

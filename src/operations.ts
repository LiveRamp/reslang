import { IResourceLike, IOperation } from "./treetypes"
import { options } from "yargs"

export enum Verbs {
    POST,
    MULTIPOST,
    PUT,
    MULTIPUT,
    PATCH,
    MULTIPATCH,
    GET,
    MULTIGET,
    DELETE,
    MULTIDELETE
}

// classify the operations of a resource-like structure
export class Operations {
    public get: IOperation | null
    public multiget: IOperation | null
    public post: IOperation | null
    public multipost: IOperation | null
    public put: IOperation | null
    public multiput: IOperation | null
    public patch: IOperation | null
    public multipatch: IOperation | null
    public delete: IOperation | null
    public multidelete: IOperation | null

    public constructor(el: IResourceLike) {
        this.get = this.extractOp(el, "GET")
        this.multiget = this.extractOp(el, "MULTIGET")
        this.post = this.extractOp(el, "POST")
        this.multipost = this.extractOp(el, "MULTIPOST")
        this.put = this.extractOp(el, "PUT")
        this.multiput = this.extractOp(el, "MULTIPUT")
        this.patch = this.extractOp(el, "PATCH")
        this.multipatch = this.extractOp(el, "MULTIPATCH")
        this.delete = this.extractOp(el, "DELETE")
        this.multidelete = this.extractOp(el, "MULTIDELETE")
    }

    public isIdOps() {
        return this.get || this.patch || this.put || this.delete
    }

    public isMulti() {
        return (
            this.multiget ||
            this.multipost ||
            this.multiput ||
            this.multipatch ||
            this.multidelete
        )
    }

    private extractOp(el: any, op: string): IOperation | null {
        if (el.operations) {
            for (const oper of el.operations) {
                if (oper.operation === op) {
                    return oper
                }
            }
        }
        return null
    }
}

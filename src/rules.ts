export enum LINK_OPTIONS {
    IDs
    //URNs,
    //URLs
}

export interface IRules {
    ignoreRules?: boolean
    maxResourceDepth?: number
    maxActionDepth?: number
    links?: LINK_OPTIONS
    returnBodyOnUpdate?: boolean // not implemented yet

    // rules for good API hygiene
    actionsOnRequestsOnly?: boolean
    onlyConfigToConfig?: boolean
    noSubresourcesOnActions?: boolean

    // pagination options
    pagination?: string
    limit?: number
    maxLimit?: number
}

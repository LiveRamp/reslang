export enum LINK_OPTIONS {
    IDs,
    URNs // not implemented yet
}

export enum RULES {
    ONLY_CONFIG_TO_CONFIG,
    NO_ACTION_SUBRESOURCES
}

export interface IRules {
    ignoreRules?: boolean
    maxResourceDepth?: number
    maxActionDepth?: number
    actionsOnRequestsOnly?: boolean
    links?: LINK_OPTIONS
    returnBodyOnUpdate?: boolean // not implemented yet
    checkRules?: RULES[]
}
